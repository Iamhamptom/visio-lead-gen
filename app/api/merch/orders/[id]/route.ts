import { NextRequest, NextResponse } from "next/server";
import { getYocoSecretKey } from "@/lib/yoco";

const YOCO_API_BASE = "https://payments.yoco.com/api";

// GET /api/merch/orders/[id] — fetch order + verify payment status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/merch_orders?id=eq.${id}&select=*`,
      {
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orders = await res.json();
    const order = orders[0];

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // If order is still pending and has a checkout ID, verify with Yoco
    if (order.status === "pending" && order.yoco_checkout_id) {
      const secretKey = getYocoSecretKey();
      if (secretKey) {
        try {
          const yocoRes = await fetch(
            `${YOCO_API_BASE}/checkouts/${order.yoco_checkout_id}`,
            {
              headers: {
                Authorization: `Bearer ${secretKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (yocoRes.ok) {
            const checkout = await yocoRes.json();
            if (checkout.status === "completed" || checkout.status === "succeeded") {
              // Mark as paid
              await fetch(`${supabaseUrl}/rest/v1/merch_orders?id=eq.${id}`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  "apikey": serviceKey,
                  "Authorization": `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({
                  status: "paid",
                  paid_at: new Date().toISOString(),
                  yoco_payment_id: checkout.paymentId || null,
                }),
              });

              order.status = "paid";
              order.paid_at = new Date().toISOString();
            }
          }
        } catch {
          // Non-fatal — just return order as-is
        }
      }
    }

    return NextResponse.json({ order });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch order";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
