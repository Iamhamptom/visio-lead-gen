'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Zap,
    Briefcase,
    Rocket,
    Check,
    ArrowRight,
    Sparkles,
    Globe,
    BarChart3,
    Users,
    MessageCircle,
    Music,
    Cpu
} from 'lucide-react';
import { BackgroundBeams } from '../components/ui/background-beams';
import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit overflow-hidden selection:bg-visio-accent selection:text-black">

            {/* Background Effects */}
            <BackgroundBeams className="fixed inset-0 z-0 opacity-50 pointer-events-none" />
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-visio-bg/80 to-visio-bg z-0 pointer-events-none" />

            {/* Navigation */}
            <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-visio-teal to-visio-accent flex items-center justify-center text-black font-bold">V</div>
                    <span className="font-bold text-xl tracking-tight">Visio AI</span>
                </div>
                <div className="flex items-center gap-6">
                    <Link href="/login" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Log In</Link>
                    <Link
                        href="/"
                        className="bg-white text-black px-5 py-2.5 rounded-full font-medium text-sm hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        Get Started
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 pt-20 pb-32 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-visio-accent text-sm font-medium mb-4"
                    >
                        <Sparkles size={14} />
                        <span>The Future of Music PR is Here</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/50"
                    >
                        Your AI-Powered <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-visio-teal to-visio-accent">Public Relations Team</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
                    >
                        Visio automates artist research, media list building, and pitch drafting.
                        Give your music the promotion it deserves with enterprise-grade AI.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4"
                    >
                        <Link
                            href="/"
                            className="w-full md:w-auto bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2"
                        >
                            Start for Free
                            <ArrowRight size={20} />
                        </Link>
                        <button className="w-full md:w-auto px-8 py-4 rounded-full font-medium text-white/80 hover:bg-white/5 border border-white/10 transition-colors flex items-center justify-center gap-2">
                            <MessageCircle size={20} />
                            Talk to Sales
                        </button>
                    </motion.div>

                    {/* Social Proof */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="pt-12 flex flex-col items-center gap-4"
                    >
                        <p className="text-white/30 text-xs uppercase tracking-widest font-medium">Trusted by teams at</p>
                        <div className="flex items-center gap-8 md:gap-16 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                            {['Sony Music', 'Universal', 'Warner', 'Def Jam', 'Roc Nation'].map((brand) => (
                                <span key={brand} className="text-lg font-bold font-serif">{brand}</span>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="relative z-10 py-32 px-6 border-t border-white/5 bg-black/20">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Built for the Modern Music Industry</h2>
                        <p className="text-white/50 text-lg">Replaces 4 different tools with one cohesive AI platform designed specifically for entertainment PR.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={Globe}
                            title="Global Media Database"
                            description="Access 50,000+ verified contacts across blogs, playlists, and radio stations worldwide."
                        />
                        <FeatureCard
                            icon={Cpu}
                            title="AI Strategy Engine"
                            description="Get release strategies tailored to your genre, budget, and goals in seconds."
                        />
                        <FeatureCard
                            icon={MessageCircle}
                            title="Smart Pitching"
                            description="Generate hyper-personalized pitches that actually get opened and formatted for results."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section className="relative z-10 py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Choose Your Power Level</h2>
                        <p className="text-white/50 text-lg">Scalable plans for independent artists to global agencies.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Artist Plan */}
                        <PricingCard
                            tier="Artist"
                            price="Free"
                            period="forever"
                            description="Perfect for solo artists just getting started."
                            features={[
                                "1 Artist Profile",
                                "Basic Media Search",
                                "AI Pitch Drafting (Instant)",
                                "Community Support"
                            ]}
                            icon={Music}
                            color="bg-white/5"
                            btnText="Start Free"
                            highlight={false}
                        />

                        {/* Label Plan */}
                        <PricingCard
                            tier="Label"
                            price="$99"
                            period="/mo"
                            description="For boutique labels and managers."
                            features={[
                                "5 Artist Profiles",
                                "Advanced Filtering",
                                "Business AI Model",
                                "Campaign Management",
                                "Priority Support"
                            ]}
                            icon={Briefcase}
                            color="bg-blue-500/10"
                            border="border-blue-500/20"
                            btnText="Get Started"
                            highlight={false}
                        />

                        {/* Agency Plan */}
                        <PricingCard
                            tier="Agency"
                            price="$249"
                            period="/mo"
                            description="Power your entire roster with one tool."
                            features={[
                                "Unlimited Artists",
                                "Team Collaboration",
                                "Enterprise AI Model",
                                "White-label Reports",
                                "Dedicated Success Manager"
                            ]}
                            icon={Zap}
                            color="bg-visio-accent/10"
                            border="border-visio-accent/30"
                            btnText="Go Agency"
                            highlight={true}
                        />

                        {/* Enterprise Plan */}
                        <PricingCard
                            tier="Enterprise"
                            price="Custom"
                            period=""
                            description="API access and custom integrations."
                            features={[
                                "Everything in Agency",
                                "API Access",
                                "Custom Integrations",
                                "SLA & Uptime Guarantee",
                                "On-premise Options"
                            ]}
                            icon={Rocket}
                            color="bg-purple-500/10"
                            border="border-purple-500/20"
                            btnText="Contact Sales"
                            highlight={false}
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 py-32 px-6 border-t border-white/5">
                <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-visio-teal/10 to-purple-900/10 border border-white/10 rounded-3xl p-12 md:p-20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-visio-accent/10 rounded-full blur-[100px] pointer-events-none" />

                    <h2 className="text-4xl md:text-5xl font-bold mb-8 relative z-10">Ready to amplify your voice?</h2>
                    <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto relative z-10">
                        Join 10,000+ artists and managers using Visio to break through the noise.
                    </p>

                    <Link
                        href="/"
                        className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform relative z-10"
                    >
                        Start Your Campaign
                        <Rocket size={20} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-white/5 text-white/40 text-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-white font-bold text-xs">V</div>
                        <span className="font-semibold text-white/60">Visio AI</span>
                    </div>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Twitter</a>
                    </div>
                    <p>© 2026 Visio AI Inc.</p>
                </div>
            </footer>
        </div>
    );
}

// Components

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-8 hover:bg-white/10 transition-colors group">
        <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon size={24} className="text-visio-accent" />
        </div>
        <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
        <p className="text-white/50 leading-relaxed">{description}</p>
    </div>
);

const PricingCard = ({
    tier,
    price,
    period,
    description,
    features,
    icon: Icon,
    color,
    border = "border-white/10",
    btnText,
    highlight
}: {
    tier: string,
    price: string,
    period: string,
    description: string,
    features: string[],
    icon: any,
    color: string,
    border?: string,
    btnText: string,
    highlight: boolean
}) => (
    <div className={`relative flex flex-col p-8 rounded-3xl border ${border} ${color} ${highlight ? 'shadow-2xl shadow-visio-accent/10 scale-105 z-10' : ''} transition-all duration-300 hover:-translate-y-2`}>
        {highlight && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-visio-accent text-black text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                Most Popular
            </div>
        )}

        <div className="flex items-center gap-3 mb-6">
            <div className={`p-2 rounded-lg bg-black/20`}>
                <Icon size={20} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">{tier}</h3>
        </div>

        <div className="mb-6">
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">{price}</span>
                <span className="text-white/40">{period}</span>
            </div>
            <p className="text-white/50 text-sm mt-2">{description}</p>
        </div>

        <div className="flex-1 space-y-4 mb-8">
            {features.map((feature, i) => (
                <div key={i} className="flex items-start gap-3">
                    <Check size={16} className={`mt-0.5 ${highlight ? 'text-visio-accent' : 'text-white/40'}`} />
                    <span className="text-sm text-white/80">{feature}</span>
                </div>
            ))}
        </div>

        <Link
            href="/"
            className={`w-full py-3 rounded-xl font-bold text-center transition-all ${highlight
                    ? 'bg-white text-black hover:scale-105'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
        >
            {btnText}
        </Link>
    </div>
);
