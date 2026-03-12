import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getYocoSecretKey } from "@/lib/yoco";

const YOCO_API_BASE = "https://payments.yoco.com/api";

// GET /api/merch/orders/[id] — fetch order + verify payment status
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: order, error } = await supabase
      .from("merch_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !order) {
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
              await supabase
                .from("merch_orders")
                .update({
                  status: "paid",
                  paid_at: new Date().toISOString(),
                  yoco_payment_id: checkout.paymentId || null,
                })
                .eq("id", id);

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
