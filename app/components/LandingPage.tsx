import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Zap, Globe, Music, Shield, Play, Search } from 'lucide-react';
import Link from 'next/link';
import { ShinyButton } from './ui/ShinyButton';
import { BackgroundBeams } from './ui/background-beams';
import AboutSection from './AboutSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };
    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit relative overflow-hidden">
            {/* Hero Video Background (Top) */}
            <div className="absolute inset-0 h-[100vh] z-0">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover opacity-60"
                >
                    <source src="/hero-video-1.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-visio-bg" />
            </div>

            {/* Ambient Hero Glow (Overlay on video) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-visio-teal/20 rounded-full blur-[120px] pointer-events-none z-0" />

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-extrabold text-lg shadow-lg shadow-visio-teal/20">V</div>
                    <span className="font-bold text-2xl tracking-tight text-white">Visio</span>
                </div>
                <div className="hidden md:flex items-center gap-8">
                    <button onClick={() => scrollToSection('about')} className="text-sm font-medium text-white/50 hover:text-white transition-colors">About</button>
                    <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-white/50 hover:text-white transition-colors">Features</button>
                    <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-white/50 hover:text-white transition-colors">How It Works</button>
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
                            <span className="relative z-10 flex items-center gap-2">Start 7-Day Trial <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></span>
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
                    <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 opacity-70 hover:opacity-100 transition-all duration-500">
                        <div className="text-2xl font-bold text-white/80">Tony Duardo</div>
                        <div className="text-2xl font-bold tracking-tighter text-visio-teal">HGA</div>
                        <div className="text-xl font-medium tracking-wide text-white/60">+ 50 Global Agencies</div>
                    </div>
                </div>
            </div>

            {/* About Section (Video Background) */}
            <AboutSection />

            {/* Features Section */}
            <FeaturesSection />

            {/* How It Works Section */}
            <HowItWorksSection />

            {/* Pricing Section */}
            <div className="py-32 relative">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <p className="text-white/40 font-bold uppercase tracking-widest text-sm mb-4">Plans & Pricing</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 tracking-tight">Invest in your career.</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        {/* Artist Plan */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-visio-teal/50 transition-colors relative group">
                            <h3 className="text-2xl font-bold text-white mb-2">Artist</h3>
                            <div className="text-4xl font-bold text-white mb-6">R150<span className="text-lg text-white/40 font-normal">/mo</span></div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex gap-3 text-white/70"><Check size={18} className="text-visio-teal" /> 5 AI Searches / mo</li>
                                <li className="flex gap-3 text-white/70"><Check size={18} className="text-visio-teal" /> Basic Pitch Drafting</li>
                                <li className="flex gap-3 text-white/70"><Check size={18} className="text-visio-teal" /> 1 Artist Profile</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors">Start Free Trial</button>
                        </div>

                        {/* Label Plan (Featured) */}
                        <div className="p-8 rounded-3xl bg-gradient-to-b from-visio-teal/10 to-visio-bg border border-visio-teal/50 relative group shadow-2xl shadow-visio-teal/10 scale-105 z-10">
                            <div className="absolute top-0 right-0 bg-visio-teal text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">MOST POPULAR</div>
                            <h3 className="text-2xl font-bold text-white mb-2">Label</h3>
                            <div className="text-4xl font-bold text-white mb-6">R850<span className="text-lg text-white/40 font-normal">/mo</span></div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex gap-3 text-white"><Check size={18} className="text-visio-teal" /> 50 AI Searches / mo</li>
                                <li className="flex gap-3 text-white"><Check size={18} className="text-visio-teal" /> Advanced Enrichment</li>
                                <li className="flex gap-3 text-white"><Check size={18} className="text-visio-teal" /> 5 Artist Profiles</li>
                                <li className="flex gap-3 text-white"><Check size={18} className="text-visio-teal" /> Priority Support</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-visio-teal text-black font-bold hover:shadow-lg hover:shadow-visio-teal/20 transition-all">Get Started</button>
                        </div>

                        {/* Enterprise */}
                        <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors relative group">
                            <h3 className="text-2xl font-bold text-white mb-2">Agency</h3>
                            <div className="text-4xl font-bold text-white mb-6">Contact Us</div>
                            <ul className="space-y-4 mb-8">
                                <li className="flex gap-3 text-white/70"><Check size={18} className="text-purple-400" /> Unlimited Searches</li>
                                <li className="flex gap-3 text-white/70"><Check size={18} className="text-purple-400" /> API Access</li>
                                <li className="flex gap-3 text-white/70"><Check size={18} className="text-purple-400" /> Unlimited Profiles</li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-colors">Contact Sales</button>
                        </div>
                    </div>
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
