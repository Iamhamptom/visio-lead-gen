'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronLeft,
    ChevronRight,
    Check,
    Rocket,
    Users,
    Globe,
    Music,
    Search,
    Plus,
} from 'lucide-react';

export interface LeadGenConfig {
    contactTypes: string[];
    markets: string[];
    genre: string;
    searchDepth: 'quick' | 'deep' | 'full';
}

interface LeadGenWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (config: LeadGenConfig) => void;
    defaultGenre?: string;
    defaultMarket?: string;
}

const CONTACT_TYPES = [
    'Playlist Curators',
    'Music Journalists/Bloggers',
    'Radio DJs/Hosts',
    'PR Agencies',
    'A&R Representatives',
    'Content Creators/Influencers',
    'Event Promoters/Venues',
];

const PRESET_MARKETS = [
    'South Africa',
    'United Kingdom',
    'United States',
    'Nigeria',
    'Germany',
];

const SEARCH_DEPTHS: { id: LeadGenConfig['searchDepth']; label: string; description: string }[] = [
    { id: 'quick', label: 'Quick Search', description: 'Google only' },
    { id: 'deep', label: 'Deep Search', description: 'Google + Apollo + LinkedIn' },
    { id: 'full', label: 'Full Pipeline', description: 'All sources' },
];

const STEP_META = [
    { title: 'Who are you looking for?', icon: Users },
    { title: 'Which markets?', icon: Globe },
    { title: 'Genre or niche focus?', icon: Music },
    { title: 'How deep should I search?', icon: Search },
];

const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 280 : -280, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -280 : 280, opacity: 0 }),
};

export const LeadGenWizard: React.FC<LeadGenWizardProps> = ({
    isOpen,
    onClose,
    onSubmit,
    defaultGenre = '',
    defaultMarket,
}) => {
    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(0);

    const [contactTypes, setContactTypes] = useState<string[]>([]);
    const [markets, setMarkets] = useState<string[]>(
        defaultMarket ? [defaultMarket] : []
    );
    const [customMarket, setCustomMarket] = useState('');
    const [genre, setGenre] = useState(defaultGenre);
    const [searchDepth, setSearchDepth] = useState<LeadGenConfig['searchDepth']>('deep');

    const totalSteps = STEP_META.length;
    const isFirst = step === 0;
    const isLast = step === totalSteps - 1;

    const toggleItem = useCallback(
        (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
            setList((prev) =>
                prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
            );
        },
        []
    );

    const addCustomMarket = useCallback(() => {
        const trimmed = customMarket.trim();
        if (trimmed && !markets.includes(trimmed)) {
            setMarkets((prev) => [...prev, trimmed]);
            setCustomMarket('');
        }
    }, [customMarket, markets]);

    const handleNext = () => {
        if (isLast) {
            onSubmit({ contactTypes, markets, genre, searchDepth });
            return;
        }
        setDirection(1);
        setStep((s) => s + 1);
    };

    const handleBack = () => {
        if (isFirst) return;
        setDirection(-1);
        setStep((s) => s - 1);
    };

    const handleClose = () => {
        setStep(0);
        setContactTypes([]);
        setMarkets(defaultMarket ? [defaultMarket] : []);
        setCustomMarket('');
        setGenre(defaultGenre);
        setSearchDepth('deep');
        onClose();
    };

    const canProceed = (): boolean => {
        switch (step) {
            case 0:
                return contactTypes.length > 0;
            case 1:
                return markets.length > 0;
            case 2:
                return genre.trim().length > 0;
            case 3:
                return true;
            default:
                return false;
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Step renderers                                                     */
    /* ------------------------------------------------------------------ */

    const renderContactTypes = () => (
        <div className="space-y-2">
            {CONTACT_TYPES.map((ct) => {
                const selected = contactTypes.includes(ct);
                return (
                    <button
                        key={ct}
                        type="button"
                        onClick={() => toggleItem(contactTypes, setContactTypes, ct)}
                        className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all border ${
                            selected
                                ? 'border-visio-teal/40 bg-visio-teal/10 text-white'
                                : 'border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                selected
                                    ? 'border-visio-teal bg-visio-teal'
                                    : 'border-white/20 bg-transparent'
                            }`}
                        >
                            {selected && <Check size={12} className="text-black" />}
                        </span>
                        {ct}
                    </button>
                );
            })}
        </div>
    );

    const renderMarkets = () => (
        <div className="space-y-3">
            <div className="space-y-2">
                {PRESET_MARKETS.map((m) => {
                    const selected = markets.includes(m);
                    return (
                        <button
                            key={m}
                            type="button"
                            onClick={() => toggleItem(markets, setMarkets, m)}
                            className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all border ${
                                selected
                                    ? 'border-visio-teal/40 bg-visio-teal/10 text-white'
                                    : 'border-white/5 bg-white/[0.03] text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                    selected
                                        ? 'border-visio-teal bg-visio-teal'
                                        : 'border-white/20 bg-transparent'
                                }`}
                            >
                                {selected && <Check size={12} className="text-black" />}
                            </span>
                            {m}
                        </button>
                    );
                })}
            </div>

            {/* Custom market input */}
            <div className="flex items-center gap-2 pt-1">
                <input
                    type="text"
                    value={customMarket}
                    onChange={(e) => setCustomMarket(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomMarket();
                        }
                    }}
                    placeholder="Add custom market..."
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-visio-teal focus:outline-none transition-colors"
                />
                <button
                    type="button"
                    onClick={addCustomMarket}
                    disabled={!customMarket.trim()}
                    className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Custom markets already added (non-preset) */}
            {markets
                .filter((m) => !PRESET_MARKETS.includes(m))
                .map((m) => (
                    <button
                        key={m}
                        type="button"
                        onClick={() => setMarkets((prev) => prev.filter((x) => x !== m))}
                        className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all border border-visio-teal/40 bg-visio-teal/10 text-white"
                    >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-visio-teal bg-visio-teal">
                            <Check size={12} className="text-black" />
                        </span>
                        {m}
                        <span className="ml-auto text-xs text-white/30">custom</span>
                    </button>
                ))}
        </div>
    );

    const renderGenre = () => (
        <div className="space-y-4">
            <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Amapiano, Afrobeats, Hip-Hop..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-visio-teal focus:outline-none transition-colors text-sm"
            />
            <p className="text-xs text-white/30">
                This helps the AI target contacts relevant to your sound.
            </p>
        </div>
    );

    const renderSearchDepth = () => (
        <div className="space-y-2">
            {SEARCH_DEPTHS.map((sd) => {
                const selected = searchDepth === sd.id;
                return (
                    <button
                        key={sd.id}
                        type="button"
                        onClick={() => setSearchDepth(sd.id)}
                        className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 text-left transition-all border ${
                            selected
                                ? 'border-visio-teal/40 bg-visio-teal/10'
                                : 'border-white/5 bg-white/[0.03] hover:bg-white/5'
                        }`}
                    >
                        <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                selected
                                    ? 'border-visio-teal'
                                    : 'border-white/20'
                            }`}
                        >
                            {selected && (
                                <span className="h-2.5 w-2.5 rounded-full bg-visio-teal" />
                            )}
                        </span>
                        <div>
                            <div
                                className={`text-sm font-medium ${
                                    selected ? 'text-white' : 'text-white/60'
                                }`}
                            >
                                {sd.label}
                            </div>
                            <div className="text-xs text-white/30">{sd.description}</div>
                        </div>
                    </button>
                );
            })}
        </div>
    );

    const stepRenderers = [renderContactTypes, renderMarkets, renderGenre, renderSearchDepth];

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    if (!isOpen) return null;

    const StepIcon = STEP_META[step].icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg bg-black/60 backdrop-blur-xl border-0 md:border border-white/10 md:rounded-3xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
                    >
                        {/* Teal glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-visio-teal/5 rounded-full blur-[100px] pointer-events-none" />

                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors z-10"
                            aria-label="Close wizard"
                        >
                            <X size={18} />
                        </button>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
                            {/* Step indicator dots */}
                            <div className="flex items-center gap-2 mb-6">
                                {STEP_META.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${
                                            i === step
                                                ? 'w-8 bg-visio-teal'
                                                : i < step
                                                    ? 'w-4 bg-visio-teal/40'
                                                    : 'w-4 bg-white/10'
                                        }`}
                                    />
                                ))}
                                <span className="ml-auto text-xs text-white/30 font-medium tabular-nums">
                                    {step + 1}/{totalSteps}
                                </span>
                            </div>

                            {/* Step content */}
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={step}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                    className="flex-1 flex flex-col"
                                >
                                    {/* Icon + Title */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-visio-teal/10 flex items-center justify-center">
                                            <StepIcon size={20} className="text-visio-teal" />
                                        </div>
                                        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                                            {STEP_META[step].title}
                                        </h2>
                                    </div>

                                    {/* Dynamic content */}
                                    <div className="flex-1 overflow-y-auto pr-1">
                                        {stepRenderers[step]()}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer */}
                        <div className="shrink-0 border-t border-white/5 px-6 md:px-8 py-4 flex items-center justify-between gap-3">
                            {/* Back button */}
                            {!isFirst ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                    Back
                                </button>
                            ) : (
                                <div />
                            )}

                            {/* Next / Submit */}
                            <button
                                type="button"
                                onClick={handleNext}
                                disabled={!canProceed()}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                    isLast
                                        ? 'bg-visio-teal text-black hover:bg-visio-teal/90 shadow-lg shadow-visio-teal/20'
                                        : 'bg-visio-teal text-black hover:bg-visio-teal/90'
                                }`}
                            >
                                {isLast ? (
                                    <>
                                        <Rocket size={16} />
                                        Generate Leads
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
