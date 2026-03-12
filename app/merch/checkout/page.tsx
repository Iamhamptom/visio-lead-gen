"use client";

import React, { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  CreditCard,
  Loader2,
  Shield,
  Crown,
  Check,
} from "lucide-react";

// ━━━━━ CATALOG (shared with main merch page) ━━━━━
interface MerchItem {
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  sizes: string[];
  colors: string[];
  imageUrl: string | null;
  bestSeller?: boolean;
}

const MERCH_CATALOG: MerchItem[] = [
  { slug: "td-vc-tshirt-black", name: "Tony Duardo x VisioCorp Tee — Black", description: "Premium heavyweight cotton tee with gold Tony Duardo signature logo.", price: 1000, category: "apparel", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Black", "White"], imageUrl: "/merch/td-vc-tshirt-black.png" },
  { slug: "td-vc-tshirt-white", name: "Tony Duardo x VisioCorp Tee — White", description: "Clean white premium cotton tee with matte black branding.", price: 1000, category: "apparel", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["White"], imageUrl: "/merch/td-vc-tshirt-white.png" },
  { slug: "td-vc-cap-snapback", name: "Tony Duardo x VisioCorp Snapback", description: "Structured 6-panel snapback with 3D gold embroidered TD monogram.", price: 1200, category: "headwear", sizes: ["One Size"], colors: ["Black/Gold", "Navy/Gold"], imageUrl: "/merch/td-vc-cap-snapback.png" },
  { slug: "td-vc-beanie", name: "Tony Duardo x VisioCorp Beanie", description: "Ribbed knit beanie with woven gold label.", price: 800, category: "headwear", sizes: ["One Size"], colors: ["Black", "Charcoal"], imageUrl: "/merch/td-vc-beanie.png" },
  { slug: "td-vc-hoodie", name: "Tony Duardo x VisioCorp Hoodie", description: "400GSM oversized hoodie with puff-print crest on back.", price: 1800, category: "outerwear", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Black", "Cream"], imageUrl: "/merch/td-vc-hoodie.png" },
  { slug: "td-vc-bomber", name: "Tony Duardo x VisioCorp Bomber Jacket", description: "Satin bomber with embroidered TD crest and gold chain-stitch.", price: 2500, category: "outerwear", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Black/Gold", "Navy/Gold"], imageUrl: "/merch/td-vc-bomber.png" },
  { slug: "td-vc-tracksuit", name: "Tony Duardo x VisioCorp Tracksuit", description: "Full zip track jacket + joggers with gold piping.", price: 3500, category: "outerwear", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Black/Gold"], imageUrl: "/merch/td-vc-tracksuit.png" },
  { slug: "td-vc-varsity", name: "Tony Duardo x VisioCorp Varsity Jacket", description: "Wool body, leather sleeves. The chairman's jacket.", price: 4500, category: "outerwear", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Black/Gold", "Cream/Black"], imageUrl: "/merch/td-vc-varsity.png" },
  { slug: "piano2da-tee-allwhite", name: "PIANO 2DA WRLD! Tee — All White", description: "Premium all-white embossed tee with raised lettering and piano keys. LUX Apparel.", price: 1500, category: "apparel", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["All White"], imageUrl: "/merch/piano2da-allwhite-solo.png", bestSeller: true },
  { slug: "piano2da-tee-cream", name: "PIANO 2DA WRLD! Tee — Cream", description: "Cream heavyweight tee with gradient print. LUX Apparel.", price: 999.99, category: "apparel", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Cream"], imageUrl: "/merch/piano2da-tee-cream.jpg", bestSeller: true },
  { slug: "piano2da-tee-black", name: "PIANO 2DA WRLD! Tee — Black", description: "Black heavyweight tee with gold print and piano keys.", price: 999.99, category: "apparel", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["Black"], imageUrl: "/merch/piano2da-stacked.jpg", bestSeller: true },
  { slug: "piano2da-tee-white", name: "PIANO 2DA WRLD! Tee — White", description: "White tee with gradient print. LUX Apparel.", price: 999.99, category: "apparel", sizes: ["S", "M", "L", "XL", "XXL"], colors: ["White"], imageUrl: "/merch/piano2da-grid-4up.jpg", bestSeller: true },
];

const COUNTRIES = [
  "South Africa",
  "Nigeria",
  "Kenya",
  "Ghana",
  "Tanzania",
  "Uganda",
  "Ethiopia",
  "Botswana",
  "Namibia",
  "Mozambique",
  "Zimbabwe",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Netherlands",
  "Brazil",
  "Japan",
  "United Arab Emirates",
  "Saudi Arabia",
  "India",
  "Other",
];

const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

function formatPrice(amount: number): string {
  if (amount % 1 === 0) return `R${amount.toLocaleString("en-ZA")}.00`;
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ━━━━━ CHECKOUT FORM ━━━━━
function CheckoutForm() {
  const searchParams = useSearchParams();
  const itemSlug = searchParams.get("item") || "";
  const cancelled = searchParams.get("cancelled");
  const payError = searchParams.get("error");

  const item = useMemo(() => MERCH_CATALOG.find((i) => i.slug === itemSlug), [itemSlug]);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Customer info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Address
  const [country, setCountry] = useState("South Africa");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    cancelled ? "Payment was cancelled. You can try again." :
    payError ? "Payment failed. Please try again." : null
  );

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-outfit flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 text-white/30" />
          <h2 className="text-xl font-bold mb-2">Item not found</h2>
          <Link href="/merch" className="text-visio-teal hover:underline text-sm">
            Back to Merch Store
          </Link>
        </div>
      </div>
    );
  }

  const totalPrice = item.price * quantity;
  const totalCents = Math.round(totalPrice * 100);

  const canProceedStep1 = selectedSize && selectedColor;
  const canProceedStep2 = name && email && address1 && city && province && postalCode;

  const handleCheckout = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/merch/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_slug: item.slug,
          item_name: item.name,
          size: selectedSize,
          color: selectedColor,
          quantity,
          price_cents: totalCents,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          address_line1: address1,
          address_line2: address2,
          city,
          province,
          postal_code: postalCode,
          country,
        }),
      });

      const data = await res.json();
      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        setError(data.error || "Checkout failed. Please try again.");
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-outfit">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/merch" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm">Back to Store</span>
          </Link>
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-[#D4A847]" />
            <span className="font-bold text-sm">Checkout</span>
          </div>
        </div>
      </nav>

      {/* Progress steps */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-center gap-0">
          {[
            { num: 1, label: "Product" },
            { num: 2, label: "Shipping" },
            { num: 3, label: "Review & Pay" },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              {i > 0 && (
                <div className={`w-12 sm:w-20 h-px ${step >= s.num ? "bg-[#D4A847]" : "bg-white/10"}`} />
              )}
              <button
                onClick={() => {
                  if (s.num === 1) setStep(1);
                  if (s.num === 2 && canProceedStep1) setStep(2);
                  if (s.num === 3 && canProceedStep1 && canProceedStep2) setStep(3);
                }}
                className="flex items-center gap-2"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step >= s.num
                      ? "bg-[#D4A847] text-black"
                      : "bg-white/[0.08] text-white/40"
                  }`}
                >
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span className={`text-xs hidden sm:block ${step >= s.num ? "text-white" : "text-white/40"}`}>
                  {s.label}
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400/70 hover:text-red-400 ml-4">
              &times;
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Step 1: Product selection */}
            {step === 1 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <ShoppingBag size={20} className="text-[#D4A847]" />
                  <h2 className="text-lg font-bold">Select Options</h2>
                </div>

                {/* Size */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Size</label>
                  <div className="flex flex-wrap gap-2">
                    {item.sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          selectedSize === size
                            ? "bg-[#D4A847] text-black"
                            : "bg-white/[0.06] text-white/60 border border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {item.colors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          selectedColor === color
                            ? "bg-[#D4A847] text-black"
                            : "bg-white/[0.06] text-white/60 border border-white/[0.08] hover:border-white/20"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/[0.1] flex items-center justify-center text-lg font-bold"
                    >
                      −
                    </button>
                    <span className="text-xl font-bold w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="w-10 h-10 rounded-lg bg-white/[0.06] text-white/60 hover:bg-white/[0.1] flex items-center justify-center text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="w-full py-3 rounded-xl bg-[#D4A847] text-black font-bold text-sm transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Continue to Shipping
                </button>
              </div>
            )}

            {/* Step 2: Shipping */}
            {step === 2 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <Truck size={20} className="text-[#D4A847]" />
                  <h2 className="text-lg font-bold">Shipping Details</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/50 mb-1 block">Full Name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nkululeko Nciza"
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Phone (optional)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+27 XX XXX XXXX"
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/50 mb-1 block">Address Line 1 *</label>
                    <input
                      type="text"
                      value={address1}
                      onChange={(e) => setAddress1(e.target.value)}
                      placeholder="Street address"
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/50 mb-1 block">Address Line 2 (Apt, Unit, etc.)</label>
                    <input
                      type="text"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      placeholder="Apartment, suite, unit (optional)"
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Johannesburg"
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">
                      {country === "South Africa" ? "Province" : "State / Province / Region"} *
                    </label>
                    {country === "South Africa" ? (
                      <select
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors appearance-none"
                      >
                        <option value="" className="bg-[#1a1a1a]">Select province</option>
                        {SA_PROVINCES.map((p) => (
                          <option key={p} value={p} className="bg-[#1a1a1a]">{p}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={province}
                        onChange={(e) => setProvince(e.target.value)}
                        placeholder="e.g. California, London, Lagos"
                        className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-white/50 mb-1 block">Postal Code *</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="e.g. 2000"
                      maxLength={10}
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white placeholder:text-white/30 text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors autofill:shadow-[inset_0_0_0px_1000px_rgba(255,255,255,0.06)] autofill:[-webkit-text-fill-color:white]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-white/50 mb-1 block">Country *</label>
                    <select
                      value={country}
                      onChange={(e) => { setCountry(e.target.value); setProvince(""); }}
                      className="w-full px-4 py-3 rounded-lg bg-white/[0.06] border border-white/[0.08] text-white text-sm focus:border-[#D4A847]/50 focus:outline-none transition-colors appearance-none"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 rounded-xl bg-white/[0.06] text-white/60 font-medium text-sm hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="flex-1 py-3 rounded-xl bg-[#D4A847] text-black font-bold text-sm transition-all hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Pay */}
            {step === 3 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <CreditCard size={20} className="text-[#D4A847]" />
                  <h2 className="text-lg font-bold">Review & Pay</h2>
                </div>

                {/* Order summary */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.name}</p>
                      <p className="text-xs text-white/50">Size: {selectedSize} &middot; Color: {selectedColor} &middot; Qty: {quantity}</p>
                    </div>
                    <p className="text-lg font-bold text-[#D4A847]">{formatPrice(totalPrice)}</p>
                  </div>

                  {/* Shipping info */}
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.06] space-y-1">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Ships to</p>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-xs text-white/60">{address1}{address2 ? `, ${address2}` : ""}</p>
                    <p className="text-xs text-white/60">{city}, {province} {postalCode}</p>
                    <p className="text-xs text-white/60">{country}</p>
                    <p className="text-xs text-white/60">{email}{phone ? ` · ${phone}` : ""}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 rounded-xl bg-white/[0.06] text-white/60 font-medium text-sm hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#D4A847] to-[#B8922E] text-black font-bold text-sm transition-all hover:brightness-110 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Connecting to Yoco...
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} />
                        Pay {formatPrice(totalPrice)} with Yoco
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 text-white/30 text-[10px] uppercase tracking-wider pt-2">
                  <Shield size={12} />
                  Secured by Yoco &middot; 256-bit SSL encryption
                </div>
              </div>
            )}
          </div>

          {/* Right: Order summary sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              {/* Product image */}
              {item.imageUrl && (
                <div className="aspect-square bg-[#111] relative">
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  {item.bestSeller && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/90 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]">
                      Best Seller
                    </div>
                  )}
                </div>
              )}

              <div className="p-5 space-y-4">
                <h3 className="font-bold text-sm">{item.name}</h3>
                <p className="text-xs text-white/50">{item.description}</p>

                {/* Selected options */}
                {(selectedSize || selectedColor) && (
                  <div className="flex flex-wrap gap-2">
                    {selectedSize && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[#D4A847]/15 text-[#D4A847] border border-[#D4A847]/25">
                        Size: {selectedSize}
                      </span>
                    )}
                    {selectedColor && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/[0.08] text-white/60 border border-white/[0.08]">
                        {selectedColor}
                      </span>
                    )}
                    {quantity > 1 && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-white/[0.08] text-white/60 border border-white/[0.08]">
                        Qty: {quantity}
                      </span>
                    )}
                  </div>
                )}

                {/* Price breakdown */}
                <div className="border-t border-white/[0.06] pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Subtotal</span>
                    <span>{formatPrice(item.price)} {quantity > 1 ? `× ${quantity}` : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Shipping</span>
                    <span className="text-green-400">Free</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/[0.06]">
                    <span>Total</span>
                    <span className="text-[#D4A847]">{formatPrice(totalPrice)}</span>
                  </div>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {[
                    { icon: Shield, label: "Secure Payment" },
                    { icon: Truck, label: "Worldwide Shipping" },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <Icon size={12} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MerchCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white font-outfit flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
