import React, { useState } from 'react';
import { ArrowLeft, User, Mail, Lock, LogOut, Home, ArrowUpRight } from 'lucide-react';
import { Subscription } from '../types';

interface SettingsPageProps {
    subscription: Subscription;
    onBack: () => void;
    onNavigateHome: () => void;
    onLogout: () => void;
}

import { ArtistProfile } from '../types';

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
    return (
        <div className="flex-1 h-full overflow-y-auto bg-visio-bg text-white p-6 md:p-10 font-outfit">
            <div className="max-w-3xl mx-auto space-y-10">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
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
                                <h3 className="font-bold text-lg">Home Page</h3>
                                <p className="text-white/50 text-sm">Return to the landing page</p>
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
                                    defaultValue={artistProfile?.name || ''}
                                    placeholder="Your Name"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-visio-teal/50"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-white/40 tracking-widest">Email Address</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                    type="email"
                                    defaultValue={artistProfile?.socials?.website || ''}
                                    placeholder="email@example.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-visio-teal/50"
                                />
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
        </div>
    );
};
