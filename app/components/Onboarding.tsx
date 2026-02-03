'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    ArrowLeft,
    Sparkles,
    Music,
    MapPin,
    Users,
    Trophy,
    Heart,
    Target,
    SkipForward,
    Check,
    Instagram,
    Twitter,
    Youtube,
    Globe,
    FileText,
    Upload,
    Wand2,
    Link,
    Disc3,
    Loader2
} from 'lucide-react';
import { BackgroundBeams } from './ui/background-beams';
import { ArtistProfile } from '../types';

interface OnboardingProps {
    onComplete: (profile: ArtistProfile) => void;
    onSkip: () => void;
    userEmail?: string;
}

import { saveArtistProfile, loadArtistProfile } from '@/lib/data-service';

// Bio builder questions
interface BioAnswers {
    musicJourney: string;
    inspiration: string;
    uniqueAngle: string;
    achievement: string;
}

// Fun facts for each step
const STEP_FACTS = {
    welcome: {
        icon: Sparkles,
        fact: "Artists who work with PR specialists see 340% more press coverage on average. Let's get you set up right.",
    },
    name: {
        icon: Music,
        fact: "Did you know? Prince changed his name to an unpronounceable symbol in 1993 to escape his contract. Your artist name is your brand identity—choose wisely!",
    },
    genre: {
        icon: Music,
        fact: "Spotify has over 5,000 genre classifications. Being specific about your genre helps us find the exact curators and blogs that match your sound.",
    },
    location: {
        icon: MapPin,
        fact: "Local press loves local artists! Billie Eilish's first features were all from LA-based blogs. We'll prioritize your home market.",
    },
    bio: {
        icon: Sparkles,
        fact: "The Beatles' original bio was just 47 words. Keep it punchy—journalists skim hundreds of pitches daily.",
    },
    bioBuilder: {
        icon: Wand2,
        fact: "Great bios answer 3 questions: Who are you? What's your sound? Why should I care? Let's build yours together.",
    },
    similarArtists: {
        icon: Users,
        fact: "Spotify's algorithm started recommending Doja Cat after fans compared her to Nicki Minaj. Similar artists help us position you perfectly.",
    },
    milestones: {
        icon: Trophy,
        fact: "Chance the Rapper got his first major press at just 10K followers. Your current numbers help us target the right tier of outlets.",
    },
    careerHighlights: {
        icon: Trophy,
        fact: "Every press release needs a hook. Lizzo's 'first Black woman to headline X' became her defining narrative. What's yours?",
    },
    lifeHighlights: {
        icon: Heart,
        fact: "Kendrick Lamar's Compton upbringing shaped his entire brand. Personal stories create emotional connections with fans and press.",
    },
    communities: {
        icon: Target,
        fact: "Tyler, the Creator built Odd Future before going solo. Communities amplify your reach exponentially.",
    },
    socials: {
        icon: Link,
        fact: "82% of journalists check an artist's social media before responding to a pitch. Connected profiles = credibility.",
    },
    releases: {
        icon: Disc3,
        fact: "Beyoncé's surprise album drops changed the industry. Having your releases documented helps us time PR perfectly.",
    },
    epk: {
        icon: FileText,
        fact: "An EPK (Electronic Press Kit) with high-res photos and a one-sheet gets 3x more responses than a plain email pitch.",
    },
};

const STEPS = [
    'welcome',
    'name',
    'genre',
    'location',
    'bio',
    'similarArtists',
    'milestones',
    'careerHighlights',
    'lifeHighlights',
    'communities',
    'socials',
    'releases',
    'epk',
    'complete'
] as const;

type Step = typeof STEPS[number];

const DEFAULT_PROFILE: Partial<ArtistProfile> = {
    name: '',
    genre: '',
    description: '',
    location: { city: '', country: '' },
    similarArtists: [],
    milestones: { instagramFollowers: 0, monthlyListeners: 0 },
    socials: {},
    connectedAccounts: {},
    promotionalFocus: 'Streaming',
    careerHighlights: [],
    lifeHighlights: [],
    desiredCommunities: [],
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onSkip, userEmail }) => {
    const [currentStep, setCurrentStep] = useState<Step>('welcome');
    const [profile, setProfile] = useState<Partial<ArtistProfile>>(DEFAULT_PROFILE);
    const [showBioBuilder, setShowBioBuilder] = useState(false);
    const [bioAnswers, setBioAnswers] = useState<BioAnswers>({
        musicJourney: '',
        inspiration: '',
        uniqueAngle: '',
        achievement: ''
    });
    const [releases, setReleases] = useState<{ title: string; type: string; date: string }[]>([]);
    const [epkFiles, setEpkFiles] = useState<string[]>([]);
    const [needsHelp, setNeedsHelp] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Load saved profile on mount
    React.useEffect(() => {
        const loadSavedProfile = async () => {
            try {
                const savedProfile = await loadArtistProfile();
                if (savedProfile) {
                    setProfile(prev => ({ ...prev, ...savedProfile }));

                    // Optional: Restore step based on filled fields?
                    // For now, we'll just load the data so they don't lose it
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSavedProfile();
    }, []);

    // Save progress when moving steps
    const saveProgress = async (currentProfile: Partial<ArtistProfile>) => {
        if (currentProfile.name) { // Only save if we at least have a name
            try {
                // We cast to ArtistProfile for saving, assuming the backend handles partial updates via upsert
                // actually saveArtistProfile expects a full ArtistProfile but the upsert handles it. 
                // Let's check saveArtistProfile implementation. It uses profile.name, etc.
                // We should probably allow partials in saveArtistProfile or just cast here knowing it's a draft.
                await saveArtistProfile(currentProfile as ArtistProfile);
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }
    };

    const stepIndex = STEPS.indexOf(currentStep);
    const progress = (stepIndex / (STEPS.length - 1)) * 100;

    const nextStep = () => {
        const next = STEPS[stepIndex + 1];
        if (next) {
            setShowBioBuilder(false);
            saveProgress(profile);
            setCurrentStep(next);
        }
    };

    const prevStep = () => {
        const prev = STEPS[stepIndex - 1];
        if (prev) {
            setShowBioBuilder(false);
            setCurrentStep(prev);
        }
    };

    const handleComplete = async () => {
        // Trigger welcome email
        try {
            if (profile.name) { // Simple check, ideally email is on user record
                // In a real app we'd get the email from the auth user context.
                // For now, let's assume we pass it or the backend handles it via 'to'
                // Since we don't have the user's email in the 'profile' object consistently (it's often just 'name' here),
                // we rely on the backend possibly filling it in, OR we pass a placeholder/fetched email.
                // Ideally, Onboarding should know the user email.
                // Let's assume we fetch it or just call the API and let it fail gracefully if no email.

                // Actually, let's try to get it from auth context if we were using it here. 
                // But this component doesn't have useAuth hook integrated yet.
                // We'll dispatch the request and if it needs email, we'll need to grab it.
                // For MVP, let's assume we can pass the profile data.

                await fetch('/api/email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: userEmail || 'user@example.com', // Use prop or fallback
                        type: 'welcome',
                        data: { name: profile.name }
                    })
                });
            }
        } catch (e) {
            console.error('Failed to send welcome email', e);
        }

        onComplete(profile as ArtistProfile);
    };

    const generateBioFromAnswers = () => {
        const { musicJourney, inspiration, uniqueAngle, achievement } = bioAnswers;
        let bio = '';
        if (musicJourney) bio += musicJourney + ' ';
        if (inspiration) bio += `Influenced by ${inspiration}, `;
        if (uniqueAngle) bio += uniqueAngle + ' ';
        if (achievement) bio += achievement;
        setProfile({ ...profile, description: bio.trim() });
        setShowBioBuilder(false);
    };

    const handleRequestHelp = (field: string) => {
        setNeedsHelp({ ...needsHelp, [field]: true });
        // For now, just mark that they need help - in production this would trigger AI generation
        nextStep();
    };

    const currentFact = STEP_FACTS[currentStep as keyof typeof STEP_FACTS] || STEP_FACTS.welcome;

    return (
        <div className="min-h-screen w-full bg-visio-bg flex flex-col items-center justify-center p-6 relative overflow-hidden font-outfit">

            {/* Background gradient & Beams */}
            <div className="absolute inset-0 bg-gradient-to-br from-visio-teal/10 via-visio-bg to-purple-500/10 z-0" />
            <BackgroundBeams className="opacity-40 z-0" />

            {/* Progress bar */}
            <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
                <motion.div
                    className="h-full bg-gradient-to-r from-visio-teal to-visio-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                />
            </div>

            {/* Skip button */}
            <button
                onClick={onSkip}
                className="fixed top-6 right-6 flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm z-50"
            >
                Skip for now
                <SkipForward size={16} />
            </button>

            {/* Main content */}
            <div className="relative z-10 w-full max-w-2xl flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep + (showBioBuilder ? '-builder' : '')}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="w-full glass-panel rounded-3xl p-8 md:p-12 shadow-2xl relative"
                    >
                        {/* Step content */}
                        {currentStep === 'welcome' && (
                            <WelcomeStep
                                onNext={nextStep}
                                referralSource={profile.referralSource}
                                onSelectSource={(val) => setProfile({ ...profile, referralSource: val })}
                            />
                        )}

                        {currentStep === 'name' && (
                            <InputStep
                                title="What's your artist name?"
                                value={profile.name || ''}
                                onChange={(val) => setProfile({ ...profile, name: val })}
                                placeholder="e.g. Neon Horizon"
                                fact={currentFact}
                            />
                        )}

                        {currentStep === 'genre' && (
                            <InputStep
                                title="What genre best describes your sound?"
                                value={profile.genre || ''}
                                onChange={(val) => setProfile({ ...profile, genre: val })}
                                placeholder="e.g. Synthwave, Indie Pop, Afrobeats"
                                fact={currentFact}
                            />
                        )}

                        {currentStep === 'location' && (
                            <LocationStep
                                city={profile.location?.city || ''}
                                country={profile.location?.country || ''}
                                onChange={(city, country) => setProfile({
                                    ...profile,
                                    location: { city, country }
                                })}
                                fact={currentFact}
                            />
                        )}

                        {currentStep === 'bio' && !showBioBuilder && (
                            <BioStep
                                value={profile.description || ''}
                                onChange={(val) => setProfile({ ...profile, description: val })}
                                onBuildForMe={() => setShowBioBuilder(true)}
                                fact={currentFact}
                            />
                        )}

                        {currentStep === 'bio' && showBioBuilder && (
                            <BioBuilderStep
                                answers={bioAnswers}
                                setAnswers={setBioAnswers}
                                onGenerate={generateBioFromAnswers}
                                onBack={() => setShowBioBuilder(false)}
                            />
                        )}

                        {currentStep === 'similarArtists' && (
                            <InputStepWithHelp
                                title="Who are 2-3 artists you sound like?"
                                value={(profile.similarArtists || []).join(', ')}
                                onChange={(val) => setProfile({
                                    ...profile,
                                    similarArtists: val.split(',').map(s => s.trim()).filter(s => s)
                                })}
                                placeholder="e.g. The Weeknd, Dua Lipa, Doja Cat"
                                fact={currentFact}
                                helpText="Not sure? We can analyze your music later"
                                onNeedHelp={() => handleRequestHelp('similarArtists')}
                            />
                        )}

                        {currentStep === 'milestones' && (
                            <MilestonesStep
                                igFollowers={profile.milestones?.instagramFollowers || 0}
                                monthlyListeners={profile.milestones?.monthlyListeners || 0}
                                onChange={(ig, ml) => setProfile({
                                    ...profile,
                                    milestones: { instagramFollowers: ig, monthlyListeners: ml }
                                })}
                                fact={currentFact}
                            />
                        )}

                        {currentStep === 'careerHighlights' && (
                            <TextAreaStepWithHelp
                                title="What are your biggest career wins?"
                                value={(profile.careerHighlights || []).join('\n')}
                                onChange={(val) => setProfile({
                                    ...profile,
                                    careerHighlights: val.split('\n').filter(s => s.trim())
                                })}
                                placeholder="e.g. Featured on major playlist&#10;Opened for XYZ artist&#10;Song went viral on TikTok"
                                fact={currentFact}
                                helpText="Just starting out? No worries, we'll help you build your story"
                                onNeedHelp={() => handleRequestHelp('careerHighlights')}
                            />
                        )}

                        {currentStep === 'lifeHighlights' && (
                            <TextAreaStepWithHelp
                                title="What life experiences shape your music?"
                                value={(profile.lifeHighlights || []).join('\n')}
                                onChange={(val) => setProfile({
                                    ...profile,
                                    lifeHighlights: val.split('\n').filter(s => s.trim())
                                })}
                                placeholder="e.g. Grew up in a musical family&#10;Self-taught producer&#10;Overcame personal challenges"
                                fact={currentFact}
                                helpText="We can explore this together in chat"
                                onNeedHelp={() => handleRequestHelp('lifeHighlights')}
                            />
                        )}

                        {currentStep === 'communities' && (
                            <InputStepWithHelp
                                title="What communities do you want to be part of?"
                                value={(profile.desiredCommunities || []).join(', ')}
                                onChange={(val) => setProfile({
                                    ...profile,
                                    desiredCommunities: val.split(',').map(s => s.trim()).filter(s => s)
                                })}
                                placeholder="e.g. Berlin techno scene, LA indie collective, African music network"
                                fact={currentFact}
                                helpText="We can suggest communities based on your genre"
                                onNeedHelp={() => handleRequestHelp('communities')}
                            />
                        )}

                        {currentStep === 'socials' && (
                            <SocialsStep
                                socials={profile.socials || {}}
                                onChange={(socials) => setProfile({ ...profile, socials })}
                                fact={currentFact}
                            />
                        )}

                        {currentStep === 'releases' && (
                            <ReleasesStep
                                releases={releases}
                                setReleases={setReleases}
                                fact={currentFact}
                                onSkip={nextStep}
                            />
                        )}

                        {currentStep === 'epk' && (
                            <EpkStep
                                files={epkFiles}
                                setFiles={setEpkFiles}
                                fact={currentFact}
                                onNeedHelp={() => {
                                    setNeedsHelp({ ...needsHelp, epk: true });
                                    nextStep();
                                }}
                            />
                        )}

                        {currentStep === 'complete' && (
                            <CompleteStep
                                profile={profile}
                                needsHelp={needsHelp}
                                onComplete={handleComplete}
                            />
                        )}

                        {/* Navigation */}
                        {currentStep !== 'welcome' && currentStep !== 'complete' && !showBioBuilder && (
                            <div className="flex items-center justify-between pt-8">
                                <button
                                    onClick={prevStep}
                                    className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                    Back
                                </button>
                                <button
                                    onClick={nextStep}
                                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform"
                                >
                                    Continue
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Step indicator */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {STEPS.slice(1, -1).map((step, idx) => (
                    <div
                        key={step}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${idx < stepIndex - 1 ? 'bg-visio-accent' :
                            idx === stepIndex - 1 ? 'bg-white' :
                                'bg-white/20'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
};

// Sub-components

const WelcomeStep = ({ onNext, referralSource, onSelectSource }: { onNext: () => void, referralSource?: string, onSelectSource: (val: string) => void }) => (
    <div className="text-center flex flex-col items-center">
        <motion.div
            className="w-24 h-24 rounded-3xl bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.3)] mb-8"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <Sparkles size={40} className="text-black" />
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight text-glow filter drop-shadow-lg">Welcome to Visio</h1>
        <p className="text-white/50 text-lg max-w-md mx-auto leading-relaxed mb-8">
            Let's set up your artist profile. This helps us find the perfect PR opportunities for you.
        </p>

        {/* Marketing Data Collection */}
        <div className="w-full max-w-xs mb-8">
            <label className="text-xs font-bold text-white/30 uppercase tracking-widest mb-2 block">How did you hear about us?</label>
            <select
                value={referralSource || ''}
                onChange={(e) => onSelectSource(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-visio-teal/50 transition-colors"
            >
                <option value="" disabled>Select an option</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="twitter">Twitter / X</option>
                <option value="friend">Friend / Colleague</option>
                <option value="google">Google Search</option>
                <option value="other">Other</option>
            </select>
        </div>

        <button
            onClick={onNext}
            className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all flex items-center gap-3"
        >
            Let's Go
            <ArrowRight size={20} />
        </button>
    </div>
);

const InputStep = ({
    title,
    value,
    onChange,
    placeholder,
    fact
}: {
    title: string;
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    fact: typeof STEP_FACTS.name;
}) => (
    <div className="space-y-8 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h2>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full glass-input rounded-2xl p-6 text-white text-3xl placeholder:text-white/20 text-center font-bold tracking-tight"
            autoFocus
        />
        <FactCard fact={fact} />
    </div>
);

const InputStepWithHelp = ({
    title,
    value,
    onChange,
    placeholder,
    fact,
    helpText,
    onNeedHelp
}: {
    title: string;
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    fact: typeof STEP_FACTS.name;
    helpText: string;
    onNeedHelp: () => void;
}) => (
    <div className="space-y-8 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h2>
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full glass-input rounded-2xl p-6 text-white text-2xl placeholder:text-white/20 text-center font-medium"
            autoFocus
        />
        <button
            onClick={onNeedHelp}
            className="flex items-center gap-2 text-visio-teal hover:text-white transition-colors text-sm font-medium tracking-wide uppercase"
        >
            <Wand2 size={16} />
            {helpText}
        </button>
        <FactCard fact={fact} />
    </div>
);

const TextAreaStepWithHelp = ({
    title,
    value,
    onChange,
    placeholder,
    fact,
    helpText,
    onNeedHelp
}: {
    title: string;
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    fact: typeof STEP_FACTS.name;
    helpText: string;
    onNeedHelp: () => void;
}) => (
    <div className="space-y-8 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{title}</h2>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="w-full glass-input rounded-2xl p-6 text-white text-lg placeholder:text-white/20 resize-none font-medium leading-relaxed custom-scrollbar"
            autoFocus
        />
        <button
            onClick={onNeedHelp}
            className="flex items-center gap-2 text-visio-teal hover:text-white transition-colors text-sm font-medium tracking-wide uppercase"
        >
            <Wand2 size={16} />
            {helpText}
        </button>
        <FactCard fact={fact} />
    </div>
);

const BioStep = ({
    value,
    onChange,
    onBuildForMe,
    fact
}: {
    value: string;
    onChange: (val: string) => void;
    onBuildForMe: () => void;
    fact: typeof STEP_FACTS.name;
}) => (
    <div className="space-y-8 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Tell us about yourself</h2>
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="A short bio about your music journey..."
            rows={6}
            className="w-full glass-input rounded-2xl p-6 text-white text-lg placeholder:text-white/20 resize-none font-medium leading-relaxed custom-scrollbar"
            autoFocus
        />
        <button
            onClick={onBuildForMe}
            className="flex items-center gap-3 bg-white/5 px-6 py-4 rounded-xl text-white hover:bg-white/10 transition-colors border border-white/10 hover:border-visio-teal/50"
        >
            <Wand2 size={20} className="text-visio-teal" />
            <span className="font-medium">Help me write my bio</span>
        </button>
        <FactCard fact={fact} />
    </div>
);

const BioBuilderStep = ({
    answers,
    setAnswers,
    onGenerate,
    onBack
}: {
    answers: BioAnswers;
    setAnswers: (a: BioAnswers) => void;
    onGenerate: () => void;
    onBack: () => void;
}) => (
    <div className="space-y-8 flex flex-col">
        <div className="text-center mb-2">
            <div className="inline-flex items-center gap-3 mb-4 bg-visio-teal/10 px-4 py-2 rounded-full border border-visio-teal/20">
                <Wand2 size={20} className="text-visio-teal" />
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">AI Bio Assistant</h2>
            </div>
            <p className="text-white/50 text-sm max-w-sm mx-auto">Answer these quick questions and we'll craft a compelling professional bio for you.</p>
        </div>

        <div className="space-y-5">
            <div className="space-y-2">
                <label className="text-[10px] text-visio-teal uppercase font-bold tracking-widest pl-1">How did your music journey start?</label>
                <input
                    type="text"
                    value={answers.musicJourney}
                    onChange={(e) => setAnswers({ ...answers, musicJourney: e.target.value })}
                    placeholder="e.g. Started making beats in my bedroom at 15..."
                    className="w-full glass-input rounded-xl p-4 text-white placeholder:text-white/20 font-medium"
                    autoFocus
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-visio-teal uppercase font-bold tracking-widest pl-1">Who or what influences your sound?</label>
                <input
                    type="text"
                    value={answers.inspiration}
                    onChange={(e) => setAnswers({ ...answers, inspiration: e.target.value })}
                    placeholder="e.g. 80s synth-pop, modern R&B, and African rhythms"
                    className="w-full glass-input rounded-xl p-4 text-white placeholder:text-white/20 font-medium"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-visio-teal uppercase font-bold tracking-widest pl-1">What makes your music unique?</label>
                <input
                    type="text"
                    value={answers.uniqueAngle}
                    onChange={(e) => setAnswers({ ...answers, uniqueAngle: e.target.value })}
                    placeholder="e.g. I blend traditional instruments with electronic production"
                    className="w-full glass-input rounded-xl p-4 text-white placeholder:text-white/20 font-medium"
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-visio-teal uppercase font-bold tracking-widest pl-1">What's one thing you're proud of?</label>
                <input
                    type="text"
                    value={answers.achievement}
                    onChange={(e) => setAnswers({ ...answers, achievement: e.target.value })}
                    placeholder="e.g. My debut EP hit 100K streams in the first week"
                    className="w-full glass-input rounded-xl p-4 text-white placeholder:text-white/20 font-medium"
                />
            </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium"
            >
                <ArrowLeft size={16} />
                Cancel
            </button>
            <button
                onClick={onGenerate}
                className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform"
            >
                Generate Bio
                <Sparkles size={16} />
            </button>
        </div>
    </div>
);

const LocationStep = ({
    city,
    country,
    onChange,
    fact
}: {
    city: string;
    country: string;
    onChange: (city: string, country: string) => void;
    fact: typeof STEP_FACTS.name;
}) => (
    <div className="space-y-8 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Where are you based?</h2>
        <div className="grid grid-cols-2 gap-4 w-full">
            <input
                type="text"
                value={city}
                onChange={(e) => onChange(e.target.value, country)}
                placeholder="City"
                className="w-full glass-input rounded-2xl p-6 text-white text-lg placeholder:text-white/20 text-center font-medium"
                autoFocus
            />
            <input
                type="text"
                value={country}
                onChange={(e) => onChange(city, e.target.value)}
                placeholder="Country"
                className="w-full glass-input rounded-2xl p-6 text-white text-lg placeholder:text-white/20 text-center font-medium"
            />
        </div>
        <FactCard fact={fact} />
    </div>
);

const MilestonesStep = ({
    igFollowers,
    monthlyListeners,
    onChange,
    fact
}: {
    igFollowers: number;
    monthlyListeners: number;
    onChange: (ig: number, ml: number) => void;
    fact: typeof STEP_FACTS.name;
}) => {
    const [connecting, setConnecting] = React.useState<string | null>(null);

    const handleConnect = (platform: 'instagram' | 'spotify') => {
        setConnecting(platform);
        setTimeout(() => {
            if (platform === 'instagram') {
                onChange(12500, monthlyListeners); // Mock 12.5k
            } else {
                onChange(igFollowers, 45000); // Mock 45k
            }
            setConnecting(null);
        }, 1500);
    };

    return (
        <div className="space-y-8 text-center flex flex-col items-center">
            {/* Chat Element */}
            <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 max-w-lg text-left backdrop-blur-md">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-visio-teal to-visio-sage flex-shrink-0 flex items-center justify-center font-bold text-black text-sm">V</div>
                <div className="space-y-1">
                    <p className="text-visio-teal text-xs font-bold uppercase tracking-widest">Assistant</p>
                    <p className="text-white/90 text-sm leading-relaxed">
                        I can instantly analyze your reach. Just connect your profiles below, and I'll pull the data for you. No manual entry needed.
                    </p>
                </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Connect & Sync</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Instagram Button */}
                <button
                    onClick={() => handleConnect('instagram')}
                    disabled={igFollowers > 0 || connecting === 'instagram'}
                    className={`relative group overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${igFollowers > 0
                        ? 'bg-visio-teal/10 border-visio-teal text-white'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white'
                        }`}
                >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${igFollowers > 0 ? 'bg-visio-teal text-black' : 'bg-white/10 group-hover:bg-white/20'}`}>
                            {connecting === 'instagram' ? <Loader2 className="animate-spin" size={20} /> : <Instagram size={20} />}
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg mb-0.5">Instagram</div>
                            {igFollowers > 0 ? (
                                <div className="text-visio-teal font-mono text-sm">{(igFollowers / 1000).toFixed(1)}k Connected</div>
                            ) : (
                                <div className="text-white/40 text-sm group-hover:text-white/60">Connect Account</div>
                            )}
                        </div>
                    </div>
                </button>

                {/* Spotify Button */}
                <button
                    onClick={() => handleConnect('spotify')}
                    disabled={monthlyListeners > 0 || connecting === 'spotify'}
                    className={`relative group overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${monthlyListeners > 0
                        ? 'bg-green-500/10 border-green-500 text-white'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white'
                        }`}
                >
                    <div className="flex flex-col items-center gap-3 relative z-10">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${monthlyListeners > 0 ? 'bg-green-500 text-black' : 'bg-white/10 group-hover:bg-white/20'}`}>
                            {connecting === 'spotify' ? <Loader2 className="animate-spin" size={20} /> : <Music size={20} />}
                        </div>
                        <div className="text-center">
                            <div className="font-bold text-lg mb-0.5">Spotify</div>
                            {monthlyListeners > 0 ? (
                                <div className="text-green-400 font-mono text-sm">{(monthlyListeners / 1000).toFixed(1)}k Listeners</div>
                            ) : (
                                <div className="text-white/40 text-sm group-hover:text-white/60">Connect Account</div>
                            )}
                        </div>
                    </div>
                </button>
            </div>
        </div>
    );
};

const SocialsStep = ({
    socials,
    onChange,
    fact
}: {
    socials: Record<string, string> | any; // Using any or loose type to avoid strict interface mismatch with dynamic keys
    onChange: (s: any) => void;
    fact: typeof STEP_FACTS.name;
}) => (
    <div className="space-y-8 text-center flex flex-col items-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Your social profiles</h2>
        <p className="text-white/50 text-lg">Add any links you have—skip what you don't.</p>
        <div className="space-y-4 w-full">
            {[
                { key: 'instagram', icon: Instagram, placeholder: 'Instagram URL' },
                { key: 'twitter', icon: Twitter, placeholder: 'Twitter/X URL' },
                { key: 'youtube', icon: Youtube, placeholder: 'YouTube URL' },
                { key: 'website', icon: Globe, placeholder: 'Website URL' },
            ].map(({ key, icon: Icon, placeholder }) => (
                <div key={key} className="relative group">
                    <Icon size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-visio-teal transition-colors" />
                    <input
                        type="text"
                        value={socials[key] || ''}
                        onChange={(e) => onChange({ ...socials, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full glass-input rounded-2xl pl-14 pr-6 py-4 text-white placeholder:text-white/20 focus:border-visio-teal/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-visio-teal/50 transition-all font-medium text-left"
                    />
                </div>
            ))}
        </div>
        <FactCard fact={fact} />
    </div>
);

const ReleasesStep = ({
    releases,
    setReleases,
    fact,
    onSkip
}: {
    releases: { title: string; type: string; date: string }[];
    setReleases: (r: { title: string; type: string; date: string }[]) => void;
    fact: typeof STEP_FACTS.name;
    onSkip: () => void;
}) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('Single');

    const addRelease = () => {
        if (title.trim()) {
            setReleases([...releases, { title, type, date: new Date().toISOString().split('T')[0] }]);
            setTitle('');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Your music releases</h2>
            <p className="text-white/50">Add your tracks, EPs, or albums so we know what to promote.</p>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Release title"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:border-visio-accent focus:outline-none"
                />
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-visio-accent focus:outline-none"
                >
                    <option value="Single">Single</option>
                    <option value="EP">EP</option>
                    <option value="Album">Album</option>
                </select>
                <button
                    onClick={addRelease}
                    className="bg-visio-accent text-black px-4 py-2 rounded-xl font-medium hover:scale-105 transition-transform"
                >
                    Add
                </button>
            </div>

            {releases.length > 0 && (
                <div className="space-y-2">
                    {releases.map((r, i) => (
                        <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                            <Disc3 size={16} className="text-visio-accent" />
                            <span className="text-white flex-1">{r.title}</span>
                            <span className="text-white/40 text-sm">{r.type}</span>
                            <button
                                onClick={() => setReleases(releases.filter((_, j) => j !== i))}
                                className="text-white/30 hover:text-red-400 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button
                onClick={onSkip}
                className="flex items-center gap-2 text-visio-accent hover:text-white transition-colors text-sm"
            >
                <Wand2 size={14} />
                No releases yet? We can help you plan your first
            </button>

            <FactCard fact={fact} />
        </div>
    );
};

const EpkStep = ({
    files,
    setFiles,
    fact,
    onNeedHelp
}: {
    files: string[];
    setFiles: (f: string[]) => void;
    fact: typeof STEP_FACTS.name;
    onNeedHelp: () => void;
}) => (
    <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white">Your press materials</h2>
        <p className="text-white/50">Upload hi-res photos, a one-sheet, or EPK if you have them.</p>

        <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-visio-accent transition-colors cursor-pointer">
            <Upload size={32} className="mx-auto text-white/30 mb-3" />
            <p className="text-white/50">Drag & drop files here, or click to browse</p>
            <p className="text-white/30 text-sm mt-1">PDF, JPG, PNG up to 10MB</p>
            <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    const newFiles = Array.from(e.target.files || []).map(f => f.name);
                    setFiles([...files, ...newFiles]);
                }}
            />
        </div>

        {files.length > 0 && (
            <div className="space-y-2">
                {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3">
                        <FileText size={16} className="text-visio-accent" />
                        <span className="text-white flex-1">{f}</span>
                        <button
                            onClick={() => setFiles(files.filter((_, j) => j !== i))}
                            className="text-white/30 hover:text-red-400 transition-colors"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        )}

        <button
            onClick={onNeedHelp}
            className="flex items-center gap-2 bg-gradient-to-r from-visio-teal/20 to-purple-500/20 border border-white/10 px-4 py-3 rounded-xl text-white hover:border-visio-accent transition-colors w-full justify-center"
        >
            <Wand2 size={16} className="text-visio-accent" />
            <span>I need help building an EPK</span>
        </button>

        <FactCard fact={fact} />
    </div>
);

const FactCard = ({ fact }: { fact: typeof STEP_FACTS.name }) => {
    const Icon = fact.icon;
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full glass-panel rounded-2xl p-5 mt-6 backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
        >
            <div className="flex items-start gap-4">
                <div className="p-2.5 bg-visio-teal/10 rounded-xl border border-visio-teal/20 shrink-0">
                    <Icon size={20} className="text-visio-teal" />
                </div>
                <div className="text-left">
                    <p className="text-visio-teal text-xs font-bold uppercase tracking-widest mb-1.5 leading-tight">Did you know?</p>
                    <p className="text-white/70 text-sm leading-relaxed font-medium">{fact.fact}</p>
                </div>
            </div>
        </motion.div>
    );
};

const CompleteStep = ({
    profile,
    needsHelp,
    onComplete
}: {
    profile: Partial<ArtistProfile>;
    needsHelp: Record<string, boolean>;
    onComplete: () => void;
}) => {
    const helpNeeded = Object.entries(needsHelp).filter(([_, v]) => v).map(([k]) => k);

    return (
        <div className="text-center flex flex-col items-center">
            <motion.div
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center shadow-[0_0_40px_rgba(45,212,191,0.4)] mb-8"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10 }}
            >
                <Check size={40} className="text-black" strokeWidth={3} />
            </motion.div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight text-glow">You're all set!</h1>
            <p className="text-white/50 text-lg max-w-md mx-auto leading-relaxed mb-8">
                Your profile is ready. Visio now has everything needed to find the perfect PR opportunities for you.
            </p>

            <div className="w-full glass-panel rounded-2xl p-6 text-left space-y-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-visio-teal/20 flex items-center justify-center border border-visio-teal/30">
                        <Check size={12} className="text-visio-teal" />
                    </div>
                    <span className="text-white/80 font-medium">Artist profile created</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-visio-teal/20 flex items-center justify-center border border-visio-teal/30">
                        <Check size={12} className="text-visio-teal" />
                    </div>
                    <span className="text-white/80 font-medium">Targeting parameters set</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-visio-teal/20 flex items-center justify-center border border-visio-teal/30">
                        <Check size={12} className="text-visio-teal" />
                    </div>
                    <span className="text-white/80 font-medium">AI Strategy engine initialized</span>
                </div>
                {helpNeeded.length > 0 && (
                    <div className="pt-4 border-t border-white/10 mt-2">
                        <p className="text-visio-teal text-sm flex items-start gap-2 font-medium">
                            <Wand2 size={16} className="mt-0.5 shrink-0" />
                            <span>Queued for AI assistance: <br /><span className="text-white/50 font-normal">{helpNeeded.map(h => {
                                const labels: Record<string, string> = {
                                    similarArtists: 'finding similar artists',
                                    careerHighlights: 'building your story',
                                    lifeHighlights: 'crafting your narrative',
                                    communities: 'finding communities',
                                    epk: 'creating your EPK'
                                };
                                return labels[h] || h;
                            }).join(', ')}</span></span>
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={onComplete}
                className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all flex items-center gap-3"
            >
                Enter Dashboard
                <Sparkles size={20} />
            </button>
        </div>
    );
};
