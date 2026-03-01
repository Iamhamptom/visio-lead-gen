'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    User,
    MessageSquare,
    BookmarkPlus,
    Zap,
    ArrowRight,
    X,
    ChevronLeft,
    ChevronRight,
    Rocket,
    Check,
    Loader2,
    Lightbulb
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { TIER_DETAILS } from '@/app/data/pricing';
import { SubscriptionTier } from '@/app/types';

interface OnboardingTutorialProps {
    userId?: string;
    onComplete: () => void;
    onNavigate?: (view: string) => void;
    userEmail?: string;
    subscription?: any; // or Subscription type
}

const STEPS = [
    {
        icon: Sparkles,
        title: 'Welcome to V-Prai',
        subtitle: 'Your AI-Powered Publicist',
        description: 'V-Prai helps you find the right contacts, draft pitches, plan campaigns, and build your PR game step by step — all powered by AI.',
        tip: 'Let\'s get your account set up.',
        color: 'from-visio-teal to-visio-sage',
        iconBg: 'bg-visio-teal/20',
        iconColor: 'text-visio-teal'
    },
    {
        icon: Lightbulb,
        title: 'How V-Prai Works',
        subtitle: 'Your Journey',
        description: 'V-Prai guides you through a simple process to power your music career.',
        tip: 'Each step builds on the last — from setup to outreach.',
        color: 'from-cyan-500 to-blue-500',
        iconBg: 'bg-cyan-500/20',
        iconColor: 'text-cyan-400',
        isHowItWorksStep: true
    },
    {
        icon: Rocket,
        title: 'Choose Your Plan',
        subtitle: 'Step 1 of 5',
        description: 'Select the plan that fits your needs. You can always upgrade or change later.',
        tip: 'Start with the Free tier to explore, or upgrade for full access.',
        color: 'from-amber-500 to-orange-500',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        isPricingStep: true
    },
    {
        icon: User,
        title: 'Set Up Your Profile',
        subtitle: 'Step 2 of 5',
        description: 'Head to Settings and fill in your artist or label profile. This helps the AI tailor its suggestions to your genre, market, and goals.',
        tip: 'The more detail you add, the better your results will be.',
        color: 'from-blue-500 to-cyan-500',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        action: 'settings',
        actionLabel: 'Go to Settings'
    },
    {
        icon: MessageSquare,
        title: 'Start a Consultation',
        subtitle: 'Step 3 of 5',
        description: 'Open a new chat session with the AI. Tell it about your upcoming release, event, or campaign and it will guide you through building a strategy.',
        tip: 'Try saying: "I\'m releasing a single next month and need PR contacts in South Africa."',
        color: 'from-purple-500 to-pink-500',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        action: 'dashboard',
        actionLabel: 'Start Chatting'
    },
    {
        icon: BookmarkPlus,
        title: 'Save & Manage Leads',
        subtitle: 'Step 4 of 5',
        description: 'When the AI finds contacts for you, save them to your Lead Database. You can organize, filter, and export them anytime.',
        tip: 'Look for the "Save Lead" button on any contact card in the chat.',
        color: 'from-emerald-500 to-green-500',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        action: 'leads',
        actionLabel: 'View Leads'
    }
];

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
    userId,
    onComplete,
    onNavigate,
    userEmail,
    subscription
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingTier, setProcessingTier] = useState<SubscriptionTier | null>(null);

    // Initial Step Logic: 
    // If the user is here, they haven't completed the tutorial.
    // We can default to start, BUT if we want to force pricing, we could jump there.
    // For now, let's keep the flow: Welcome -> Profile -> Chat -> Leads -> Pricing.
    // The user wants "Account Type -> Pay -> Chat".
    // So we should probably reorder the steps or default to the pricing step if they don't have a paid sub?
    // Let's stick to the tutorial flow but make the Pricing step the "Gateway" to the rest if they want to upgrade.

    // Actually, per user request: "take them to account type, and then they select, pay, then bring them to the chat"
    // We should probably MOVE the pricing step to be earlier or the VERY FIRST thing after Welcome?
    // Let's make "Choose Your Plan" Step 2 (Index 1) instead of last.

    // For now, let's keep the linear flow but ensure it ends with pricing/upgrade option strongly.

    const step = STEPS[currentStep];
    const isLastStep = currentStep === STEPS.length - 1;
    const isFirstStep = currentStep === 0;

    const handleNext = () => {
        if (isLastStep) {
            handleComplete();
            return;
        }
        setDirection(1);
        setCurrentStep(prev => prev + 1);
    };

    const handlePrev = () => {
        if (isFirstStep) return;
        setDirection(-1);
        setCurrentStep(prev => prev - 1);
    };

    const handleComplete = () => {
        // Persist completion
        if (userId) {
            localStorage.setItem(`visio:tutorial_complete:${userId}`, 'true');
        }
        trackEvent(isLastStep ? 'tutorial_completed' : 'tutorial_skipped', {
            step: currentStep
        });
        onComplete();
    };

    const handleAction = () => {
        if (step.action && onNavigate) {
            handleComplete();
            onNavigate(step.action);
        }
    };

    const handleSelectPlan = async (tier: SubscriptionTier) => {
        if (tier === 'artist') {
            // If we are not at the last step, go to next. Otherwise complete.
            if (!isLastStep) {
                handleNext();
            } else {
                handleComplete();
            }
            return;
        }

        setIsProcessing(true);
        setProcessingTier(tier);

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
        } catch (err) {
            console.error('Checkout error:', err);
            setIsProcessing(false);
            setProcessingTier(null);
        }
    };

    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 })
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-950/80 backdrop-blur-xl z-0"
                onClick={handleComplete}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                className={`relative z-10 w-full ${(step as any).isPricingStep ? 'max-w-4xl' : 'max-w-xl'} bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/[0.08] rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-500`}
            >
                {/* Inner Glow Border */}
                <div className="absolute inset-0 rounded-[2rem] ring-1 ring-white/[0.02] pointer-events-none" />

                {/* Gradient Header */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${step.color} opacity-90`} />

                {/* Close Button */}
                <button
                    onClick={handleComplete}
                    className="absolute top-6 right-6 p-2.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-300 z-10"
                    aria-label="Skip tutorial"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="p-8 sm:p-10 pt-8 min-h-[460px] flex flex-col relative">
                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={currentStep}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="flex-1 flex flex-col"
                        >
                            {/* Step Subtitle */}
                            <motion.p 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-8"
                            >
                                {step.subtitle}
                            </motion.p>

                            {/* Icon */}
                            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl sm:rounded-[1.25rem] ${step.iconBg} flex items-center justify-center mb-6 border border-white/10 shadow-lg relative overflow-hidden group-hover:scale-105 transition-transform duration-500`}>
                                <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-white/20 to-transparent mix-blend-overlay pointer-events-none" />
                                <step.icon size={28} className={`${step.iconColor} relative z-10`} />
                            </div>

                            {/* Title */}
                            <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4 tracking-tight">
                                {step.title}
                            </h2>

                            {/* Description */}
                            <p className="text-white/60 leading-relaxed mb-8 text-[15px] sm:text-base max-w-lg">
                                {step.description}
                            </p>

                            {/* Tip Box */}
                            <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-2xl p-5 mb-8 flex items-start gap-4 backdrop-blur-md">
                                <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                                    <Sparkles size={16} className="text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white/90 mb-1">Pro Tip</p>
                                    <p className="text-sm text-white/60 leading-relaxed">{step.tip}</p>
                                </div>
                            </div>

                            {/* How It Works Mini-Journey */}
                            {(step as any).isHowItWorksStep && (
                                <div className="space-y-3 mt-2 mb-8">
                                    {[
                                        { num: 1, label: 'Sign Up & Set Profile', desc: 'Tell us about your music and goals' },
                                        { num: 2, label: 'Chat with AI Strategist', desc: 'Describe your campaign or release' },
                                        { num: 3, label: 'Get Curated Contacts', desc: 'AI finds journalists, curators, DJs, A&R' },
                                        { num: 4, label: 'Save & Manage Leads', desc: 'Build your contact database' },
                                        { num: 5, label: 'Launch Outreach', desc: 'Draft pitches and execute campaigns' },
                                    ].map(item => (
                                        <div key={item.num} className="group flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
                                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-semibold text-sm shrink-0 border border-cyan-500/20 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all">
                                                {item.num}
                                            </div>
                                            <div>
                                                <div className="text-[15px] font-medium text-white/90">{item.label}</div>
                                                <div className="text-[13px] text-white/50 mt-0.5">{item.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Button (optional) */}
                            {step.action && onNavigate && !(step as any).isPricingStep && (
                                <div className="mt-2">
                                    <button
                                        onClick={handleAction}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-sm font-medium text-white transition-all duration-300 group"
                                    >
                                        {step.actionLabel}
                                        <ArrowRight size={16} className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                    </button>
                                </div>
                            )}

                            {/* Pricing Grid */}
                            {(step as any).isPricingStep && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                                    {(['artist', 'starter', 'starter_label'] as SubscriptionTier[]).map((tier) => {
                                        const details = TIER_DETAILS[tier];
                                        const isRecommended = details.recommended;
                                        return (
                                            <div
                                                key={tier}
                                                className={`
                                                    relative p-6 rounded-[1.5rem] border transition-all duration-300 cursor-pointer group flex flex-col
                                                    ${isRecommended
                                                        ? 'bg-gradient-to-b from-visio-teal/[0.08] to-transparent border-visio-teal/30 hover:border-visio-teal/50 shadow-2xl shadow-visio-teal/10'
                                                        : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04] hover:border-white/20'
                                                    }
                                                `}
                                                onClick={() => handleSelectPlan(tier)}
                                            >
                                                {isRecommended && (
                                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-visio-teal to-emerald-400 text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-visio-teal/20 whitespace-nowrap">
                                                        Recommended
                                                    </div>
                                                )}

                                                <h3 className="font-semibold text-white/90 mb-2">{details.name}</h3>
                                                <div className="mb-6 flex items-baseline gap-1">
                                                    <span className="text-3xl font-bold text-white tracking-tight">{details.price}</span>
                                                    {tier !== 'artist' && <span className="text-white/40 text-sm font-medium">/mo</span>}
                                                </div>

                                                <ul className="space-y-3 mb-8 flex-1">
                                                    {details.features.slice(0, 3).map((feat, i) => (
                                                        <li key={i} className="flex items-start gap-3 text-[13px] text-white/60 leading-snug">
                                                            <div className={`mt-0.5 rounded-full p-0.5 shrink-0 ${isRecommended ? 'bg-visio-teal/20 text-visio-teal' : 'bg-white/10 text-white/70'}`}>
                                                                <Check size={10} strokeWidth={3} />
                                                            </div>
                                                            {feat}
                                                        </li>
                                                    ))}
                                                </ul>

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleSelectPlan(tier); }}
                                                    className={`
                                                    w-full py-3 px-4 rounded-xl text-[13px] font-semibold transition-all duration-300
                                                    ${subscription?.tier === tier
                                                            ? 'bg-white/10 text-white cursor-default border border-white/10'
                                                            : isRecommended 
                                                                ? 'bg-visio-teal hover:bg-visio-teal/90 text-black shadow-lg shadow-visio-teal/20 hover:shadow-visio-teal/40 hover:-translate-y-0.5' 
                                                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20'
                                                        }
                                                `}>
                                                    {isProcessing && processingTier === tier ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <Loader2 size={14} className="animate-spin" />
                                                            Processing...
                                                        </span>
                                                    ) : subscription?.tier === tier ? (
                                                        <span className="flex items-center justify-center gap-2">
                                                            <Check size={14} />
                                                            Current Plan
                                                        </span>
                                                    ) : (
                                                        tier === 'artist' ? 'Select Free' : 'Choose Plan'
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-8 border-t border-white/[0.06]">
                        {/* Progress Dots / Lines */}
                        <div className="flex items-center gap-1.5">
                            {STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setDirection(i > currentStep ? 1 : -1);
                                        setCurrentStep(i);
                                    }}
                                    className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                                        i === currentStep
                                        ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'
                                        : i < currentStep
                                            ? 'w-2 bg-white/40 hover:bg-white/60'
                                            : 'w-2 bg-white/10 hover:bg-white/20'
                                        }`}
                                    aria-label={`Go to step ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {!isFirstStep && (
                                <button
                                    onClick={handlePrev}
                                    className="p-3 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all duration-300 border border-transparent hover:border-white/10"
                                    aria-label="Previous step"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all duration-300 ${
                                    isLastStep
                                    ? 'bg-visio-teal text-black hover:bg-visio-teal/90 shadow-lg shadow-visio-teal/20 hover:shadow-visio-teal/40 hover:-translate-y-0.5'
                                    : (step as any).isPricingStep
                                        ? 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20'
                                        : 'bg-white hover:bg-white/90 text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:-translate-y-0.5'
                                    }`}
                            >
                                {isLastStep ? (
                                    <>
                                        <Rocket size={16} className="mr-1" />
                                        Let&apos;s Go!
                                    </>
                                ) : (step as any).isPricingStep ? (
                                    <>
                                        Skip for Now
                                        <ChevronRight size={16} className="ml-1 opacity-50" />
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
