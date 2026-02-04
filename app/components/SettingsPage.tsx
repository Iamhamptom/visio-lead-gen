import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, LogOut, Home, ArrowUpRight, Music, MapPin } from 'lucide-react';
import { Subscription, ArtistProfile, IdentityCheckResult } from '../types';
import { saveArtistProfile } from '@/lib/data-service';
import { ShinyButton } from './ui/ShinyButton';

interface SettingsPageProps {
    subscription: Subscription;
    artistProfile: ArtistProfile | null;
    onBack: () => void;
    onNavigateHome: () => void;
    onLogout: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
    subscription,
    artistProfile,
    onBack,
    onNavigateHome,
    onLogout
}) => {
    const [name, setName] = useState(artistProfile?.name || '');
    const [email, setEmail] = useState(artistProfile?.socials?.email || '');
    const [genre, setGenre] = useState(artistProfile?.genre || '');
    const [city, setCity] = useState(artistProfile?.location?.city || '');
    const [country, setCountry] = useState(artistProfile?.location?.country || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showIdentityModal, setShowIdentityModal] = useState(false);
    const [identityResults, setIdentityResults] = useState<IdentityCheckResult[]>([]);
    const [identityQuery, setIdentityQuery] = useState('');
    const [identityLoading, setIdentityLoading] = useState(false);
    const [identityError, setIdentityError] = useState<string | null>(null);

    // Sync state with profile prop
    React.useEffect(() => {
        if (artistProfile) {
            setName(artistProfile.name || '');
            setEmail(artistProfile.socials?.email || '');
            setGenre(artistProfile.genre || '');
            setCity(artistProfile.location?.city || '');
            setCountry(artistProfile.location?.country || '');
        }
    }, [artistProfile]);

    // Save Handler
    const handleSave = async () => {
        if (!artistProfile) return;
        setIsSaving(true);
        setIdentityError(null);

        const updatedProfile = {
            ...artistProfile,
            name,
            genre,
            location: {
                city,
                country
            },
            socials: {
                ...artistProfile.socials,
                email
            }
        };

        const success = await saveArtistProfile(updatedProfile);

        // Trigger update event
        if (success) {
            window.dispatchEvent(new Event('artistProfileUpdated'));
            alert('Settings saved successfully!');
            const normalizedName = name.trim();
            const lastCheckedName = artistProfile.identityCheck?.lastQueriedName;
            const shouldCheckIdentity = normalizedName.length > 0 && normalizedName !== lastCheckedName;
            if (shouldCheckIdentity) {
                await runIdentityCheck(normalizedName);
            }
        } else {
            alert('Failed to save settings. Please try again.');
        }
        setIsSaving(false);
    };

    const runIdentityCheck = async (normalizedName: string) => {
        setIdentityLoading(true);
        setIdentityResults([]);
        try {
            const res = await fetch('/api/identity-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: normalizedName,
                    city,
                    country
                })
            });
            const data = await res.json();
            setIdentityResults(Array.isArray(data?.results) ? data.results : []);
            setIdentityQuery(data?.query || normalizedName);
            setShowIdentityModal(true);
        } catch (error) {
            console.error('Identity lookup failed:', error);
            setIdentityError('Identity lookup failed. Please try again.');
        } finally {
            setIdentityLoading(false);
        }
    };

    const handleIdentityDecision = async (confirmed: boolean) => {
        if (!artistProfile) return;
        const normalizedName = name.trim();
        const updatedProfile = {
            ...artistProfile,
            name,
            genre,
            location: { city, country },
            socials: { ...artistProfile.socials, email },
            identityCheck: {
                confirmed,
                lastQueriedName: normalizedName,
                confirmedAt: confirmed ? Date.now() : undefined,
                dismissedAt: confirmed ? undefined : Date.now(),
                results: identityResults
            }
        };
        const success = await saveArtistProfile(updatedProfile);
        if (success) {
            window.dispatchEvent(new Event('artistProfileUpdated'));
        }
        setShowIdentityModal(false);
    };

    return (
        <div className="flex-1 h-full overflow-y-auto bg-visio-bg text-white p-6 md:p-10 font-outfit">
            <div className="max-w-3xl mx-auto space-y-10 pb-20">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onBack}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
                    </div>
                    <ShinyButton
                        text={isSaving ? "Saving..." : "Save Changes"}
                        onClick={handleSave}
                        className="bg-visio-teal text-black font-bold"
                    />
                </div>

                {/* Navigation Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={onNavigateHome}
                        className="flex items-center justify-between bg-gradient-to-br from-visio-teal/10 to-transparent border border-visio-teal/20 p-6 rounded-2xl hover:bg-visio-teal/20 transition-all group text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-visio-teal/20 flex items-center justify-center text-visio-teal">
                                <Home size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Dashboard</h3>
                                <p className="text-white/50 text-sm">Return to your overview</p>
                            </div>
                        </div>
                        <ArrowUpRight size={20} className="text-visio-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button
                        onClick={onLogout}
                        className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 transition-all group text-left"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white/10 group-hover:bg-red-500/20 flex items-center justify-center text-white/60 group-hover:text-red-400 transition-colors">
                                <LogOut size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg group-hover:text-red-400 transition-colors">Log Out</h3>
                                <p className="text-white/50 text-sm">Sign out of your session</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Support */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="font-bold text-lg">Support & Help</h3>
                        <p className="text-white/60 text-sm">Live chat is temporarily removed. Reach us via email and we’ll respond promptly.</p>
                        <p className="text-white/70 text-sm font-mono">support@visio.ai</p>
                    </div>
                    <a
                        href="mailto:support@visio.ai"
                        className="inline-flex items-center gap-2 bg-visio-teal text-black px-4 py-2 rounded-xl font-semibold hover:bg-visio-teal/90 transition-colors"
                    >
                        Email Support
                        <ArrowUpRight size={16} />
                    </a>
                </div>

                {/* Profile Section */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold border-b border-white/10 pb-4">Personal Information</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Full Name</label>
                            <div className="relative">
                                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your Name"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-visio-teal/50 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Email Address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="email@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-visio-teal/50 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Genre</label>
                            <div className="relative">
                                <Music size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="text"
                                    value={genre}
                                    onChange={(e) => setGenre(e.target.value)}
                                    placeholder="e.g. Amapiano, Hip-Hop"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-visio-teal/50 transition-colors"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Location</label>
                            <div className="relative">
                                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="City"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-visio-teal/50 transition-colors"
                                    />
                                    <input
                                        type="text"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        placeholder="Country"
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-visio-teal/50 transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold border-b border-white/10 pb-4">Security</h2>
                    <div className="space-y-2">
                        <button className="flex items-center gap-3 text-visio-teal hover:text-white transition-colors text-sm font-medium">
                            <Lock size={16} />
                            Reset Password
                        </button>
                    </div>
                </div>

                <div className="pt-10">
                    <p className="text-center text-white/20 text-xs">Visio Lead Gen v1.2.0</p>
                </div>
            </div>

            {/* Identity Check Modal */}
            {showIdentityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0A0A0A] p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-2">Is this you?</h3>
                        <p className="text-white/50 text-sm mb-4">
                            We searched the web for: <span className="text-white">{identityQuery}</span>
                        </p>

                        {identityLoading ? (
                            <p className="text-white/40 text-sm">Searching...</p>
                        ) : identityResults.length === 0 ? (
                            <p className="text-white/40 text-sm">No obvious public results found. You can still confirm or skip.</p>
                        ) : (
                            <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                {identityResults.map((result, idx) => (
                                    <div key={`${result.link}-${idx}`} className="rounded-xl border border-white/5 bg-white/5 p-4">
                                        <div className="text-sm font-semibold text-white">{result.title}</div>
                                        {result.snippet && (
                                            <p className="text-xs text-white/50 mt-1">{result.snippet}</p>
                                        )}
                                        <a
                                            href={result.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-visio-teal hover:underline mt-2 inline-block"
                                        >
                                            View source
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}

                        {identityError && (
                            <p className="text-xs text-red-400 mt-3">{identityError}</p>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => handleIdentityDecision(false)}
                                className="px-4 py-2 text-sm rounded-lg border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Not me / Skip
                            </button>
                            <button
                                onClick={() => handleIdentityDecision(true)}
                                className="px-4 py-2 text-sm rounded-lg bg-visio-teal text-black font-semibold hover:brightness-110 transition-colors"
                            >
                                Yes, that’s me
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
