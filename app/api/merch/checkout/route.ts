import { NextRequest, NextResponse } from "next/server";
import { getYocoSecretKey } from "@/lib/yoco";

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
      country = "South Africa",
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

    // Create order in DB using direct Supabase REST API (avoids admin client issues)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/merch_orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
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
        country,
      }),
    });

    if (!insertRes.ok) {
      const errBody = await insertRes.text();
      console.error("Supabase insert error:", insertRes.status, errBody);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const orders = await insertRes.json();
    const order = orders[0];

    if (!order?.id) {
      console.error("No order returned from insert");
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
      console.error("Yoco checkout error:", err);
      // Clean up the order
      await fetch(`${supabaseUrl}/rest/v1/merch_orders?id=eq.${order.id}`, {
        method: "DELETE",
        headers: {
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
        },
      });
      return NextResponse.json(
        { error: (err as any).message || "Payment gateway error" },
        { status: 500 }
      );
    }

    const checkout = await yocoRes.json();

    // Save checkout ID to order
    await fetch(`${supabaseUrl}/rest/v1/merch_orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ yoco_checkout_id: checkout.id }),
    });

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
