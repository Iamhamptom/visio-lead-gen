import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, LogOut, Home, ArrowUpRight, Music, MapPin, Shield, HelpCircle, CheckCircle2, Search } from 'lucide-react';
import { Subscription, ArtistProfile, IdentityCheckResult } from '../types';
import { saveArtistProfile } from '@/lib/data-service';
import { ShinyButton } from './ui/ShinyButton';
import { supabase } from '@/lib/supabase/client';

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
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const res = await fetch('/api/identity-lookup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
                },
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
        <div className="flex-1 h-full overflow-y-auto bg-[#050505] text-white p-6 md:p-12 font-outfit selection:bg-visio-teal/30">
            <div className="max-w-4xl mx-auto space-y-12 pb-24">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <button
                            onClick={onBack}
                            className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Platform
                        </button>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
                            Account Settings
                        </h1>
                    </div>
                    <ShinyButton
                        text={isSaving ? "Saving Changes..." : "Save Changes"}
                        onClick={handleSave}
                        className="bg-visio-teal text-black font-bold px-8 shadow-[0_0_20px_rgba(0,255,255,0.15)] hover:shadow-[0_0_30px_rgba(0,255,255,0.25)] transition-all"
                    />
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <button
                        onClick={onNavigateHome}
                        className="group relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 p-6 rounded-3xl hover:border-visio-teal/30 transition-all duration-500 text-left flex items-start justify-between"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-visio-teal/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-start gap-5 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] group-hover:bg-visio-teal/20 flex items-center justify-center text-white/60 group-hover:text-visio-teal transition-colors duration-500 shadow-inner">
                                <Home size={22} strokeWidth={1.5} />
                            </div>
                            <div className="space-y-1 mt-1">
                                <h3 className="font-semibold text-lg text-white/90 group-hover:text-white transition-colors">Dashboard Overview</h3>
                                <p className="text-white/40 text-sm leading-relaxed">Return to your main analytics and lead generation hub</p>
                            </div>
                        </div>
                        <ArrowUpRight size={20} className="text-visio-teal opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-500 relative z-10" />
                    </button>

                    <button
                        onClick={onLogout}
                        className="group relative overflow-hidden bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 p-6 rounded-3xl hover:border-red-500/30 transition-all duration-500 text-left flex items-start justify-between"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="flex items-start gap-5 relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-white/[0.05] group-hover:bg-red-500/20 flex items-center justify-center text-white/60 group-hover:text-red-400 transition-colors duration-500 shadow-inner">
                                <LogOut size={22} strokeWidth={1.5} />
                            </div>
                            <div className="space-y-1 mt-1">
                                <h3 className="font-semibold text-lg text-white/90 group-hover:text-red-400 transition-colors">Sign Out</h3>
                                <p className="text-white/40 text-sm leading-relaxed">Securely end your current session and lock your account</p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Main Settings Content */}
                <div className="space-y-8">
                    {/* Personal Information Card */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-8 relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        
                        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                            <div className="w-10 h-10 rounded-2xl bg-visio-teal/10 flex items-center justify-center border border-visio-teal/20">
                                <User size={20} className="text-visio-teal" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white/90">Artist Profile</h2>
                                <p className="text-sm text-white/40 mt-1">Your public identity on the Visio platform</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-2.5">
                                <label className="text-[11px] uppercase font-bold text-white/40 tracking-widest pl-1">Full Name</label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-visio-teal transition-colors" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your artist or full name"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2.5">
                                <label className="text-[11px] uppercase font-bold text-white/40 tracking-widest pl-1">Email Address</label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-visio-teal transition-colors" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] uppercase font-bold text-white/40 tracking-widest pl-1">Primary Genre</label>
                                <div className="relative group">
                                    <Music size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-visio-teal transition-colors" />
                                    <input
                                        type="text"
                                        value={genre}
                                        onChange={(e) => setGenre(e.target.value)}
                                        placeholder="e.g. Amapiano, Hip-Hop, RnB"
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <label className="text-[11px] uppercase font-bold text-white/40 tracking-widest pl-1">Location</label>
                                <div className="relative group flex gap-3">
                                    <div className="relative flex-1">
                                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-visio-teal transition-colors" />
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="City"
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            placeholder="Country"
                                            className="w-full bg-black/40 border border-white/5 rounded-2xl py-3.5 px-5 text-white placeholder-white/20 focus:outline-none focus:border-visio-teal/50 focus:ring-1 focus:ring-visio-teal/50 transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Support & Security Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Support Card */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 flex flex-col justify-between shadow-xl">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <HelpCircle size={16} className="text-blue-400" strokeWidth={2} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white/90">Support & Help</h2>
                                </div>
                                <p className="text-white/40 text-sm leading-relaxed">
                                    Live chat is temporarily removed for platform upgrades. Please reach out via email and our support team will respond promptly.
                                </p>
                            </div>
                            <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
                                <span className="text-white/60 text-sm font-mono tracking-wide">admin@visiocorp.co</span>
                                <a
                                    href="mailto:admin@visiocorp.co"
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors border border-white/5 hover:border-white/10"
                                >
                                    <ArrowUpRight size={18} />
                                </a>
                            </div>
                        </div>

                        {/* Security Card */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 flex flex-col shadow-xl">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                                        <Shield size={16} className="text-purple-400" strokeWidth={2} />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white/90">Security Settings</h2>
                                </div>
                                <p className="text-white/40 text-sm leading-relaxed">
                                    Manage your account security and authentication preferences.
                                </p>
                            </div>
                            
                            <div className="pt-4 mt-auto border-t border-white/5">
                                <button
                                    onClick={() => alert("Password reset functionality is handled via your email provider for this beta.")}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 text-white/70 group-hover:text-white transition-colors text-sm font-medium">
                                        <Lock size={16} className="text-white/40 group-hover:text-white/80 transition-colors" />
                                        Reset Password
                                    </div>
                                    <ArrowUpRight size={16} className="text-white/20 group-hover:text-white/60 transition-colors" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-12 pb-4 flex flex-col items-center justify-center space-y-2">
                    <div className="w-12 h-1 rounded-full bg-white/10 mb-4" />
                    <p className="text-center text-white/20 text-xs font-medium tracking-widest uppercase">Visio Lead Gen</p>
                    <p className="text-center text-white/10 text-[10px] font-mono">v1.2.0 • Premium Build</p>
                </div>
            </div>

            {/* Identity Check Modal */}
            {showIdentityModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" />
                    
                    {/* Modal Content */}
                    <div className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-visio-teal/10 flex items-center justify-center border border-visio-teal/20">
                                    <Shield size={16} className="text-visio-teal" />
                                </div>
                                <h3 className="text-xl font-bold text-white/90">Identity Verification</h3>
                            </div>
                            <p className="text-white/50 text-sm leading-relaxed">
                                We ran a quick web search to verify your artist profile: <span className="text-white font-medium bg-white/5 px-2 py-0.5 rounded-md ml-1">{identityQuery}</span>
                            </p>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            {identityLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                    <div className="w-8 h-8 border-2 border-visio-teal/20 border-t-visio-teal rounded-full animate-spin" />
                                    <p className="text-white/40 text-sm font-medium animate-pulse">Searching public records...</p>
                                </div>
                            ) : identityResults.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                        <Search size={20} className="text-white/20" />
                                    </div>
                                    <p className="text-white/60 text-sm max-w-sm">No obvious public results found. This is normal for emerging artists. You can still confirm your identity or skip.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Search Results</h4>
                                    {identityResults.map((result, idx) => (
                                        <div key={`${result.link}-${idx}`} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300">
                                            <div className="text-sm font-semibold text-white/90 group-hover:text-visio-teal transition-colors leading-tight mb-2">
                                                {result.title}
                                            </div>
                                            {result.snippet && (
                                                <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{result.snippet}</p>
                                            )}
                                            <a
                                                href={result.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-[11px] text-visio-teal/70 hover:text-visio-teal mt-3 font-medium tracking-wide uppercase transition-colors"
                                            >
                                                View Source <ArrowUpRight size={12} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {identityError && (
                                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-3">
                                    <HelpCircle size={16} className="mt-0.5 shrink-0" />
                                    <p>{identityError}</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <p className="text-xs text-white/30 text-center sm:text-left">
                                This helps us tailor your lead generation.
                            </p>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <button
                                    onClick={() => handleIdentityDecision(false)}
                                    className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Not Me / Skip
                                </button>
                                <button
                                    onClick={() => handleIdentityDecision(true)}
                                    className="flex-1 sm:flex-none px-6 py-3 text-sm font-bold rounded-xl bg-visio-teal text-black shadow-[0_0_15px_rgba(0,255,255,0.15)] hover:shadow-[0_0_25px_rgba(0,255,255,0.25)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    Yes, That's Me
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
