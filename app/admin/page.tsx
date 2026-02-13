'use client';

import React, { useEffect, useState } from 'react';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Loader2, CheckCircle, XCircle, Shield, Search, Users, Zap, LayoutDashboard, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

// Types
interface AdminUser {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string;
    app_metadata: {
        provider?: string;
        approved?: boolean;
    };
    user_metadata: {
        full_name?: string;
    };
    subscription?: {
        subscription_tier: string;
        subscription_status: string;
    } | null;
}

interface LeadRequest {
    id: string;
    content: string;
    created_at: string;
    session: {
        user_id: string;
    };
    user_email?: string;
    user_name?: string;
}

export default function AdminPage() {
    const [view, setView] = useState<'users' | 'leads'>('users');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [leads, setLeads] = useState<LeadRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [viewerEmail, setViewerEmail] = useState<string>('');

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            setViewerEmail(session?.user?.email || '');
            if (!token) throw new Error("No session found");

            const headers = { 'Authorization': `Bearer ${token}` };

            // Parallel Fetch
            const [usersRes, leadsRes] = await Promise.all([
                fetch('/api/admin/users', { headers }),
                fetch('/api/admin/leads', { headers })
            ]);

            const readError = async (res: Response) => {
                try {
                    const data = await res.json();
                    return (data?.error || data?.message || res.statusText || 'Request failed') as string;
                } catch {
                    return res.statusText || 'Request failed';
                }
            };

            // Users are required for the page to make sense; bail hard on failure.
            if (!usersRes.ok) {
                let errorMsg = await readError(usersRes);
                if (errorMsg.toLowerCase().includes('service role')) {
                    errorMsg = 'Server misconfigured: missing SUPABASE_SERVICE_ROLE_KEY (required for admin user listing).';
                }
                setError(errorMsg);
                setLoading(false);
                return;
            }

            // Leads are optional; show users even if leads fail.
            const usersData = await usersRes.json().catch(() => ({}));
            const leadsData = leadsRes.ok ? await leadsRes.json().catch(() => ({})) : {};

            setUsers(usersData.users || []);
            setLeads(leadsData.leads || []);

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleApproval = async (userId: string, currentStatus: boolean) => {
        // Optimistic update
        setUsers(prev => prev.map(u =>
            u.id === userId
                ? { ...u, app_metadata: { ...u.app_metadata, approved: !currentStatus } }
                : u
        ));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            await fetch('/api/admin/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, approved: !currentStatus })
            });
        } catch (err) {
            // Revert
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, app_metadata: { ...u.app_metadata, approved: currentStatus } }
                    : u
            ));
            alert("Failed to update status");
        }
    };

    const handleUpdateSubscription = async (userId: string, tier: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/update-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, tier, status: 'active' })
            });

            if (!res.ok) throw new Error('Failed to update');

            // Optimistic / Reload
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, subscription: { ...u.subscription!, subscription_tier: tier, subscription_status: 'active' } }
                    : u
            ));

        } catch (err) {
            alert('Failed to update subscription');
            console.error(err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.user_metadata?.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    // Only render safe content
    if (error) {
        // If undefined session/auth error, show login button but don't auto-redirect to avoid loops if session is flaky
        if (error === "No session found") {
            return (
                <div className="min-h-screen bg-visio-bg flex flex-col items-center justify-center gap-4 text-white font-outfit">
                    <Loader2 className="animate-spin text-visio-teal w-8 h-8" />
                    <p>Session check failed. Please log in again.</p>
                    <button onClick={() => window.location.href = '/auth'} className="px-6 py-2 bg-visio-teal text-black rounded-lg font-bold hover:bg-visio-teal/90 transition-colors">Log In</button>
                    <button onClick={() => window.location.href = '/'} className="text-white/40 text-sm hover:text-white">Back to Home</button>
                    <div className="mt-4 text-xs text-white/20 font-mono">
                        Debug: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen bg-visio-bg flex items-center justify-center text-white font-outfit">
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-red-500/20 max-w-md w-full">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Access Restricted</h1>
                    <p className="text-white/60 mb-6 font-mono text-sm bg-black/20 p-2 rounded break-all">{error}</p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => window.location.href = '/auth'}
                            className="px-4 py-3 bg-visio-teal text-black font-bold rounded-xl hover:bg-visio-teal/90 transition-colors"
                        >
                            Switch Account
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-4 py-3 bg-white/5 text-white/60 font-medium rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                        >
                            Return Home
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-white/5 text-left text-xs text-white/30">
                        <p className="font-mono mb-2">Debug Info:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Error Message:</strong> {error}</li>
                            <li><strong>Signed In As:</strong> {viewerEmail || 'unknown'}</li>
                            <li><strong>Session Status:</strong> {loading ? 'Checking...' : 'Loaded'}</li>
                            <li><strong>Environment:</strong> {process.env.NODE_ENV}</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit flex">
            <BackgroundBeams className="fixed inset-0 z-0 opacity-20 pointer-events-none" />

            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 p-6 flex flex-col z-10 bg-visio-bg/50 backdrop-blur-xl fixed h-full">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-8 h-8 bg-visio-teal rounded-lg flex items-center justify-center">
                        <Shield size={18} className="text-black" />
                    </div>
                    <span className="font-bold text-lg">Admin</span>
                </div>

                <nav className="space-y-2 flex-1">
                    <button
                        onClick={() => setView('users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${view === 'users' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <Users size={18} />
                        Users & Access
                    </button>
                    <button
                        onClick={() => setView('leads')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${view === 'leads' ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                        <Zap size={18} />
                        Lead Requests
                    </button>
                </nav>

                <div className="mt-auto px-4 py-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-visio-teal to-purple-500" />
                        <div>
                            <p className="text-xs font-bold">Admin User</p>
                            <p className="text-[10px] text-white/40">Super Admin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-10 z-10">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">{view === 'users' ? 'User Management' : 'Live Lead Requests'}</h1>
                        <p className="text-white/50">{view === 'users' ? 'Manage approvals and subscriptions' : 'Real-time feed of user generation requests'}</p>
                    </div>

                    <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Reload Data">
                        <Loader2 size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </header>

                <AnimatePresence mode="wait">
                    {view === 'users' ? (
                        <motion.div
                            key="users"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-2">Total Users</p>
                                    <p className="text-3xl font-bold">{users.length}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-2">Pending</p>
                                    <p className="text-3xl font-bold text-yellow-400">{users.filter(u => !u.app_metadata?.approved).length}</p>
                                </div>
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-2">Premium</p>
                                    <p className="text-3xl font-bold text-visio-teal">{users.filter(u => u.subscription?.subscription_tier && u.subscription.subscription_tier !== 'artist').length}</p>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-visio-teal/50 transition-colors"
                                />
                            </div>

                            {/* Table */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-white/40 uppercase tracking-wider font-medium">
                                        <tr>
                                            <th className="p-4 pl-6">User</th>
                                            <th className="p-4">Plan</th>
                                            <th className="p-4 text-center">Status</th>
                                            <th className="p-4 text-right pr-6">Access</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map(user => {
                                            const isApproved = user.app_metadata?.approved === true;
                                            const isPremium = user.subscription?.subscription_tier && user.subscription?.subscription_tier !== 'artist';
                                            const currentTier = user.subscription?.subscription_tier || 'artist';

                                            return (
                                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                                    <td className="p-4 pl-6">
                                                        <div className="font-medium text-white">{user.user_metadata?.full_name || 'Unknown'}</div>
                                                        <div className="text-white/50 text-xs">{user.email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={currentTier}
                                                            onChange={(e) => {
                                                                if (confirm(`Change plan for ${user.email} to ${e.target.value}?`)) {
                                                                    handleUpdateSubscription(user.id, e.target.value);
                                                                }
                                                            }}
                                                            className={`bg-white/5 border border-white/10 rounded-lg text-xs px-2 py-1 focus:outline-none focus:border-visio-teal ${isPremium ? 'text-visio-teal' : 'text-white/60'}`}
                                                        >
                                                            <option value="artist">Artist (Free)</option>
                                                            <option value="starter">Starter</option>
                                                            <option value="artiste">Artiste</option>
                                                            <option value="starter_label">Starter Label</option>
                                                            <option value="label">Label Pro</option>
                                                            <option value="agency">Agency</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isApproved
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                                            }`}>
                                                            {isApproved ? 'Approved' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right pr-6">
                                                        <button
                                                            onClick={() => toggleApproval(user.id, isApproved)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isApproved
                                                                ? 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
                                                                : 'bg-visio-teal text-black hover:bg-visio-teal/90'
                                                                }`}
                                                        >
                                                            {isApproved ? 'Revoke' : 'Approve Access'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredUsers.length === 0 && <div className="p-8 text-center text-white/40">No users match your search.</div>}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="leads"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {/* Lead Stream */}
                            <div className="grid grid-cols-1 gap-4">
                                {leads.map((lead) => (
                                    <div key={lead.id} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-visio-teal/30 transition-colors group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white">{lead.user_name || 'Anonymous User'}</p>
                                                    <p className="text-xs text-white/50">{lead.user_email}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs text-white/30 font-mono">
                                                {new Date(lead.created_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 relative">
                                            <MessageSquare size={16} className="absolute top-4 right-4 text-visio-teal opacity-50" />
                                            <p className="text-white/80 italic">"{lead.content}"</p>
                                        </div>

                                        <div className="mt-4 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="text-xs text-white/40 hover:text-white px-3 py-2">Archive</button>
                                            <button className="bg-visio-teal text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-110">Process Lead</button>
                                        </div>
                                    </div>
                                ))}
                                {leads.length === 0 && (
                                    <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                                        <p className="text-white/40 mb-2">No active lead requests.</p>
                                        <p className="text-xs text-white/20">Requests will appear here when users ask for leads.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
