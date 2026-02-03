'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

import { Suspense } from 'react';

function PaymentCancelledContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');
    const isFailure = error === 'failed';

    return (
        <div className="min-h-screen bg-visio-bg flex items-center justify-center p-8">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="relative w-24 h-24 mx-auto mb-8"
                >
                    <div className={`absolute inset-0 ${isFailure ? 'bg-red-500/20' : 'bg-orange-500/20'} rounded-full blur-xl`} />
                    <div className={`relative w-full h-full ${isFailure ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'} rounded-full flex items-center justify-center`}>
                        <XCircle size={48} className="text-white" />
                    </div>
                </motion.div>

                {/* Text */}
                <h1 className="text-3xl font-bold text-white mb-4">
                    {isFailure ? 'Payment Failed' : 'Payment Cancelled'}
                </h1>
                <p className="text-white/60 mb-8">
                    {isFailure
                        ? 'There was an issue processing your payment. Please try again or use a different payment method.'
                        : 'You cancelled the payment. No worries - you can try again whenever you\'re ready.'}
                </p>

                {/* Tips for failure */}
                {isFailure && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 mb-8 text-left">
                        <p className="text-red-400 text-sm font-medium mb-3">Possible reasons:</p>
                        <ul className="space-y-2 text-white/60 text-sm">
                            <li>• Insufficient funds</li>
                            <li>• Card declined by bank</li>
                            <li>• Incorrect card details</li>
                            <li>• 3D Secure verification failed</li>
                        </ul>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-4">
                    <a
                        href="/billing"
                        className="inline-flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                        <RefreshCw size={18} />
                        Try Again
                    </a>

                    <a
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back to Dashboard
                    </a>
                </div>
            </motion.div>
        </div>
    );
}

export default function PaymentCancelledPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-visio-bg flex items-center justify-center text-white">Loading...</div>}>
            <PaymentCancelledContent />
        </Suspense>
    );
}
