import React from 'react';
import { BackgroundBeams } from './ui/background-beams';
import { ShieldCheck, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export const PendingPage = () => {
    return (
        <div className="flex h-full w-full bg-visio-bg relative flex-col items-center justify-center p-6 text-center font-outfit overflow-hidden">
            <BackgroundBeams className="absolute inset-0 opacity-40" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-xl w-full bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl relative z-10 shadow-2xl"
            >
                <div className="w-20 h-20 rounded-full bg-visio-teal/10 flex items-center justify-center mx-auto mb-6 ring-1 ring-visio-teal/30">
                    <Clock className="text-visio-teal w-10 h-10 animate-pulse" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Account Pending Approval</h1>

                <p className="text-lg text-white/60 mb-8 leading-relaxed">
                    Thank you for subscribing to Visio. To maintain exclusivity and ensure high-quality service, we manually review all new accounts.
                </p>

                <div className="bg-white/5 rounded-xl p-6 border border-white/5 mb-8 text-left">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <ShieldCheck size={18} className="text-visio-teal" />
                        What happens next?
                    </h3>
                    <ul className="space-y-3 text-sm text-white/50">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-visio-teal mt-1.5" />
                            Our team will review your application details.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-visio-teal mt-1.5" />
                            This process typically takes 12-24 hours.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-visio-teal mt-1.5" />
                            You will receive an email confirmation once approved to access the platform.
                        </li>
                    </ul>
                </div>

                <button
                    onClick={() => window.location.href = 'mailto:support@visio.ai'}
                    className="text-white/40 hover:text-white text-sm transition-colors"
                >
                    Contact Support
                </button>
            </motion.div>
        </div>
    );
};
