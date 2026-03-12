"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  Truck,
  Mail,
  Loader2,
  Package,
} from "lucide-react";

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  item_name: string;
  size: string;
  color: string;
  quantity: number;
  price_cents: number;
  customer_name: string;
  customer_email: string;
  city: string;
  province: string;
}

function formatPrice(cents: number): string {
  const rands = cents / 100;
  return `R${rands.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`/api/merch/orders/${orderId}`);
        const data = await res.json();
        if (res.ok && data.order) {
          setOrder(data.order);
        }
      } catch {
        // Non-fatal
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "/merch";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-outfit flex items-center justify-center">
        <Loader2 className="animate-spin text-[#D4A847]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-outfit flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        {/* Success icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
            <CheckCircle size={48} className="text-white" />
          </div>
        </div>

        <Sparkles size={24} className="text-[#D4A847] mx-auto mb-4" />

        <h1 className="text-3xl font-bold mb-2">Order Confirmed!</h1>
        {order && (
          <p className="text-[#D4A847] font-mono text-sm mb-1">
            Order #{order.order_number}
          </p>
        )}
        <p className="text-white/50 mb-8 leading-relaxed">
          Thank you for your purchase! Your order has been confirmed and we&apos;ll
          start preparing it right away.
        </p>

        {/* Order details */}
        {order && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-8 text-left space-y-4">
            {/* Item */}
            <div className="flex items-start gap-3">
              <Package size={18} className="text-[#D4A847] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">{order.item_name}</p>
                <p className="text-xs text-white/50">
                  Size: {order.size} &middot; Color: {order.color}
                  {order.quantity > 1 ? ` · Qty: ${order.quantity}` : ""}
                </p>
                <p className="text-sm font-bold text-[#D4A847] mt-1">
                  {formatPrice(order.price_cents)}
                </p>
              </div>
            </div>

            <div className="border-t border-white/[0.06]" />

            {/* Shipping */}
            <div className="flex items-start gap-3">
              <Truck size={18} className="text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Ships to</p>
                <p className="text-sm">{order.customer_name}</p>
                <p className="text-xs text-white/50">{order.city}, {order.province}</p>
              </div>
            </div>

            {/* Email confirmation */}
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-visio-teal shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Confirmation sent to</p>
                <p className="text-sm">{order.customer_email}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-xs text-white/60">
                Status: <span className="text-green-400 font-semibold capitalize">{order.status}</span>
                {" "}&middot; Estimated delivery: 3–5 business days
              </p>
            </div>
          </div>
        )}

        {!order && (
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-8 text-left space-y-3">
            <div className="flex items-center gap-3 text-white/70">
              <CheckCircle size={16} className="text-green-400 shrink-0" />
              Payment processed via Yoco
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <ShoppingBag size={16} className="text-[#D4A847] shrink-0" />
              Order confirmation will be sent via email
            </div>
            <div className="flex items-center gap-3 text-white/70">
              <Truck size={16} className="text-visio-teal shrink-0" />
              Shipping within 3–5 business days
            </div>
          </div>
        )}

        <Link
          href="/merch"
          className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform"
        >
          <ArrowLeft size={18} />
          Continue Shopping
        </Link>

        <p className="text-white/30 text-sm mt-6">
          Returning to store in {countdown}s...
        </p>
      </div>
    </div>
  );
}

export default function MerchSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white font-outfit flex items-center justify-center">
          <Loader2 className="animate-spin text-[#D4A847]" size={32} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
