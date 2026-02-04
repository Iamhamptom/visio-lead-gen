'use client';

import React from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    Globe,
    Target,
    Zap,
    Users,
    BarChart3,
    Shield,
    Rocket,
    Music,
    Radio,
    Mic2,
    Building2,
    Sparkles,
    CheckCircle2
} from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to App</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-bold">V</div>
                        <span className="font-outfit text-lg font-medium tracking-tight">Visio<span className="opacity-50">AI</span></span>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-visio-teal/5 via-transparent to-transparent" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-visio-teal/10 border border-visio-teal/20 text-visio-teal text-sm font-medium mb-8">
                        <Sparkles size={16} />
                        AI-Powered PR Engine
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                        Turn Your Music Into<br />
                        <span className="bg-gradient-to-r from-visio-teal to-visio-sage bg-clip-text text-transparent">Global Reach</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
                        Visio AI PR Assistant helps artists plan PR campaigns, generate targeted industry contact lists,
                        and run outreach—so they can scale globally beyond their borders.
                    </p>
                </div>
            </section>

            {/* Overview */}
            <section className="py-20 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">What is Visio AI?</h2>
                            <p className="text-white/70 leading-relaxed mb-6">
                                <strong className="text-white">Visio AI PR Assistant</strong> is an AI-powered PR + lead generation + outreach engine
                                built specifically for the entertainment industry. It helps artists, labels, managers, and entertainment brands
                                find the right media, creators, DJs, and promoters—fast, repeatably, and at global scale.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-visio-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Music size={16} className="text-visio-teal" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Artist Portal</p>
                                        <p className="text-white/50 text-sm">Deep profile + brand voice + assets</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-visio-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Globe size={16} className="text-visio-teal" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Global Contact Universe</p>
                                        <p className="text-white/50 text-sm">Media, DJs, dancers, clubs, promoters, creators, curators</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-visio-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Rocket size={16} className="text-visio-teal" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">AI Campaign Engine</p>
                                        <p className="text-white/50 text-sm">Plans campaigns, builds lead lists, launches outreach</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-4 text-visio-teal">Our Mission</h3>
                            <p className="text-white/70 leading-relaxed">
                                Enable artists to <strong className="text-white">scale globally beyond their borders</strong>,
                                by connecting them to the full industry ecosystem—country by country, city by city.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Problem */}
            <section className="py-20 bg-red-500/5 border-y border-red-500/10">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">The Problem We Solve</h2>
                    <p className="text-white/60 mb-12">Entertainment marketing is broken by:</p>
                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        {[
                            { title: "Scattered Contacts", desc: "Lists live everywhere; most are outdated" },
                            { title: "Slow Research", desc: "Finding 100–500 relevant contacts takes days/weeks" },
                            { title: "No Targeting Intelligence", desc: "Genre-fit, audience-fit, location-fit missing" },
                            { title: "Poor Outreach Execution", desc: "Weak messaging, no follow-up, no tracking" },
                        ].map((item, i) => (
                            <div key={i} className="bg-black/40 border border-white/10 rounded-xl p-5">
                                <p className="font-semibold text-red-400 mb-1">{item.title}</p>
                                <p className="text-white/50 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-white/40 text-sm mt-8 italic">
                        Result: great music loses because distribution + attention is hard to engineer.
                    </p>
                </div>
            </section>

            {/* What We Provide */}
            <section className="py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-4 text-center">What We Provide</h2>
                    <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
                        A single system that turns: Artist identity + campaign goal → curated target lists → outreach → results tracking
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Globe, title: "Export Value", desc: "Global reach infrastructure to target markets by country, city, platform, and niche" },
                            { icon: Users, title: "Artist Portal", desc: "Structured profile: bio, assets, brand voice, campaign goals, and policies" },
                            { icon: Target, title: "PR Assistant", desc: "AI builds campaign strategy, target lists, messaging, and tracking" },
                            { icon: Radio, title: "Global Databases", desc: "Media, DJs, dancers, creators, clubs, promoters, producers—worldwide" },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-visio-teal/30 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-visio-teal/10 flex items-center justify-center mb-4">
                                    <item.icon size={24} className="text-visio-teal" />
                                </div>
                                <h3 className="font-bold mb-2">{item.title}</h3>
                                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Who We Serve */}
            <section className="py-20 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <h2 className="text-3xl font-bold mb-12 text-center">Who We Serve</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="bg-gradient-to-br from-visio-teal/10 to-transparent border border-visio-teal/20 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Mic2 size={28} className="text-visio-teal" />
                                <h3 className="text-xl font-bold">Creators</h3>
                            </div>
                            <ul className="space-y-3 text-white/70">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-visio-teal" /> Independent artists</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-visio-teal" /> Producers & DJs</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-visio-teal" /> Managers and artist teams</li>
                            </ul>
                        </div>
                        <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-2xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Building2 size={28} className="text-white/70" />
                                <h3 className="text-xl font-bold">Industry</h3>
                            </div>
                            <ul className="space-y-3 text-white/70">
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-white/40" /> Labels and distributors</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-white/40" /> PR & marketing agencies</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-white/40" /> Venue groups and promoters</li>
                                <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-white/40" /> Entertainment brands</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Ethics & Compliance */}
            <section className="py-20 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <Shield size={40} className="text-visio-teal mx-auto mb-6" />
                    <h2 className="text-3xl font-bold mb-6">Data, Ethics & Compliance</h2>
                    <p className="text-white/60 mb-8">Visio is built to be powerful without being creepy:</p>
                    <div className="grid md:grid-cols-2 gap-4 text-left">
                        {[
                            "Public, professional, industry-relevant data only",
                            "Respect platform rules and privacy laws",
                            "Opt-in outreach where possible",
                            "Unsubscribe handling for email campaigns",
                            "Suppression lists (do-not-contact)",
                            "Audit trails for data collection",
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                                <CheckCircle2 size={16} className="text-visio-teal flex-shrink-0" />
                                <span className="text-white/70 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Ready to Scale Your Reach?</h2>
                    <p className="text-white/60 mb-8">
                        Join artists who are using Visio AI to break into new markets and grow their audience globally.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-visio-teal text-black px-8 py-4 rounded-xl font-bold hover:bg-visio-teal/90 transition-all hover:scale-105"
                    >
                        Get Started Free
                        <Rocket size={18} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/30 text-sm">© 2026 Visio AI. All rights reserved.</p>
                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <Link href="/features" className="hover:text-white transition-colors">Features</Link>
                        <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
                        <a href="mailto:admin@visiocorp.co" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
