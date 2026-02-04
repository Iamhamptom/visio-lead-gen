'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Check,
    ArrowUpRight,
    Download,
    Zap,
    Briefcase,
    Rocket,
    Music,
    AlertCircle,
    Building,
    Loader2,
    X,
} from 'lucide-react';
import { Subscription, SubscriptionTier } from '../types';
import { InvoiceReceipt } from './InvoiceReceipt';
import { YocoCardForm } from './YocoCardForm';

interface BillingProps {
    currentSubscription?: Subscription;
    onUpgrade: (tier: SubscriptionTier) => void;
    userEmail?: string;
}

const TIER_DETAILS: Record<SubscriptionTier, {
    name: string;
    price: string;
    priceValue: number;
    color: string;
    borderColor?: string;
    icon: typeof Music;
    features: string[];
    recommended?: boolean;
}> = {
    artist: {
        name: 'Artist Base',
        price: 'Free',
        priceValue: 0,
        color: 'bg-white/5',
        icon: Music,
        features: ['1 Artist Profile', 'Basic Search', 'Instant AI']
    },
    starter: {
        name: 'Starter',
        price: 'R199',
        priceValue: 199,
        color: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        icon: Music,
        features: ['1 Artist Profile', 'Standard AI', 'Basic Support']
    },
    artiste: {
        name: 'Artiste',
        price: 'R570',
        priceValue: 570,
        color: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20',
        icon: Music,
        features: ['2 Artist Profiles', 'Standard AI', 'Email Support']
    },
    starter_label: {
        name: 'Starter Label',
        price: 'R950',
        priceValue: 950,
        color: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
        icon: Briefcase,
        features: ['3 Artist Profiles', 'Business AI', 'Priority Support'],
        recommended: true
    },
    label: {
        name: 'Label Pro',
        price: 'R1,799',
        priceValue: 1799,
        color: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        icon: Briefcase,
        features: ['5 Artist Profiles', 'Advanced AI', 'Dedicated Support']
    },
    agency: {
        name: 'Agency Elite',
        price: 'R4,499',
        priceValue: 4499,
        color: 'bg-visio-accent/10',
        borderColor: 'border-visio-accent/30',
        icon: Zap,
        features: ['Unlimited Artists', 'Enterprise AI', 'White-label']
    },
    enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        priceValue: 0,
        color: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        icon: Rocket,
        features: ['API Access', 'Custom Integrations', 'SLA Guarantee']
    }
};

export const Billing: React.FC<BillingProps> = ({
    currentSubscription = { tier: 'artist', status: 'active', currentPeriodEnd: Date.now(), interval: 'month' },
    onUpgrade,
    userEmail
}) => {
    const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>(currentSubscription.tier);
    const [isYearly, setIsYearly] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingTier, setProcessingTier] = useState<SubscriptionTier | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);

    const CurrentPlanIcon = TIER_DETAILS[currentSubscription.tier].icon;

    // Fetch invoices on mount
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                const res = await fetch('/api/invoices');
                if (res.ok) {
                    const data = await res.json();
                    setInvoices(data.invoices || []);
                }
            } catch (err) {
                console.error('Failed to fetch invoices:', err);
            } finally {
                setLoadingInvoices(false);
            }
        };
        fetchInvoices();
    }, []);

    // Handle Yoco checkout
    const handleUpgrade = async (tier: SubscriptionTier) => {
        if (tier === 'artist' || tier === 'enterprise') {
            // Free tier or enterprise (contact sales)
            if (tier === 'enterprise') {
                window.open('mailto:sales@visio.ai?subject=Enterprise Plan Inquiry', '_blank');
            }
            return;
        }

        setIsProcessing(true);
        setProcessingTier(tier);
        setError(null);

        try {
            const response = await fetch('/api/payments/create-checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier, email: userEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout');
            }

            // Redirect to Yoco checkout page
            window.location.href = data.redirectUrl;
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
            setIsProcessing(false);
            setProcessingTier(null);
        }
    };

    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const handlePaymentUpdate = async (token: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/payments/save-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            if (!res.ok) throw new Error('Failed to save card');

            // Success
            setShowUpdateModal(false);
            // Ideally reload subscription or optimistically update
            window.location.reload(); // Simple reload to fetch fresh data
        } catch (err) {
            setError('Failed to update payment method.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto p-8 space-y-8 relative">
            {/* Update Payment Modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowUpdateModal(false)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-6">Update Payment Method</h3>
                        <YocoCardForm
                            onSuccess={handlePaymentUpdate}
                            onError={(msg) => setError(msg)}
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
                    <p className="text-white/50">Manage your plan, payment methods, and invoices.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${currentSubscription.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-sm font-medium text-white capitalize">{currentSubscription.status}</span>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertCircle className="text-red-400 shrink-0" size={20} />
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Current Plan Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-visio-teal/10 rounded-full blur-[80px] pointer-events-none" />

                    <div className="flex items-start justify-between mb-8 relative z-10">
                        <div>
                            <p className="text-white/40 text-sm font-medium uppercase tracking-wider mb-2">Current Plan</p>
                            <h2 className="text-4xl font-bold text-white mb-1">{TIER_DETAILS[currentSubscription.tier].name}</h2>
                            <p className="text-white/60">
                                {currentSubscription.tier === 'artist' ? 'Free Plan' : `Renews on ${new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}`}
                            </p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                            <CurrentPlanIcon size={32} className="text-white" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 relative z-10">
                        <button className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform">
                            Manage Subscription
                        </button>
                        {currentSubscription.tier !== 'enterprise' && (
                            <button
                                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-6 py-3 rounded-xl font-medium text-white hover:bg-white/5 transition-colors border border-white/10"
                            >
                                Upgrade Plan
                            </button>
                        )}
                    </div>
                </div>

                {/* Payment Method Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-white/40 text-sm font-medium uppercase tracking-wider">Payment Method</p>
                            <CreditCard size={20} className="text-white/40" />
                        </div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-8 bg-white/10 rounded flex items-center justify-center">
                                <span className="text-xs font-bold text-white/60 uppercase">
                                    {currentSubscription.paymentMethod?.brand || 'VISA'}
                                </span>
                            </div>
                            <span className="text-white font-mono">
                                •••• {currentSubscription.paymentMethod?.last4 || '4242'}
                            </span>
                        </div>
                        <p className="text-xs text-white/40">
                            {currentSubscription.paymentMethod ? `Expires ${currentSubscription.paymentMethod.expiry}` : 'No saved card'}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            console.log('Update Details clicked');
                            setShowUpdateModal(true);
                        }}
                        className="text-visio-accent text-sm font-medium hover:text-white transition-colors flex items-center gap-2 mt-6"
                    >
                        Update Details
                        <ArrowUpRight size={14} />
                    </button>
                </div>
            </div>

            {/* Upgrade Section */}
            <div id="plans" className="pt-8">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-white">Available Plans</h2>
                    <div className="flex items-center bg-white/5 rounded-full p-1 border border-white/10">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isYearly ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isYearly ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                        >
                            Yearly <span className="text-[10px] ml-1 text-green-600 font-bold">-20%</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {(Object.keys(TIER_DETAILS) as SubscriptionTier[]).map((tier) => {
                        const details = TIER_DETAILS[tier];
                        const Icon = details.icon;
                        const isCurrent = currentSubscription.tier === tier;

                        return (
                            <div
                                key={tier}
                                className={`
                                    relative flex flex-col p-6 rounded-3xl border transition-all duration-300
                                    ${isCurrent ? 'bg-white/5 border-visio-accent/50 shadow-lg shadow-visio-accent/10' : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'}
                                `}
                            >
                                {isCurrent && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-visio-accent text-black text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                                        Current Plan
                                    </div>
                                )}

                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-2 rounded-lg bg-black/20 ${tier === 'agency' ? 'text-visio-accent' : 'text-white'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="font-bold text-white">{details.name}</h3>
                                </div>

                                <div className="mb-6">
                                    <span className="text-2xl font-bold text-white">{details.price}</span>
                                    {tier !== 'artist' && tier !== 'enterprise' && (
                                        <span className="text-white/40 text-sm">{isYearly ? '/yr' : '/mo'}</span>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3 mb-6">
                                    {details.features.map((feature, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <Check size={14} className="mt-1 text-visio-accent shrink-0" />
                                            <span className="text-sm text-white/60">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handleUpgrade(tier)}
                                    disabled={isCurrent || (isProcessing && processingTier === tier)}
                                    className={`
                                        w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                                        ${isCurrent
                                            ? 'bg-white/10 text-white/40 cursor-default'
                                            : tier === 'enterprise'
                                                ? 'bg-white/10 text-white hover:bg-white/20'
                                                : isProcessing && processingTier === tier
                                                    ? 'bg-white/50 text-black cursor-wait'
                                                    : 'bg-white text-black hover:scale-105'
                                        }
                                    `}
                                >
                                    {isProcessing && processingTier === tier ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Processing...
                                        </>
                                    ) : isCurrent ? 'Active' : tier === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Invoice History Section */}
            <div className="mt-12 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Invoice History</h3>
                        <p className="text-white/50 text-sm">View and download your payment receipts.</p>
                    </div>
                    {invoices.length > 0 && (
                        <button className="text-sm font-medium text-visio-accent hover:text-white transition-colors flex items-center gap-2">
                            <Download size={14} />
                            Download All
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    {loadingInvoices ? (
                        // Loading skeleton
                        <>
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                            ))}
                        </>
                    ) : invoices.length > 0 ? (
                        invoices.slice(0, 5).map((invoice) => (
                            <InvoiceReceipt
                                key={invoice.id}
                                invoice={invoice}
                                compact
                                onDownload={() => window.open(`/api/invoices/${invoice.id}`, '_blank')}
                            />
                        ))
                    ) : (
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-8 text-center">
                            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <CreditCard size={24} className="text-white/20" />
                            </div>
                            <p className="text-white/40 text-sm">No invoices yet</p>
                            <p className="text-white/20 text-xs mt-1">Your payment history will appear here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Stitch Payout Settings (Placeholder) */}
            <div className="mt-12 pt-8 border-t border-white/5">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">Payout Settings</h3>
                        <p className="text-white/50 text-sm">Configure how you receive payments (for Agency/Label tiers).</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                        <Building size={14} className="text-white/60" />
                        <span className="text-xs text-white/60">Powered by Stitch</span>
                    </div>
                </div>

                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                            <Building size={24} className="text-white/40" />
                        </div>
                        <div>
                            <p className="text-white font-medium">Bank Account</p>
                            <p className="text-white/40 text-sm">First National Bank •••• 5599</p>
                        </div>
                    </div>
                    <button className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                        Edit Actions
                    </button>
                </div>
            </div>

            <div className="h-20" /> {/* Bottom spacing */}
        </div>
    );
};
