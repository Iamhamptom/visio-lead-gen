'use client';

import React, { useState } from 'react';
import { ArrowRight, Loader2, Mail, Lock, Github, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { saveArtistProfile } from '@/lib/data-service';
import { ArtistProfile } from '../types';

interface AuthPageProps {
    onComplete: () => void;
    initialMode?: 'signin' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onComplete, initialMode = 'signup' }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (mode === 'signup') {
                // Sign up with email and password
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name || email.split('@')[0]
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    // Check if email confirmation is required
                    if (data.user.identities?.length === 0) {
                        setError('This email is already registered. Please sign in instead.');
                        setIsLoading(false);
                        return;
                    }

                    // Create initial profile with sign-up name
                    const initialProfile: ArtistProfile = {
                        name: name || email.split('@')[0],
                        genre: '',
                        description: '',
                        socials: { email },
                        connectedAccounts: {},
                        similarArtists: [],
                        milestones: { instagramFollowers: 0, monthlyListeners: 0 },
                        location: { city: '', country: '' },
                        promotionalFocus: 'Streaming',
                        careerHighlights: [],
                        lifeHighlights: [],
                        desiredCommunities: []
                    };
                    await saveArtistProfile(initialProfile);

                    onComplete();
                }
            } else {
                // Sign in with email and password
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                if (data.user) {
                    onComplete();
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple' | 'github') => {
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            });

            if (error) throw error;
        } catch (err: any) {
            console.error(`${provider} auth error:`, err);
            setError(err.message || `${provider} authentication failed.`);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center text-white font-outfit relative overflow-hidden p-6">
            {/* Ambient Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-visio-teal/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-visio-accent/10 rounded-full blur-[128px] pointer-events-none" />

            <div className="relative z-10 w-full max-w-[420px] glass-panel rounded-3xl p-10 shadow-2xl">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-visio-teal to-visio-sage text-black font-extrabold text-2xl mb-6 shadow-[0_0_20px_rgba(45,212,191,0.3)]">V</div>
                    <h1 className="text-3xl font-bold mb-3 tracking-tight text-white text-glow">
                        {mode === 'signup' ? 'Join Visio' : 'Welcome Back'}
                    </h1>
                    <p className="text-white/40 text-sm font-medium tracking-wide">
                        {mode === 'signup'
                            ? 'The future of music management is here.'
                            : 'Access your AI command center.'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {mode === 'signup' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-visio-teal uppercase tracking-[0.2em] ml-1">Your Name</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Artist / Label Name"
                                    className="w-full glass-input rounded-xl py-4 pl-4 pr-4 text-white placeholder:text-white/20 focus:border-visio-teal/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-visio-teal/50 text-sm font-medium"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-visio-teal uppercase tracking-[0.2em] ml-1">Email Access</label>
                        <div className="relative group">
                            <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-visio-teal transition-colors" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="artist@label.com"
                                className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:border-visio-teal/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-visio-teal/50 text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-visio-teal uppercase tracking-[0.2em] ml-1">Secure Pass</label>
                        <div className="relative group">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-visio-teal transition-colors" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full glass-input rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-white/20 focus:border-visio-teal/50 focus:bg-white/5 focus:outline-none focus:ring-1 focus:ring-visio-teal/50 text-sm font-medium"
                            />
                        </div>
                        {mode === 'signup' && (
                            <p className="text-white/30 text-xs ml-1">Minimum 6 characters</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-visio-teal to-visio-sage text-black font-bold text-base tracking-wide hover:shadow-[0_0_30px_rgba(182,240,156,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <>
                                {mode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 flex flex-col gap-4">
                    <div className="relative flex items-center justify-center mb-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                        <span className="relative bg-[#050505] px-4 text-[10px] font-bold tracking-widest text-white/20 uppercase">Or Continue With</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <button
                            onClick={() => handleSocialLogin('google')}
                            disabled={isLoading}
                            className="py-3 rounded-xl glass-input hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium text-white/80 group disabled:opacity-50 hover:border-visio-teal/30"
                            title="Sign in with Google"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleSocialLogin('apple')}
                            disabled={isLoading}
                            className="py-3 rounded-xl glass-input hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium text-white/80 group disabled:opacity-50 hover:border-visio-teal/30"
                            title="Sign in with Apple"
                        >
                            <svg className="w-5 h-5 fill-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24.02-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08 7.4 1.11 0 2.12-.91 2.48-.91.56.09 3.03.22 4.63 1.88-2.58 2.03-1.63 5.45-.66 6.64.13.18.23.36.33.53.53 1.34-1.37 3.32-1.87 2.43zM12.03 7.25c-.15-2.45 2.13-4.52 4.1-4.72.33 2.5-2.3 4.88-4.1 4.72z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => handleSocialLogin('github')}
                            disabled={isLoading}
                            className="py-3 rounded-xl glass-input hover:bg-white/5 transition-all flex items-center justify-center gap-2 text-sm font-medium text-white/80 group disabled:opacity-50 hover:border-visio-teal/30"
                            title="Sign in with Github"
                        >
                            <Github size={20} className="group-hover:text-white transition-colors group-hover:scale-110" />
                        </button>
                    </div>
                </div>

                <div className="mt-10 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'signup' ? 'signin' : 'signup');
                            setError(null);
                        }}
                        className="text-white/30 hover:text-visio-teal text-sm font-medium transition-colors"
                    >
                        {mode === 'signup' ? 'Already have access? ' : "Need an account? "}
                        <span className="text-visio-teal underline decoration-visio-teal/30 underline-offset-4 hover:decoration-visio-teal transition-all">
                            {mode === 'signup' ? 'Log in' : 'Sign up'}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
};
