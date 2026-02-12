'use client';

import React, { useState, useEffect } from 'react';
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
    Rocket
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

interface OnboardingTutorialProps {
    userId?: string;
    onComplete: () => void;
    onNavigate?: (view: string) => void;
}

const STEPS = [
    {
        icon: Sparkles,
        title: 'Welcome to Visio AI',
        subtitle: 'Your AI-Powered PR Assistant',
        description: 'Visio helps you find the right contacts, draft pitches, and manage your PR campaigns — all powered by AI.',
        tip: 'Let\'s walk through the key features so you can hit the ground running.',
        color: 'from-visio-teal to-visio-sage',
        iconBg: 'bg-visio-teal/20',
        iconColor: 'text-visio-teal'
    },
    {
        icon: User,
        title: 'Set Up Your Profile',
        subtitle: 'Step 1 of 4',
        description: 'Head to Settings and fill in your artist or label profile. This helps the AI tailor its suggestions to your genre, market, and goals.',
        tip: '💡 The more detail you add, the better your results will be.',
        color: 'from-blue-500 to-cyan-500',
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        action: 'settings',
        actionLabel: 'Go to Settings'
    },
    {
        icon: MessageSquare,
        title: 'Start a Consultation',
        subtitle: 'Step 2 of 4',
        description: 'Open a new chat session with the AI. Tell it about your upcoming release, event, or campaign and it will guide you through building a strategy.',
        tip: '💡 Try saying: "I\'m releasing a single next month and need PR contacts in South Africa."',
        color: 'from-purple-500 to-pink-500',
        iconBg: 'bg-purple-500/20',
        iconColor: 'text-purple-400',
        action: 'dashboard',
        actionLabel: 'Start Chatting'
    },
    {
        icon: BookmarkPlus,
        title: 'Save & Manage Leads',
        subtitle: 'Step 3 of 4',
        description: 'When the AI finds contacts for you, save them to your Lead Database. You can organize, filter, and export them anytime.',
        tip: '💡 Look for the "Save Lead" button on any contact card in the chat.',
        color: 'from-emerald-500 to-green-500',
        iconBg: 'bg-emerald-500/20',
        iconColor: 'text-emerald-400',
        action: 'leads',
        actionLabel: 'View Leads'
    },
    {
        icon: Zap,
        title: 'Unlock More Power',
        subtitle: 'Step 4 of 4',
        description: 'Upgrade your plan for unlimited searches, advanced enrichment, and priority support. Start with the free tier and scale as you grow.',
        tip: '🚀 You\'re all set! Start your first session and let Visio work for you.',
        color: 'from-amber-500 to-orange-500',
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        action: 'billing',
        actionLabel: 'View Plans'
    }
];

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
    userId,
    onComplete,
    onNavigate
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [direction, setDirection] = useState(0);

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

    const variants = {
        enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 })
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={handleComplete}
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl shadow-black/50 overflow-hidden"
            >
                {/* Gradient Header */}
                <div className={`h-2 w-full bg-gradient-to-r ${step.color}`} />

                {/* Close Button */}
                <button
                    onClick={handleComplete}
                    className="absolute top-5 right-5 p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors z-10"
                    aria-label="Skip tutorial"
                >
                    <X size={18} />
                </button>

                {/* Content */}
                <div className="p-8 pt-6 min-h-[420px] flex flex-col">
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
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/30 mb-6">
                                {step.subtitle}
                            </p>

                            {/* Icon */}
                            <div className={`w-16 h-16 rounded-2xl ${step.iconBg} flex items-center justify-center mb-6`}>
                                <step.icon size={28} className={step.iconColor} />
                            </div>

                            {/* Title */}
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                                {step.title}
                            </h2>

                            {/* Description */}
                            <p className="text-white/60 leading-relaxed mb-6 text-[15px]">
                                {step.description}
                            </p>

                            {/* Tip Box */}
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-6">
                                <p className="text-sm text-white/50">{step.tip}</p>
                            </div>

                            {/* Action Button (optional) */}
                            {step.action && onNavigate && (
                                <button
                                    onClick={handleAction}
                                    className="self-start text-sm font-medium text-visio-teal hover:text-visio-teal/80 transition-colors flex items-center gap-2 group"
                                >
                                    {step.actionLabel}
                                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                        {/* Progress Dots */}
                        <div className="flex items-center gap-2">
                            {STEPS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setDirection(i > currentStep ? 1 : -1);
                                        setCurrentStep(i);
                                    }}
                                    className={`h-2 rounded-full transition-all duration-300 ${i === currentStep
                                        ? 'w-8 bg-white'
                                        : i < currentStep
                                            ? 'w-2 bg-white/40'
                                            : 'w-2 bg-white/15'
                                        }`}
                                    aria-label={`Go to step ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-3">
                            {!isFirstStep && (
                                <button
                                    onClick={handlePrev}
                                    className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                    aria-label="Previous step"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${isLastStep
                                    ? 'bg-visio-teal text-black hover:bg-visio-teal/90'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                {isLastStep ? (
                                    <>
                                        <Rocket size={16} />
                                        Let&apos;s Go!
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
