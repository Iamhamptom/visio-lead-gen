"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  ShoppingBag,
  Sparkles,
  Loader2,
  ImageIcon,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
  CreditCard,
} from "lucide-react";

// ━━━━━━━━━━━━━ MERCH CATALOG ━━━━━━━━━━━━━

interface MerchItem {
  slug: string;
  name: string;
  description: string;
  price: number;
  category: "apparel" | "headwear" | "outerwear";
  sizes: string[];
  colors: string[];
  imagePrompt: string;
  imageUrl: string | null;
  bestSeller?: boolean;
}

const MERCH_CATALOG: MerchItem[] = [
  {
    slug: "td-vc-tshirt-black",
    name: "Tony Duardo x VisioCorp Tee — Black",
    description:
      "Premium heavyweight cotton tee with gold Tony Duardo signature logo on front and VisioCorp emblem on the back. Streetwear meets corporate power.",
    price: 1000,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "White"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-tshirt-black.png",
  },
  {
    slug: "td-vc-tshirt-white",
    name: "Tony Duardo x VisioCorp Tee — White",
    description:
      "Clean white premium cotton tee with matte black Tony Duardo x VisioCorp branding. The understated flex.",
    price: 1000,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-tshirt-white.png",
  },
  {
    slug: "td-vc-cap-snapback",
    name: "Tony Duardo x VisioCorp Snapback",
    description:
      "Structured 6-panel snapback with 3D gold embroidered TD monogram on front. VisioCorp patch on the side. Premium wool blend.",
    price: 1200,
    category: "headwear",
    sizes: ["One Size"],
    colors: ["Black/Gold", "Navy/Gold"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-cap-snapback.png",
  },
  {
    slug: "td-vc-beanie",
    name: "Tony Duardo x VisioCorp Beanie",
    description:
      "Ribbed knit beanie with woven gold label. TD x VC logo tag on the fold. Soft merino-blend for SA winters.",
    price: 800,
    category: "headwear",
    sizes: ["One Size"],
    colors: ["Black", "Charcoal"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-beanie.png",
  },
  {
    slug: "td-vc-hoodie",
    name: "Tony Duardo x VisioCorp Hoodie",
    description:
      "400GSM oversized hoodie with puff-print Tony Duardo x VisioCorp crest on back. Kangaroo pocket, brushed fleece interior. Statement piece.",
    price: 1800,
    category: "outerwear",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Cream"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-hoodie.png",
  },
  {
    slug: "td-vc-bomber",
    name: "Tony Duardo x VisioCorp Bomber Jacket",
    description:
      "Satin bomber jacket with embroidered TD crest on left chest. VisioCorp lettering across the back in gold chain-stitch. Ribbed cuffs and collar.",
    price: 2500,
    category: "outerwear",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black/Gold", "Navy/Gold"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-bomber.png",
  },
  {
    slug: "td-vc-tracksuit",
    name: "Tony Duardo x VisioCorp Tracksuit",
    description:
      "Full zip track jacket + joggers. Gold piping, TD logo embroidered on chest. VisioCorp down the left leg. Performance-luxury hybrid.",
    price: 3500,
    category: "outerwear",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black/Gold"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-tracksuit.png",
  },
  {
    slug: "td-vc-varsity",
    name: "Tony Duardo x VisioCorp Varsity Jacket",
    description:
      "Wool body, leather sleeves. Chenille 'TD' patch on front. VisioCorp embroidered across back. The chairman's jacket.",
    price: 4500,
    category: "outerwear",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black/Gold", "Cream/Black"],
    imagePrompt: "",
    imageUrl: "/merch/td-vc-varsity.png",
  },
  // ━━━━━━━━━━━━━ PIANO 2DA WRLD! COLLECTION ━━━━━━━━━━━━━
  {
    slug: "piano2da-tee-allwhite",
    name: "PIANO 2DA WRLD! Tee — All White",
    description:
      "Premium all-white embossed tee. Tone-on-white 'PIANO 2DA WRLD!' raised lettering with embossed piano keys. LUX Apparel tag. The cleanest piece in the collection.",
    price: 1500,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["All White"],
    imagePrompt: "",
    imageUrl: "/merch/piano2da-allwhite-solo.png",
    bestSeller: true,
  },
  {
    slug: "piano2da-tee-cream",
    name: "PIANO 2DA WRLD! Tee — Cream",
    description:
      "Cream heavyweight tee with purple-to-gold gradient 'PIANO 2DA WRLD!' print. Piano keys patch on sleeve. LUX Apparel woven label. The original.",
    price: 999.99,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Cream"],
    imagePrompt: "",
    imageUrl: "/merch/piano2da-tee-cream.jpg",
    bestSeller: true,
  },
  {
    slug: "piano2da-tee-black",
    name: "PIANO 2DA WRLD! Tee — Black",
    description:
      "Black heavyweight tee with gold 'PIANO 2DA WRLD!' print and piano keys graphic. LUX Apparel tag. Amapiano energy, global statement.",
    price: 999.99,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black"],
    imagePrompt: "",
    imageUrl: "/merch/piano2da-stacked.jpg",
    bestSeller: true,
  },
  {
    slug: "piano2da-tee-white",
    name: "PIANO 2DA WRLD! Tee — White",
    description:
      "White tee with purple-to-gold gradient 'PIANO 2DA WRLD!' print. Piano keys patch on sleeve. LUX Apparel woven label. The daytime flex.",
    price: 999.99,
    category: "apparel",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White"],
    imagePrompt: "",
    imageUrl: "/merch/piano2da-grid-4up.jpg",
    bestSeller: true,
  },
];

// ━━━━━━━━━━━━━ HELPERS ━━━━━━━━━━━━━

function formatPrice(amount: number): string {
  if (amount % 1 === 0) return `R${amount.toLocaleString("en-ZA")}.00`;
  return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  apparel: { label: "Apparel", color: "#608A94" },
  headwear: { label: "Headwear", color: "#B6F09C" },
  outerwear: { label: "Outerwear", color: "#D4A847" },
};

// ━━━━━━━━━━━━━ MERCH CARD ━━━━━━━━━━━━━

function MerchCard({
  item,
  onGenerate,
  generating,
  onBuy,
  buying,
}: {
  item: MerchItem;
  onGenerate: (slug: string) => void;
  generating: string | null;
  onBuy: (slug: string) => void;
  buying: string | null;
}) {
  const catCfg = CATEGORY_CONFIG[item.category];
  const isGenerating = generating === item.slug;
  const isBuying = buying === item.slug;

  return (
    <div className="group rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      {/* Image area */}
      <div className="relative aspect-square bg-gradient-to-br from-[#111] to-[#0a0a0a] flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <ImageIcon size={48} />
            <button
              onClick={() => onGenerate(item.slug)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/60 text-sm font-medium transition-all duration-300 hover:border-visio-teal/50 hover:text-white hover:bg-white/[0.05] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate with Nano Banana
                </>
              )}
            </button>
          </div>
        )}
        {item.imageUrl && (
          <button
            onClick={() => onGenerate(item.slug)}
            disabled={isGenerating}
            className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 transition-all hover:bg-black/80 hover:text-white opacity-0 group-hover:opacity-100"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
          </button>
        )}
        {/* Category pill */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm border"
          style={{
            color: catCfg.color,
            borderColor: `${catCfg.color}33`,
            backgroundColor: `${catCfg.color}15`,
          }}
        >
          {catCfg.label}
        </div>
        {item.bestSeller && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/90 text-white shadow-[0_0_12px_rgba(239,68,68,0.4)]">
            Best Seller
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <h3 className="text-sm font-bold text-white leading-tight">
          {item.name}
        </h3>
        <p className="text-xs text-white/50 line-clamp-2">{item.description}</p>

        {/* Sizes */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.sizes.map((size) => (
            <span
              key={size}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-white/50 border border-white/[0.06]"
            >
              {size}
            </span>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-2">
          {item.colors.map((color) => (
            <span key={color} className="text-[11px] text-white/40">
              {color}
            </span>
          ))}
        </div>

        {/* Price + Buy */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          <span
            className="text-xl font-bold"
            style={{ color: "#D4A847" }}
          >
            {formatPrice(item.price)}
          </span>
          <button
            onClick={() => onBuy(item.slug)}
            disabled={isBuying}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D4A847] text-black text-xs font-bold uppercase tracking-wider transition-all hover:brightness-110 hover:shadow-[0_0_16px_rgba(212,168,71,0.4)] disabled:opacity-50"
          >
            {isBuying ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CreditCard size={12} />
            )}
            {isBuying ? "Loading..." : "Buy Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━ MAIN PAGE ━━━━━━━━━━━━━

export default function MerchPage() {
  const [items, setItems] = useState<MerchItem[]>(MERCH_CATALOG);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);


  const filtered =
    categoryFilter === "all"
      ? items
      : items.filter((i) => i.category === categoryFilter);

  const handleGenerate = useCallback(
    async (slug: string) => {
      const item = items.find((i) => i.slug === slug);
      if (!item) return;

      setGenerating(slug);
      setError(null);
      try {
        const res = await fetch("/api/merch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: item.imagePrompt,
            item_slug: slug,
          }),
        });

        const data = await res.json();
        if (res.ok && data.image_data) {
          setItems((prev) =>
            prev.map((i) =>
              i.slug === slug ? { ...i, imageUrl: data.image_data } : i
            )
          );
        } else {
          setError(data.error || "Generation failed");
        }
      } catch {
        setError("Network error — try again");
      } finally {
        setGenerating(null);
      }
    },
    [items]
  );

  const handleBuy = useCallback(
    (slug: string) => {
      setBuying(slug);
      window.location.href = `/merch/checkout?item=${slug}`;
    },
    []
  );

  const handleGenerateAll = useCallback(async () => {
    setGeneratingAll(true);
    for (const item of items) {
      if (!item.imageUrl) {
        await handleGenerate(item.slug);
      }
    }
    setGeneratingAll(false);
  }, [items, handleGenerate]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-outfit">
      {/* Nav bar */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">Back to V-PRAI</span>
            </Link>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center gap-2">
              <Crown size={20} className="text-[#D4A847]" />
              <span className="font-bold text-lg tracking-tight">
                Merch Store
              </span>
            </div>
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll || generating !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-visio-teal to-visio-sage text-black font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(96,138,148,0.3)] hover:brightness-110 disabled:opacity-50"
          >
            {generatingAll ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating All...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate All Images
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Hero banner */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4A847]/10 via-transparent to-visio-teal/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,168,71,0.08),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D4A847] to-[#8B6914] p-[2px] shadow-[0_0_40px_rgba(212,168,71,0.3)]">
              <div className="w-full h-full rounded-[14px] bg-[#111] flex items-center justify-center">
                <span className="text-3xl font-black text-white">TD</span>
              </div>
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
                Tony Duardo{" "}
                <span className="text-[#D4A847]">x</span> VisioCorp
              </h1>
              <p className="text-white/50 text-lg mt-2 max-w-xl">
                Exclusive collaboration — limited edition merch. From the studio
                to the boardroom.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#D4A847]/15 text-[#D4A847] border border-[#D4A847]/25">
                  Limited Edition
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-white/[0.06] text-white/60 border border-white/[0.08]">
                  Starting from R800
                </span>
                <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-visio-teal/15 text-visio-teal border border-visio-teal/25">
                  12 Items
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Items", value: `${items.length}`, color: "#fff" },
            {
              label: "Price Range",
              value: "R999 — R4,500",
              color: "#D4A847",
            },
            {
              label: "Apparel",
              value: `${items.filter((i) => i.category === "apparel").length}`,
              color: "#608A94",
            },
            {
              label: "Outerwear",
              value: `${items.filter((i) => i.category === "outerwear").length}`,
              color: "#D4A847",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-center"
            >
              <p
                className="text-2xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </p>
              <p className="text-[11px] text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Error toast */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400/70 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex gap-2">
          {["all", "apparel", "headwear", "outerwear"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 capitalize ${
                categoryFilter === cat
                  ? "bg-gradient-to-r from-visio-teal to-visio-sage text-black"
                  : "bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {cat === "all" ? "All Items" : cat}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((item) => (
            <MerchCard
              key={item.slug}
              item={item}
              onGenerate={handleGenerate}
              generating={generating}
              onBuy={handleBuy}
              buying={buying}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-white/30">
            All images generated by Nano Banana 2 AI. Prices in South African
            Rand (ZAR). Merch produced on-demand.
          </p>
          <p className="text-[10px] text-white/20 mt-2">
            Tony Duardo x VisioCorp &copy; {new Date().getFullYear()}. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
