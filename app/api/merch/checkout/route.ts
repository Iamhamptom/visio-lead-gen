import { NextRequest, NextResponse } from "next/server";
import { getYocoSecretKey } from "@/lib/yoco";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const YOCO_API_BASE = "https://payments.yoco.com/api";

export async function POST(req: NextRequest) {
  try {
    const secretKey = getYocoSecretKey();
    if (!secretKey) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    const body = await req.json();
    const {
      item_slug,
      item_name,
      size,
      color,
      quantity = 1,
      price_cents,
      customer_name,
      customer_email,
      customer_phone,
      address_line1,
      address_line2,
      city,
      province,
      postal_code,
    } = body;

    // Validate required fields
    if (!item_slug || !item_name || !price_cents || !size || !color) {
      return NextResponse.json({ error: "Missing product details" }, { status: 400 });
    }
    if (!customer_name || !customer_email || !address_line1 || !city || !province || !postal_code) {
      return NextResponse.json({ error: "Missing shipping details" }, { status: 400 });
    }

    const totalCents = price_cents * quantity;
    if (totalCents < 100) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Create order in DB
    const supabase = getSupabaseAdmin();
    const { data: order, error: dbError } = await supabase
      .from("merch_orders")
      .insert({
        order_number: "", // trigger will generate
        item_slug,
        item_name,
        size,
        color,
        quantity,
        price_cents: totalCents,
        customer_name,
        customer_email,
        customer_phone: customer_phone || null,
        address_line1,
        address_line2: address_line2 || null,
        city,
        province,
        postal_code,
      })
      .select("id, order_number")
      .single();

    if (dbError) {
      console.error("Order creation failed:", dbError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Create Yoco checkout
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      "https://prai.visioai.co";

    const yocoRes = await fetch(`${YOCO_API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: totalCents,
        currency: "ZAR",
        successUrl: `${baseUrl}/merch/success?order=${order.id}`,
        cancelUrl: `${baseUrl}/merch/checkout?item=${item_slug}&cancelled=true`,
        failureUrl: `${baseUrl}/merch/checkout?item=${item_slug}&error=payment_failed`,
        metadata: {
          type: "merch_purchase",
          order_id: order.id,
          order_number: order.order_number,
          item_name,
          size,
          color,
          customer_email,
        },
      }),
    });

    if (!yocoRes.ok) {
      const err = await yocoRes.json().catch(() => ({ message: "Unknown error" }));
      // Clean up the order
      await supabase.from("merch_orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: (err as any).message || "Payment gateway error" },
        { status: 500 }
      );
    }

    const checkout = await yocoRes.json();

    // Save checkout ID to order
    await supabase
      .from("merch_orders")
      .update({ yoco_checkout_id: checkout.id })
      .eq("id", order.id);

    return NextResponse.json({
      success: true,
      redirectUrl: checkout.redirectUrl,
      checkoutId: checkout.id,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    console.error("Merch checkout error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
