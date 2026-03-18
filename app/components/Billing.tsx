'use client';

import React, { useState, useEffect } from 'react';
import {
    CreditCard,
    Check,
    ArrowUpRight,
    Download,
    AlertCircle,
    Loader2,
    X,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { Subscription, SubscriptionTier } from '../types';
import { TIER_DETAILS } from '../data/pricing';
import { InvoiceReceipt } from './InvoiceReceipt';
import { YocoCardForm } from './YocoCardForm';
import { supabase } from '@/lib/supabase/client';

interface BillingProps {
    currentSubscription?: Subscription;
    onUpgrade: (tier: SubscriptionTier) => void;
    userEmail?: string;
}

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
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                const res = await fetch('/api/invoices', {
                    headers: {
                        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                    }
                });
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
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const response = await fetch('/api/payments/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({ tier, email: userEmail })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout');
            }

            // Store checkoutId so payment-success page can verify the payment
            // (Yoco does not append it to the redirect URL)
            if (data.checkoutId) {
                sessionStorage.setItem('visio:checkoutId', data.checkoutId);
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
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const res = await fetch('/api/payments/save-method', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
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
        <div className="h-full overflow-y-auto p-6 md:p-10 lg:p-12 space-y-12 relative bg-[#0A0A0A] text-white">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Update Payment Modal */}
                {showUpdateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300">
                        <div className="bg-[#111] border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-3xl w-full max-w-md p-8 relative animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-white">
                                    <CreditCard size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white tracking-tight">Update Payment</h3>
                                    <p className="text-sm text-white/50">Securely update your card details</p>
                                </div>
                            </div>
                            <div className="mt-8">
                                <YocoCardForm
                                    onSuccess={handlePaymentUpdate}
                                    onError={(msg) => setError(msg)}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight mb-3">Billing & Subscription</h1>
                        <p className="text-white/50 text-lg max-w-xl">Manage your active plan, secure payment methods, and download your past invoices.</p>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm">
                        <div className="relative flex items-center justify-center">
                            <div className={`w-2.5 h-2.5 rounded-full z-10 ${currentSubscription.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            <div className={`absolute w-2.5 h-2.5 rounded-full animate-ping opacity-75 ${currentSubscription.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        </div>
                        <span className="text-sm font-semibold text-white/90 uppercase tracking-wider">{currentSubscription.status}</span>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)] rounded-2xl p-5 flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                        <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-rose-400 font-semibold mb-1">Transaction Error</h4>
                            <p className="text-rose-400/80 text-sm leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                {/* Current Plan Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-2 bg-gradient-to-br from-white/[0.08] to-transparent border border-white/10 hover:border-white/20 transition-colors rounded-[2rem] p-8 lg:p-10 relative overflow-hidden group shadow-2xl">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-visio-teal/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-visio-teal/20 transition-all duration-700 ease-in-out" />
                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-visio-accent/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-visio-accent/10 transition-all duration-700 ease-in-out" />

                        <div className="flex flex-col md:flex-row md:items-start justify-between mb-10 relative z-10 gap-6">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg mb-6">
                                    <Zap size={14} className="text-visio-accent" />
                                    <span className="text-white/70 text-xs font-bold uppercase tracking-widest">Current Plan</span>
                                </div>
                                <h2 className="text-5xl font-extrabold text-white mb-4 tracking-tight">{TIER_DETAILS[currentSubscription.tier].name}</h2>
                                <p className="text-white/60 text-lg">
                                    {currentSubscription.tier === 'artist' 
                                        ? 'You are currently on the Free Plan.' 
                                        : `Your plan renews automatically on `}
                                    {currentSubscription.tier !== 'artist' && (
                                        <span className="text-white font-medium">{new Date(currentSubscription.currentPeriodEnd).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    )}
                                </p>
                            </div>
                            <div className="p-5 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-3xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                <CurrentPlanIcon size={40} className="text-white drop-shadow-md" />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 relative z-10">
                            <button
                                onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-white text-black px-8 py-4 rounded-2xl font-bold hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                            >
                                Manage Subscription
                            </button>
                            {currentSubscription.tier !== 'enterprise' && (
                                <button
                                    onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="px-8 py-4 rounded-2xl font-semibold text-white bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20 backdrop-blur-sm"
                                >
                                    Explore Upgrades
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Payment Method Card */}
                    <div className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/10 hover:border-white/20 transition-colors rounded-[2rem] p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none">
                            <ShieldCheck size={120} className="text-white -mr-10 -mt-10 blur-xl" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Payment Method</span>
                                <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                                    <CreditCard size={20} className="text-white/70" />
                                </div>
                            </div>
                            
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-9 bg-gradient-to-br from-white/20 to-white/5 rounded-md flex items-center justify-center border border-white/10 shadow-sm">
                                        <span className="text-xs font-black text-white tracking-wider uppercase drop-shadow-sm">
                                            {currentSubscription.paymentMethod?.brand || 'VISA'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-mono text-lg tracking-widest">
                                            •••• {currentSubscription.paymentMethod?.last4 || '4242'}
                                        </span>
                                        <span className="text-xs text-white/50 font-medium">
                                            {currentSubscription.paymentMethod ? `Expires ${currentSubscription.paymentMethod.expiry}` : 'No saved card on file'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowUpdateModal(true)}
                            className="w-full text-visio-accent bg-visio-accent/5 hover:bg-visio-accent/10 border border-visio-accent/10 hover:border-visio-accent/20 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 relative z-10 mt-4"
                        >
                            Update Details
                            <ArrowUpRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Upgrade Section */}
                <div id="plans" className="pt-12 scroll-mt-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                        <div>
                            <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Available Plans</h2>
                            <p className="text-white/50">Choose the perfect plan for your lead generation needs.</p>
                        </div>
                        <div className="inline-flex items-center bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
                            <button
                                onClick={() => setIsYearly(false)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${!isYearly ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setIsYearly(true)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${isYearly ? 'bg-white text-black shadow-lg' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                            >
                                Yearly 
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${isYearly ? 'bg-emerald-500/20 text-emerald-600' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                    Save 20%
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {(Object.keys(TIER_DETAILS) as SubscriptionTier[]).map((tier) => {
                            const details = TIER_DETAILS[tier];
                            const Icon = details.icon;
                            const isCurrent = currentSubscription.tier === tier;

                            return (
                                <div
                                    key={tier}
                                    className={`
                                        group relative flex flex-col p-8 rounded-[2rem] border transition-all duration-500
                                        ${isCurrent 
                                            ? 'bg-gradient-to-b from-white/10 to-white/[0.02] border-visio-accent/50 shadow-[0_0_40px_rgba(var(--visio-accent-rgb),0.15)]' 
                                            : details.recommended 
                                                ? 'bg-gradient-to-b from-visio-teal/10 to-white/[0.02] border-visio-teal/40 hover:border-visio-teal shadow-[0_0_30px_rgba(var(--visio-teal-rgb),0.1)]' 
                                                : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20'
                                        }
                                    `}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-visio-accent to-visio-accent/80 text-black text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                            Current Plan
                                        </div>
                                    )}
                                    {!isCurrent && details.recommended && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-visio-teal to-visio-teal/80 text-black text-[11px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
                                            Recommended
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`p-3 rounded-2xl ${isCurrent ? 'bg-visio-accent/20 text-visio-accent' : details.recommended ? 'bg-visio-teal/20 text-visio-teal' : 'bg-white/10 text-white'}`}>
                                            <Icon size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">{details.name}</h3>
                                    </div>

                                    <div className="mb-6">
                                        <span className="text-4xl font-extrabold text-white tracking-tight">{details.price}</span>
                                        {tier !== 'artist' && tier !== 'enterprise' && (
                                            <span className="text-white/40 text-base font-medium ml-1">{isYearly ? '/yr' : '/mo'}</span>
                                        )}
                                    </div>

                                    {/* Credits badge */}
                                    <div className="mb-8 flex items-center">
                                        <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                                            <Zap size={14} className="text-amber-400 fill-amber-400/20" />
                                            {details.credits === 'unlimited' ? 'Unlimited' : details.credits} Credits / mo
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 mb-8">
                                        {details.features.map((feature, i) => (
                                            <div key={i} className="flex items-start gap-3">
                                                <div className="p-1 rounded-full bg-white/5 mt-0.5">
                                                    <Check size={12} className="text-visio-accent shrink-0" />
                                                </div>
                                                <span className="text-sm text-white/70 leading-relaxed">{feature}</span>
                                            </div>
                                        ))}
                                        {details.extras?.map((extra, i) => (
                                            <div key={`extra-${i}`} className="flex items-start gap-3 mt-4">
                                                <div className="p-1 rounded-full bg-white/5 mt-0.5">
                                                    <Check size={12} className="text-white/30 shrink-0" />
                                                </div>
                                                <span className="text-sm text-white/40 leading-relaxed">{extra}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleUpgrade(tier)}
                                        disabled={isCurrent || (isProcessing && processingTier === tier)}
                                        className={`
                                            w-full py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2
                                            ${isCurrent
                                                ? 'bg-white/5 text-white/40 cursor-default border border-white/5'
                                                : tier === 'enterprise'
                                                    ? 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                                                    : isProcessing && processingTier === tier
                                                        ? 'bg-white/80 text-black cursor-wait shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                                                        : details.recommended
                                                            ? 'bg-visio-teal text-black hover:bg-visio-teal/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(var(--visio-teal-rgb),0.3)]'
                                                            : 'bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                                            }
                                        `}
                                    >
                                        {isProcessing && processingTier === tier ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Processing...
                                            </>
                                        ) : isCurrent ? 'Active Plan' : tier === 'enterprise' ? 'Contact Sales' : 'Upgrade Plan'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Invoice History Section */}
                <div className="mt-16 pt-12 border-t border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                        <div>
                            <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Invoice History</h3>
                            <p className="text-white/50 text-base">View and download your payment receipts for accounting.</p>
                        </div>
                        {invoices.length > 0 && (
                            <button
                                onClick={() => {
                                    invoices.forEach((inv) => window.open(`/api/invoices/${inv.id}`, '_blank'));
                                }}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                <Download size={16} />
                                Download All
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {loadingInvoices ? (
                            // Loading skeleton
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
                                ))}
                            </div>
                        ) : invoices.length > 0 ? (
                            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-2 overflow-hidden">
                                {invoices.slice(0, 5).map((invoice, idx) => (
                                    <div key={invoice.id} className={`${idx !== 0 ? 'border-t border-white/5' : ''} p-2 hover:bg-white/[0.02] rounded-2xl transition-colors`}>
                                        <InvoiceReceipt
                                            invoice={invoice}
                                            compact
                                            onDownload={() => window.open(`/api/invoices/${invoice.id}`, '_blank')}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/10 rounded-[2rem] p-12 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/5">
                                    <CreditCard size={28} className="text-white/30" />
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">No invoices yet</h4>
                                <p className="text-white/40">Your past payment receipts and invoices will securely appear here.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="h-12" /> {/* Bottom spacing */}
            </div>
        </div>
    );
};
