'use client';

import React from 'react';
import { BackgroundBeams } from './ui/background-beams';
import { ShieldCheck, Clock, Mail, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const PendingPage = () => {
    return (
        <div className="flex min-h-screen w-full bg-[#050505] relative flex-col items-center justify-center p-6 text-center font-outfit overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(20,184,166,0.05),transparent_50%)] pointer-events-none" />
            <BackgroundBeams className="absolute inset-0 opacity-40" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-xl w-full bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/[0.08] p-10 md:p-12 rounded-[2rem] relative z-10 shadow-2xl"
            >
                {/* Glow behind the card */}
                <div className="absolute -inset-0.5 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] -z-10 opacity-50 blur-sm pointer-events-none" />

                {/* Top Icon Badge */}
                <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                    className="relative w-24 h-24 mx-auto mb-8"
                >
                    <div className="absolute inset-0 bg-visio-teal/20 rounded-full blur-2xl animate-pulse" />
                    <div className="relative w-full h-full rounded-full bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                        <Clock className="text-visio-teal w-10 h-10 animate-pulse" strokeWidth={1.5} />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                >
                    <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-4">
                        Account <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">Pending</span>
                    </h1>

                    <p className="text-base md:text-lg text-white/50 mb-10 leading-relaxed font-light max-w-md mx-auto">
                        Thank you for subscribing to V-Prai. To maintain exclusivity and ensure high-quality service, we manually review all new accounts.
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="bg-white/[0.03] rounded-2xl p-6 md:p-8 border border-white/5 mb-10 text-left relative overflow-hidden group hover:border-white/10 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-500 pointer-events-none">
                        <ShieldCheck size={120} />
                    </div>
                    
                    <h3 className="text-white font-medium mb-5 flex items-center gap-3 text-lg relative z-10">
                        <div className="bg-visio-teal/10 p-2 rounded-xl text-visio-teal border border-visio-teal/20 shadow-sm">
                            <ShieldCheck size={20} />
                        </div>
                        What happens next?
                    </h3>
                    
                    <ul className="space-y-4 text-sm md:text-base text-white/60 relative z-10">
                        {[
                            "Our team will review your application details.",
                            "This process typically takes 12-24 hours.",
                            "You will receive an email confirmation once approved to access the platform."
                        ].map((text, i) => (
                            <motion.li 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + (i * 0.1) }}
                                className="flex items-start gap-3"
                            >
                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-visio-teal shrink-0 shadow-[0_0_8px_currentColor] text-visio-teal" />
                                <span className="leading-snug">{text}</span>
                            </motion.li>
                        ))}
                    </ul>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <button
                        onClick={() => window.location.href = 'mailto:admin@visiocorp.co'}
                        className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all duration-300 shadow-sm"
                    >
                        <Mail size={16} className="text-white/40 group-hover:text-visio-teal transition-colors" />
                        Contact Support
                        <ChevronRight size={16} className="text-white/40 group-hover:translate-x-0.5 transition-all" />
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};
