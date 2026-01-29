import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Mail, Lock, Github } from 'lucide-react';
import { BackgroundBeams } from './ui/background-beams';

interface AuthPageProps {
    onComplete: () => void;
    initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onComplete, initialMode = 'signup' }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate auth delay
        setTimeout(() => {
            setIsLoading(false);
            onComplete();
        }, 1500);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center text-white font-outfit relative overflow-hidden p-6">
            {/* Ambient Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-visio-teal/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-visio-accent/10 rounded-full blur-[128px] pointer-events-none" />

            <div
                className="relative z-10 w-full max-w-[420px] glass-panel rounded-3xl p-10 shadow-2xl"
            >
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-visio-teal to-visio-sage text-black font-extrabold text-2xl mb-6 shadow-[0_0_20px_rgba(45,212,191,0.3)]">V</div>
                    <h1 className="text-3xl font-bold mb-3 tracking-tight text-white text-glow">
                        {mode === 'signup' ? 'Join Visio' : 'Welcome Back'}
                    </h1>
                    <p className="text-white/40 text-sm font-medium tracking-wide">
                        {mode === 'signup'
                            ? 'The future of music management is here.'
                            : 'Access your AI command center.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-visio-teal uppercase tracking-[0.2em] ml-1">Email Access</label>
                        <div className="relative group">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-visio-teal transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="artist@label.com"
                                className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:border-visio-teal/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-visio-teal/50 text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-visio-teal uppercase tracking-[0.2em] ml-1">Secure Pass</label>
                        <div className="relative group">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-visio-teal transition-colors" />
                            <input
                                type="password"
                                required
                                placeholder="••••••••••••"
                                className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:border-visio-teal/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-visio-teal/50 text-sm font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-visio-teal to-visio-sage text-black font-bold text-base tracking-wide hover:shadow-[0_0_30px_rgba(182,240,156,0.3)] hovering:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-8"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                {mode === 'signup' ? 'Initialize Account' : 'Enter Dashboard'} <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 flex flex-col gap-6">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <span className="relative bg-[#050505] px-4 text-[10px] font-bold tracking-widest text-white/20 uppercase">Or Authenticate With</span>
                    </div>

                    <button className="w-full py-3.5 rounded-xl glass-input hover:bg-white/5 transition-all flex items-center justify-center gap-3 text-sm font-medium text-white/80 group">
                        <Github size={18} className="group-hover:text-white transition-colors" />
                        <span className="group-hover:text-white transition-colors">Github</span>
                    </button>
                </div>

                <div className="mt-10 text-center">
                    <button
                        onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                        className="text-white/30 hover:text-visio-teal text-sm font-medium transition-colors"
                    >
                        {mode === 'signup' ? 'Already have access? ' : "Need an account? "}
                        <span className="text-visio-teal underline decoration-visio-teal/30 underline-offset-4 hover:decoration-visio-teal transition-all">
                            {mode === 'signup' ? 'Log in' : 'Sign up'}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};
