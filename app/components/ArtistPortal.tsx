import React, { useState, useRef, useEffect } from 'react';
import { Upload, Music, Save, Youtube, Instagram, Twitter, Globe, FileUser, Disc, Check, Link as LinkIcon, BarChart3, Target, X, Plus, Trash2, Play, Calendar, ExternalLink } from 'lucide-react';
import { loadArtistProfile, saveArtistProfile } from '@/lib/data-service';
import { VisioOrb } from './VisioOrb';
import { ArtistProfile, ArtistAnalytics, MetricPoint, ArtistGoals } from '../types';
import { ShinyButton } from './ui/ShinyButton';
import { ArtistDashboard } from './ArtistDashboard';
import { BrandOverview } from './BrandOverview';
import { GoalsObjectives } from './GoalsObjectives';
import { Subscription, SubscriptionTier } from '../types';
import { PLAN_LIMITS } from '../config/plans';
import { UpgradeModal } from './UpgradeModal';

// Mock Generator Removed

const ZERO_ANALYTICS: ArtistAnalytics = {
    totalFollowers: 0,
    totalReach: 0,
    totalStreams: 0,
    instagram: {
        followers: 0,
        reach: [],
        posts: []
    },
    spotify: {
        monthlyListeners: 0,
        streams: [],
        topRegions: [],
        playlists: []
    }
};

const DEFAULT_PROFILE: ArtistProfile = {
    name: "",
    genre: "",
    description: "",
    socials: { instagram: "", twitter: "", youtube: "", website: "" },
    connectedAccounts: {},
    similarArtists: [],
    milestones: { instagramFollowers: 0, monthlyListeners: 0 },
    location: { city: "", country: "" },
    promotionalFocus: "Streaming",
    careerHighlights: [],
    lifeHighlights: [],
    desiredCommunities: []
};

// Sample releases
const DEFAULT_RELEASES: any[] = [];

// Sample EPK files
const DEFAULT_FILES: any[] = [];

export const ArtistPortal = ({ subscription, onUpgrade, onRedoOnboarding }: { subscription?: Subscription, onUpgrade: () => void, onRedoOnboarding: () => void }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'brand' | 'goals' | 'profile' | 'media' | 'releases' | 'connections'>('dashboard');
    const [isSaving, setIsSaving] = useState(false);
    const [profile, setProfile] = useState<ArtistProfile>(DEFAULT_PROFILE);
    const [analytics, setAnalytics] = useState<ArtistAnalytics>(ZERO_ANALYTICS);
    const [showPublicProfile, setShowPublicProfile] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState(DEFAULT_FILES);
    const [releases, setReleases] = useState(DEFAULT_RELEASES);
    const [showAddRelease, setShowAddRelease] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeFeature, setUpgradeFeature] = useState('');
    const [requiredTier, setRequiredTier] = useState<SubscriptionTier>('label');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const limits = PLAN_LIMITS[subscription?.tier || 'artist'];

    const handleAddProfile = () => {
        // Mock current profiles count = 1 (since we only have 1 active)
        const currentProfiles = 1;
        if (currentProfiles >= limits.maxProfiles) {
            setUpgradeFeature('Multiple Artist Profiles');
            setRequiredTier('label');
            setShowUpgradeModal(true);
        } else {
            // Logic to add profile
            alert('Add Profile Feature');
        }
    };


    // Load from Storage
    useEffect(() => {
        const load = async () => {
            const saved = await loadArtistProfile();
            if (saved) {
                setProfile(saved);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        const success = await saveArtistProfile(profile);

        // Trigger update event for main chat to pick up changes
        window.dispatchEvent(new Event('artistProfileUpdated'));

        setIsSaving(false);
        if (success) {
            alert('Profile saved! Context updated.');
        } else {
            alert('Failed to save profile. Please try again.');
        }
    };

    // Mock Connect Handler
    const handleConnect = (platform: keyof ArtistProfile['connectedAccounts']) => {
        const isConnected = profile.connectedAccounts?.[platform];
        if (isConnected) {
            if (confirm(`Disconnect ${platform}?`)) {
                setProfile(prev => ({
                    ...prev,
                    connectedAccounts: { ...prev.connectedAccounts, [platform]: false }
                }));
            }
        } else {
            // Simulate OAuth Window
            const width = 600;
            const height = 700;
            const left = (window.innerWidth - width) / 2;
            const top = (window.innerHeight - height) / 2;

            const newWindow = window.open('', '_blank', `width=${width},height=${height},top=${top},left=${left}`);
            if (newWindow) {
                newWindow.document.write(`<div style="background:#000;color:#fff;height:100%;display:flex;align-items:center;justify-content:center;font-family:sans-serif;"><h1>Connecting to ${platform}...</h1><p>Please wait...</p></div>`);

                setTimeout(() => {
                    newWindow.close();
                    setProfile(prev => ({
                        ...prev,
                        connectedAccounts: { ...prev.connectedAccounts, [platform]: true }
                    }));
                    alert(`Successfully connected to ${platform}!`);
                }, 1500);
            }
        }
    };

    // File upload handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            const newFile = {
                id: crypto.randomUUID(),
                name: file.name,
                size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
                uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            };
            setUploadedFiles(prev => [...prev, newFile]);
        }
    };

    // Delete file handler
    const handleDeleteFile = (fileId: string) => {
        if (confirm('Delete this file?')) {
            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
        }
    };

    // Delete release handler
    const handleDeleteRelease = (releaseId: string) => {
        if (confirm('Delete this release?')) {
            setReleases(prev => prev.filter(r => r.id !== releaseId));
        }
    };

    // Add release handler
    const handleAddRelease = (newRelease: { title: string; type: string; releaseDate: string }) => {
        const release = {
            id: crypto.randomUUID(),
            ...newRelease,
            coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
            streams: 0
        };
        setReleases(prev => [release, ...prev]);
        setShowAddRelease(false);
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-8 pb-10">

                {/* Header */}
                <div className="flex items-end justify-between border-b border-white/5 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <span className="p-2 bg-visio-accent text-black rounded-lg"><Music size={24} /></span>
                            Artist Portal
                        </h1>
                        <p className="text-white/40 max-w-lg">
                            Manage your verified artist profile. Upload EPKs, press releases, and music for our database to index.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleAddProfile}
                        className="px-4 py-2 rounded-xl bg-visio-accent text-black hover:scale-105 transition-transform text-sm font-bold flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Artist
                    </button>
                    <button
                        onClick={() => setShowPublicProfile(true)}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <ExternalLink size={14} />
                        View Public Profile
                    </button>
                    <button
                        onClick={onRedoOnboarding}
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <Calendar size={14} />
                        Redo Questionnaire
                    </button>
                    <ShinyButton
                        text={isSaving ? "Saving..." : "Save Changes"}
                        onClick={handleSave}
                        className="bg-visio-teal text-black font-bold"
                    />
                </div>
            </div>

            {/* Stats / Status Cards (Only show on Profile/Media tabs, hide on Dashboard to avoid clutter) */}
            {activeTab !== 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-visio-teal/20 flex items-center justify-center text-visio-teal">
                            <FileUser size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">EPK Status</h3>
                            <p className="text-visio-accent text-xs font-medium">Active • {uploadedFiles.length} file(s)</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <Disc size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Latest Release</h3>
                            <p className="text-white/40 text-xs">{releases[0]?.title || 'No releases yet'}</p>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Globe size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-semibold">Bio Visibility</h3>
                            <p className="text-white/40 text-xs">Private (Draft)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-white/5 text-sm font-medium overflow-x-auto">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    Profile & Bio
                </button>
                <button
                    onClick={() => setActiveTab('brand')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'brand' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    <span className="flex items-center gap-1.5"><BarChart3 size={14} /> Brand</span>
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'goals' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    <span className="flex items-center gap-1.5"><Target size={14} /> Goals</span>
                </button>
                <button
                    onClick={() => setActiveTab('connections')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'connections' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    Connections
                </button>
                <button
                    onClick={() => setActiveTab('media')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'media' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    EPK & Media
                </button>
                <button
                    onClick={() => setActiveTab('releases')}
                    className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'releases' ? 'border-visio-accent text-white' : 'border-transparent text-white/40 hover:text-white'}`}
                >
                    Releases
                </button>
            </div>

            {/* Content Area */}
            <div className="mt-8">
                {activeTab === 'dashboard' && <ArtistDashboard analytics={analytics} />}

                {activeTab === 'brand' && <BrandOverview profile={profile} analytics={analytics} />}

                {activeTab === 'goals' && (
                    <GoalsObjectives
                        profile={profile}
                        onUpdate={(goals) => setProfile(prev => ({ ...prev, goals }))}
                    />
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Artist Name</label>
                                <input
                                    type="text"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Genre</label>
                                <input
                                    type="text"
                                    value={profile.genre}
                                    onChange={(e) => setProfile({ ...profile, genre: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Location (City, Country)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="City"
                                        value={profile.location.city}
                                        onChange={(e) => setProfile({ ...profile, location: { ...profile.location, city: e.target.value } })}
                                        className="w-1/2 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Country Code (e.g. ZA)"
                                        value={profile.location.country}
                                        onChange={(e) => setProfile({ ...profile, location: { ...profile.location, country: e.target.value } })}
                                        className="w-1/2 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Milestones</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="IG Followers"
                                        value={profile.milestones.instagramFollowers || ''}
                                        onChange={(e) => setProfile({ ...profile, milestones: { ...profile.milestones, instagramFollowers: parseInt(e.target.value) } })}
                                        className="w-1/2 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Monthly Listeners"
                                        value={profile.milestones.monthlyListeners || ''}
                                        onChange={(e) => setProfile({ ...profile, milestones: { ...profile.milestones, monthlyListeners: parseInt(e.target.value) } })}
                                        className="w-1/2 bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Similar Artists (Comma Separated)</label>
                            <input
                                type="text"
                                placeholder="e.g. Black Coffee, Goldfish"
                                value={profile.similarArtists.join(', ')}
                                onChange={(e) => setProfile({ ...profile, similarArtists: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Bio</label>
                            <textarea
                                rows={4}
                                value={profile.description}
                                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Social Links</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative group">
                                    <Instagram size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text"
                                        placeholder="Instagram URL"
                                        value={profile.socials?.instagram || ''}
                                        onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, instagram: e.target.value } })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white/80 focus:border-pink-500/50 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div className="relative group">
                                    <Twitter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text"
                                        placeholder="Twitter/X URL"
                                        value={profile.socials?.twitter || ''}
                                        onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, twitter: e.target.value } })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white/80 focus:border-blue-400/50 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div className="relative group">
                                    <Youtube size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text"
                                        placeholder="YouTube URL"
                                        value={profile.socials?.youtube || ''}
                                        onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, youtube: e.target.value } })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white/80 focus:border-red-500/50 focus:outline-none transition-colors"
                                    />
                                </div>
                                <div className="relative group">
                                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="text"
                                        placeholder="Website URL"
                                        value={profile.socials?.website || ''}
                                        onChange={(e) => setProfile({ ...profile, socials: { ...profile.socials, website: e.target.value } })}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white/80 focus:border-visio-teal/50 focus:outline-none transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Career Highlights */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Career Highlights</label>
                            <p className="text-[10px] text-white/30">Key achievements in your music career (press enter after each)</p>
                            <textarea
                                rows={3}
                                placeholder="e.g. Featured on Spotify's Synthwave Essentials, Opened for The Midnight in 2024"
                                value={(profile.careerHighlights || []).join('\n')}
                                onChange={(e) => setProfile({ ...profile, careerHighlights: e.target.value.split('\n').filter(s => s.trim()) })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        {/* Life Highlights */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Life Highlights</label>
                            <p className="text-[10px] text-white/30">Personal experiences that shape your artistry (press enter after each)</p>
                            <textarea
                                rows={3}
                                placeholder="e.g. Grew up in Cape Town's music scene, Self-taught producer since age 16"
                                value={(profile.lifeHighlights || []).join('\n')}
                                onChange={(e) => setProfile({ ...profile, lifeHighlights: e.target.value.split('\n').filter(s => s.trim()) })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors resize-none"
                            />
                        </div>

                        {/* Desired Communities */}
                        <div className="space-y-2">
                            <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Communities You Want to Be Part Of</label>
                            <p className="text-[10px] text-white/30">Artists, collectives, or scenes you'd like to connect with (comma separated)</p>
                            <input
                                type="text"
                                placeholder="e.g. LA Synthwave Scene, Berlin Electronic Collective, Indie Labels Network"
                                value={(profile.desiredCommunities || []).join(', ')}
                                onChange={(e) => setProfile({ ...profile, desiredCommunities: e.target.value.split(',').map(s => s.trim()).filter(s => s) })}
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'connections' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 fade-in duration-300">

                        {/* Instagram */}
                        <ConnectionCard
                            platform="instagram"
                            name="Instagram"
                            icon={<Instagram size={32} />}
                            isConnected={profile.connectedAccounts?.instagram}
                            color="from-pink-500 to-purple-500"
                            onToggle={() => handleConnect('instagram')}
                        />

                        {/* Twitter/X */}
                        <ConnectionCard
                            platform="twitter"
                            name="X (Twitter)"
                            icon={<Twitter size={32} />}
                            isConnected={profile.connectedAccounts?.twitter}
                            color="from-gray-400 to-gray-600"
                            onToggle={() => handleConnect('twitter')}
                        />

                        {/* TikTok */}
                        <ConnectionCard
                            platform="tiktok"
                            name="TikTok"
                            icon={<Music size={32} />}
                            isConnected={profile.connectedAccounts?.tiktok}
                            color="from-cyan-400 to-pink-500"
                            onToggle={() => handleConnect('tiktok')}
                        />

                        {/* YouTube */}
                        <ConnectionCard
                            platform="youtube"
                            name="YouTube"
                            icon={<Youtube size={32} />}
                            isConnected={profile.connectedAccounts?.youtube}
                            color="from-red-500 to-red-600"
                            onToggle={() => handleConnect('youtube')}
                        />

                        {/* Spotify */}
                        <ConnectionCard
                            platform="spotify"
                            name="Spotify"
                            icon={<Disc size={32} />}
                            isConnected={profile.connectedAccounts?.spotify}
                            color="from-green-400 to-green-600"
                            onToggle={() => handleConnect('spotify')}
                        />

                        {/* Apple Music */}
                        <ConnectionCard
                            platform="appleMusic"
                            name="Apple Music"
                            icon={<Music size={32} />}
                            isConnected={profile.connectedAccounts?.appleMusic}
                            color="from-red-400 to-pink-500"
                            onToggle={() => handleConnect('appleMusic')}
                        />

                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.zip"
                            className="hidden"
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-visio-card border border-visio-border rounded-2xl p-8 border-dashed flex flex-col items-center justify-center gap-4 hover:bg-white/5 transition-colors cursor-pointer group"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/5 group-hover:bg-visio-teal/20 transition-colors flex items-center justify-center">
                                <Upload size={32} className="text-white/30 group-hover:text-visio-teal" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">Upload EPK or Press Release</h3>
                                <p className="text-sm text-white/40 mt-1">PDF, DOCX, or ZIP (Max 50MB)</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-white/60">Uploaded Files</h3>
                            {uploadedFiles.length === 0 ? (
                                <p className="text-white/30 text-sm">No files uploaded yet.</p>
                            ) : (
                                uploadedFiles.map(file => (
                                    <div key={file.id} className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-500/10 text-red-400 rounded-lg">
                                                <FileUser size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm text-white font-medium">{file.name}</p>
                                                <p className="text-xs text-white/30">{file.size} • Uploaded {file.uploadDate}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteFile(file.id)}
                                            className="text-white/20 hover:text-red-400 transition-colors flex items-center gap-1"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'releases' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">Your Releases</h3>
                            <button
                                onClick={() => setShowAddRelease(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-visio-accent text-black rounded-xl font-medium hover:scale-105 transition-transform"
                            >
                                <Plus size={16} />
                                Add Release
                            </button>
                        </div>

                        {releases.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                                <Disc size={48} className="mx-auto text-white/20 mb-4" />
                                <p className="text-white/40">No releases yet. Add your first release!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {releases.map(release => (
                                    <div key={release.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 group hover:border-white/20 transition-colors">
                                        <div className="flex gap-4">
                                            <img src={release.coverArt} alt={release.title} className="w-20 h-20 rounded-xl object-cover" />
                                            <div className="flex-1">
                                                <h4 className="text-white font-semibold">{release.title}</h4>
                                                <p className="text-white/40 text-sm">{release.type}</p>
                                                <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
                                                    <Calendar size={12} />
                                                    <span>{new Date(release.releaseDate).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-visio-accent">
                                                    <Play size={12} />
                                                    <span>{release.streams.toLocaleString()} streams</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRelease(release.id)}
                                                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions (Hide on Dashboard) */}
            {activeTab !== 'dashboard' && (
                <div className="fixed bottom-8 right-8 z-30">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        {isSaving ? (
                            <>
                                <VisioOrb active={true} size="sm" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            )}



            {/* Public Profile Modal */}
            {
                showPublicProfile && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl">
                            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white">Public Profile Preview</h2>
                                <button onClick={() => setShowPublicProfile(false)} className="text-white/40 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Profile Header */}
                                <div className="text-center">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-visio-teal to-visio-accent mx-auto flex items-center justify-center text-3xl font-bold text-black">
                                        {profile.name.charAt(0)}
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mt-4">{profile.name}</h3>
                                    <p className="text-visio-accent">{profile.genre}</p>
                                    <p className="text-white/40 text-sm">{profile.location.city}, {profile.location.country}</p>
                                </div>
                                {/* Bio */}
                                <div>
                                    <h4 className="text-xs uppercase text-white/40 font-bold mb-2">About</h4>
                                    <p className="text-white/80 text-sm">{profile.description}</p>
                                </div>
                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{profile.milestones.instagramFollowers?.toLocaleString() || 0}</p>
                                        <p className="text-xs text-white/40">IG Followers</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 text-center">
                                        <p className="text-2xl font-bold text-white">{profile.milestones.monthlyListeners?.toLocaleString() || 0}</p>
                                        <p className="text-xs text-white/40">Monthly Listeners</p>
                                    </div>
                                </div>
                                {/* Similar Artists */}
                                <div>
                                    <h4 className="text-xs uppercase text-white/40 font-bold mb-2">Similar Artists</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {profile.similarArtists.map((artist, i) => (
                                            <span key={i} className="px-3 py-1 bg-white/5 rounded-full text-white/60 text-sm">{artist}</span>
                                        ))}
                                    </div>
                                </div>
                                {/* Connected Platforms */}
                                <div>
                                    <h4 className="text-xs uppercase text-white/40 font-bold mb-2">Connected Platforms</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(profile.connectedAccounts || {}).filter(([_, v]) => v).map(([platform]) => (
                                            <span key={platform} className="px-3 py-1 bg-visio-accent/20 text-visio-accent rounded-full text-sm capitalize">{platform}</span>
                                        ))}
                                        {Object.values(profile.connectedAccounts || {}).filter(v => v).length === 0 && (
                                            <span className="text-white/30 text-sm">No platforms connected</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Release Modal */}
            {
                showAddRelease && (
                    <AddReleaseModal onClose={() => setShowAddRelease(false)} onAdd={handleAddRelease} />
                )
            }

            {/* Upgrade Modal */}
            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                feature={upgradeFeature}
                requiredTier={requiredTier}
                onUpgrade={() => {
                    setShowUpgradeModal(false);
                    onUpgrade();
                }}
            />
        </div >
    );
};

// Sub-component for Cards
const ConnectionCard = ({ platform, name, icon, isConnected, color, onToggle }: any) => {
    return (
        <div className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${isConnected ? 'bg-white/10 border-visio-accent' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-br ${color}`} />

            <div className="relative p-6 flex flex-col items-center text-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isConnected ? `bg-gradient-to-br ${color} text-white shadow-lg` : 'bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white group-hover:scale-110'}`}>
                    {icon}
                </div>

                <div>
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                    <p className="text-xs text-white/40">{isConnected ? 'Connected' : 'Not connected'}</p>
                </div>

                <ShinyButton
                    text={isConnected ? "Disconnect" : "Connect"}
                    className={`${isConnected ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'} w-full`}
                    onClick={onToggle}
                />
            </div>
        </div>
    );
}

// Add Release Modal
const AddReleaseModal = ({ onClose, onAdd }: { onClose: () => void; onAdd: (r: any) => void }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('Single');
    const [releaseDate, setReleaseDate] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && releaseDate) {
            onAdd({ title, type, releaseDate });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl max-w-md w-full shadow-2xl">
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Add New Release</h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter release title"
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold">Type</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none"
                        >
                            <option value="Single">Single</option>
                            <option value="EP">EP</option>
                            <option value="Album">Album</option>
                            <option value="Mixtape">Mixtape</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-white/40 uppercase font-bold">Release Date</label>
                        <input
                            type="date"
                            value={releaseDate}
                            onChange={(e) => setReleaseDate(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:border-visio-accent focus:outline-none"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-visio-accent text-black py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                        Add Release
                    </button>
                </form>
            </div>
        </div>
    );
}
