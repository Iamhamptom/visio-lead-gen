import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Zap, Globe, Music, Shield, Play } from 'lucide-react';
import { ShinyButton } from './ui/ShinyButton';
import { BackgroundBeams } from './ui/background-beams';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit relative overflow-hidden">
            <BackgroundBeams className="opacity-40" />

            {/* Ambient Hero Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-visio-teal/10 rounded-full blur-[120px] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-extrabold text-lg shadow-lg shadow-visio-teal/20">V</div>
                    <span className="font-bold text-2xl tracking-tight text-white">Visio</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={onLogin} className="text-sm font-medium text-white/50 hover:text-white transition-colors tracking-wide">
                        Log In
                    </button>
                    <ShinyButton
                        text="Get Started"
                        onClick={onGetStarted}
                        className="bg-white text-black px-6 py-2.5 text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    />
                </div>
            </nav>

            {/* Hero */}
            <main className="relative z-10 pt-24 pb-32 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-visio-teal/20 bg-visio-teal/5 text-xs font-bold uppercase tracking-widest text-visio-teal mb-6 backdrop-blur-md"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-visio-teal opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-visio-teal"></span>
                        </span>
                        Public Beta Live
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.1] text-white"
                    >
                        Your AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-visio-teal via-visio-sage to-white animate-text-shimmer bg-[length:200%_auto]">Music Manager</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl md:text-2xl text-white/40 max-w-3xl mx-auto leading-relaxed font-light"
                    >
                        Visio helps artists and labels find contacts, draft pitches, and manage campaigns using an intelligent AI agent. Stop searching, start closing.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8"
                    >
                        <button
                            onClick={onGetStarted}
                            className="group relative px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.3)] overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">Start Free Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                        <button className="px-8 py-4 rounded-full font-medium text-white border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all flex items-center gap-2 backdrop-blur-sm">
                            <Play size={18} fill="currentColor" />
                            Watch Demo
                        </button>
                    </motion.div>
                </div>

                {/* Dashboard Preview */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="mt-32 max-w-6xl mx-auto relative group"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-visio-teal via-visio-sage to-visio-teal rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 will-change-transform"></div>
                    <div className="relative rounded-2xl border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-2xl overflow-hidden shadow-2xl">
                        {/* Mock UI Frame */}
                        <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                            <div className="ml-4 px-3 py-1 rounded-full bg-black/20 border border-white/5 text-[10px] text-white/30 font-mono">visio.ai/dashboard</div>
                        </div>
                        <div className="aspect-[16/9] flex items-center justify-center bg-visio-bg/50 relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-700">
                            {/* Abstract Dashboard Hint */}
                            <div className="absolute inset-x-20 top-20 bottom-0 border-x border-white/5 bg-white/[0.02]" />
                            <div className="absolute inset-y-0 left-1/3 w-px bg-white/5" />
                            <p className="relative z-10 text-white/20 font-mono text-sm tracking-[0.2em] uppercase">Interactive Dashboard</p>

                            {/* Reflection */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent pointer-events-none" />
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Trusted By Section (As requested) */}
            <div className="py-20 border-y border-white/5 bg-black/40 backdrop-blur-sm relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-sm font-bold text-white/20 uppercase tracking-[0.3em] mb-10">Trusted By Industry Leaders</p>
                    <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Text Placeholders for Logos to keep it clean but representative */}
                        <div className="text-2xl font-bold font-serif text-white/60">SONY MUSIC</div>
                        <div className="text-2xl font-bold tracking-tighter text-white/60">UNIVERSAL</div>
                        <div className="text-xl font-bold tracking-widest text-white/60">WARNER</div>
                        <div className="text-2xl font-bold italic text-white/60">ATLANTIC</div>
                    </div>
                </div>
            </div>

            {/* Features Strip */}
            <div className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureItem
                        icon={<Globe className="text-visio-teal" />}
                        title="Global Database"
                        desc="Access 10M+ contacts for playlists, blogs, labels, and influencers instantly."
                    />
                    <FeatureItem
                        icon={<Zap className="text-yellow-200" />}
                        title="AI Strategy"
                        desc="Generate personalized pitch angles and email copy in seconds."
                    />
                    <FeatureItem
                        icon={<Shield className="text-visio-sage" />}
                        title="Verified Profiles"
                        desc="Claim your artist profile and manage your EPK in one secure place."
                    />
                </div>
            </div>

            <footer className="py-12 text-center text-white/20 text-sm border-t border-white/5">
                <p>&copy; 2026 Visio Lead Gen. Built for the Culture.</p>
            </footer>
        </div>
    );
};

const FeatureItem = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="flex flex-col gap-4 p-8 rounded-3xl glass-panel hover:bg-white/[0.06] transition-colors group">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-500">
            {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 24 })}
        </div>
        <div>
            <h3 className="font-bold text-white text-xl mb-2 tracking-tight group-hover:text-visio-teal transition-colors">{title}</h3>
            <p className="text-white/50 leading-relaxed text-sm font-medium">{desc}</p>
        </div>
    </div>
);
