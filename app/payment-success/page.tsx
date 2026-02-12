'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { PLAN_NAMES, PlanTier } from '@/lib/yoco';
import { updateSubscription } from '@/lib/data-service';

import { useAuth } from '@/lib/auth-context';

function PaymentSuccessContent() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const tier = searchParams.get('tier') as PlanTier | null;
    const [countdown, setCountdown] = useState(5);

    const checkoutId = searchParams.get('checkoutId');

    // Update Supabase with new subscription via secure server route
    useEffect(() => {
        const verifyAndSave = async () => {
            if (tier && checkoutId) {
                try {
                    const res = await fetch('/api/payments/confirm', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            // Pass auth token if available, but the route tries to handle it
                        },
                        body: JSON.stringify({ checkoutId })
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        console.error('Payment verification failed:', data.error);
                        // Optional: Show error to user?
                        return;
                    }

                    // Trigger Invoice Email (only if verification succeeded)
                    await fetch('/api/email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: user?.email || 'user@example.com',
                            type: 'invoice',
                            data: {
                                name: 'Subscriber',
                                plan: PLAN_NAMES[tier] || tier,
                                amount: 'Paid'
                            }
                        })
                    });

                } catch (e) {
                    console.error('Failed to verify payment or send email', e);
                }
            } else if (tier) {
                // Fallback for cases where checkoutId is missing (e.g. legacy or test without Yoco ID)
                // This logic mirrors the old insecure way but allows manual testing if needed
                console.warn('No checkoutId found, skipping secure verification.');
            }
        };
        verifyAndSave();
    }, [tier, checkoutId, user?.email]);

    // Auto-redirect countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    window.location.href = '/dashboard';
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const planName = tier ? PLAN_NAMES[tier] || tier : 'your new plan';

    return (
        <div className="min-h-screen bg-visio-bg flex items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full text-center"
            >
                {/* Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="relative w-24 h-24 mx-auto mb-8"
                >
                    <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
                    <div className="relative w-full h-full bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle size={48} className="text-white" />
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute -top-2 -right-2"
                >
                    <Sparkles size={24} className="text-yellow-400" />
                </motion.div>

                {/* Text */}
                <h1 className="text-3xl font-bold text-white mb-4">
                    Payment Successful!
                </h1>
                <p className="text-white/60 mb-8">
                    Welcome to <span className="text-visio-accent font-semibold">{planName}</span>!
                    Your subscription is now active.
                </p>

                {/* Features unlocked */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
                    <p className="text-white/40 text-sm uppercase tracking-wider mb-4">Features Unlocked</p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-white/80">
                            <CheckCircle size={16} className="text-green-400" />
                            {tier === 'agency' ? 'Unlimited Artist Profiles' : '5 Artist Profiles'}
                        </li>
                        <li className="flex items-center gap-3 text-white/80">
                            <CheckCircle size={16} className="text-green-400" />
                            {tier === 'agency' ? 'Enterprise AI' : 'Business AI'}
                        </li>
                        <li className="flex items-center gap-3 text-white/80">
                            <CheckCircle size={16} className="text-green-400" />
                            Priority Support
                        </li>
                    </ul>
                </div>

                {/* Redirect */}
                <a
                    href="/settings"
                    className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    Open Settings
                    <ArrowRight size={18} />
                </a>

                <p className="text-white/30 text-sm mt-6">
                    Redirecting in {countdown} seconds...
                </p>
            </motion.div>
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-visio-bg flex items-center justify-center text-white">Loading...</div>}>
            <PaymentSuccessContent />
        </Suspense>
    );
}
