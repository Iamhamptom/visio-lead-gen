'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { BackgroundBeams } from '../components/ui/background-beams';
import {
    Loader2, CheckCircle, XCircle, Shield, Search, Users, Zap, LayoutDashboard,
    MessageSquare, ArrowLeft, Save, UserCheck, BarChart3, Activity, Clock, TrendingUp
} from 'lucide-react';
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
    billing?: {
        paidInvoices: number;
        totalPaid: number;
        lastPaidAt: string | null;
        lastPaidTier: string | null;
    } | null;
}

interface LeadRequest {
    id: string;
    content: string;
    created_at: string;
    status?: string;
    results_count?: number;
    results?: any[];
    user_id?: string;
    session_id?: string;
    session?: {
        user_id: string;
    };
    user_email?: string;
    user_name?: string;
}

// Pending changes tracker
interface PendingChange {
    userId: string;
    field: 'tier' | 'status' | 'approval';
    value: string | boolean;
    label: string;
}

type AdminView = 'users' | 'approved' | 'analytics' | 'leads';

const formatZar = (amountInCents: number) =>
    `R${(amountInCents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPage() {
    const [view, setView] = useState<AdminView>('users');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [leads, setLeads] = useState<LeadRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [viewerEmail, setViewerEmail] = useState<string>('');
    const [buildInfo, setBuildInfo] = useState<any>(null);
    const [dbHealth, setDbHealth] = useState<any>(null);
    const [envDebug, setEnvDebug] = useState<any>(null);
    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [processingLeads, setProcessingLeads] = useState<Set<string>>(new Set());
    const [sendingLeads, setSendingLeads] = useState<Set<string>>(new Set());

    // Show toast briefly
    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    const loadDiagnostics = async () => {
        try {
            const [buildRes, dbRes] = await Promise.all([
                fetch('/api/build-info').then(r => r.ok ? r.json() : null).catch(() => null),
                fetch('/api/health/db').then(r => r.ok ? r.json() : null).catch(() => null)
            ]);
            setBuildInfo(buildRes);
            setDbHealth(dbRes);
        } catch {
            // ignore
        }
    };

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let token = session?.access_token;
            setViewerEmail(session?.user?.email || '');

            if (!token) {
                try {
                    await supabase.auth.refreshSession();
                    const refreshed = await supabase.auth.getSession();
                    token = refreshed.data.session?.access_token;
                    setViewerEmail(refreshed.data.session?.user?.email || '');
                } catch {
                    // ignore
                }
            }

            if (!token) throw new Error("No session found");

            const headers = { 'Authorization': `Bearer ${token}` };

            fetch('/api/debug-env', { headers })
                .then(r => r.ok ? r.json() : null)
                .then(data => setEnvDebug(data))
                .catch(() => setEnvDebug(null));

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

            if (!usersRes.ok) {
                let errorMsg = await readError(usersRes);
                const lower = errorMsg.toLowerCase();
                if (lower.includes('missing next_public_supabase_url') || lower.includes('missing supabase url')) {
                    errorMsg = 'Server misconfigured: missing Supabase env vars on Vercel (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY).';
                } else if (lower.includes('sb_publishable_') || lower.includes('publishable/anon')) {
                    errorMsg = 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is set to the publishable/anon key. In Vercel, set SUPABASE_SERVICE_ROLE_KEY to the Supabase secret/service key (starts with sb_secret_), then redeploy.';
                } else if (lower.includes('user not allowed')) {
                    errorMsg = 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY is wrong on Vercel (admin APIs return "User not allowed"). Set it to the Supabase secret/service key (starts with sb_secret_), then redeploy.';
                }
                setError(errorMsg);
                setLoading(false);
                return;
            }

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
        loadDiagnostics();
        fetchData();
    }, []);

    // Auto-refresh leads tab every 15 seconds
    useEffect(() => {
        if (view !== 'leads') return;
        const interval = setInterval(() => fetchData(), 15000);
        return () => clearInterval(interval);
    }, [view]);

    // Queue a change for batch saving
    const queueChange = (change: PendingChange) => {
        setPendingChanges(prev => {
            // Replace existing change for same user+field
            const filtered = prev.filter(c => !(c.userId === change.userId && c.field === change.field));
            return [...filtered, change];
        });
        setSaveSuccess(false);
    };

    const toggleApproval = (userId: string, currentStatus: boolean) => {
        const user = users.find(u => u.id === userId);
        // Optimistic UI update
        setUsers(prev => prev.map(u =>
            u.id === userId
                ? { ...u, app_metadata: { ...u.app_metadata, approved: !currentStatus } }
                : u
        ));
        queueChange({
            userId,
            field: 'approval',
            value: !currentStatus,
            label: `${user?.email || userId}: ${!currentStatus ? 'Approve' : 'Revoke'}`
        });
    };

    const handleTierChange = (userId: string, newTier: string, currentStatus: string) => {
        const user = users.find(u => u.id === userId);
        setUsers(prev => prev.map(u =>
            u.id === userId
                ? { ...u, subscription: { subscription_tier: newTier, subscription_status: currentStatus } }
                : u
        ));
        queueChange({
            userId,
            field: 'tier',
            value: newTier,
            label: `${user?.email || userId}: Plan -> ${newTier}`
        });
    };

    const handleStatusChange = (userId: string, currentTier: string, newStatus: string) => {
        const user = users.find(u => u.id === userId);
        setUsers(prev => prev.map(u =>
            u.id === userId
                ? { ...u, subscription: { subscription_tier: currentTier, subscription_status: newStatus } }
                : u
        ));
        queueChange({
            userId,
            field: 'status',
            value: newStatus,
            label: `${user?.email || userId}: Status -> ${newStatus}`
        });
    };

    // ── Lead Actions ────────────────────────────────────────
    const handleArchiveLead = async (leadId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        try {
            await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadRequestId: leadId, action: 'archive' }),
            });
            setLeads(prev => prev.filter(l => l.id !== leadId));
            showToast('Lead request archived');
        } catch {
            showToast('Failed to archive lead');
        }
    };

    const handleProcessLead = async (leadId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        setProcessingLeads(prev => new Set(prev).add(leadId));

        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadRequestId: leadId, action: 'process' }),
            });
            const data = await res.json();
            if (data.success) {
                showToast(`Lead processed: ${data.resultsCount} contacts found`);
                fetchData();
            } else {
                showToast(`Error: ${data.error}`);
            }
        } catch {
            showToast('Failed to process lead');
        } finally {
            setProcessingLeads(prev => {
                const next = new Set(prev);
                next.delete(leadId);
                return next;
            });
        }
    };

    const handleSendToUser = async (leadId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        setSendingLeads(prev => new Set(prev).add(leadId));

        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadRequestId: leadId, action: 'send' }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('Leads sent to user! They will see them on next load.');
            } else {
                showToast(`Error: ${data.error}`);
            }
        } catch {
            showToast('Failed to send leads to user');
        } finally {
            setSendingLeads(prev => {
                const next = new Set(prev);
                next.delete(leadId);
                return next;
            });
        }
    };

    // Save all pending changes
    const saveAllChanges = async () => {
        if (pendingChanges.length === 0) return;
        setSaving(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('No session');

            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // Group changes by type and execute
            const approvalChanges = pendingChanges.filter(c => c.field === 'approval');
            const subChanges = pendingChanges.filter(c => c.field === 'tier' || c.field === 'status');

            // Execute approval changes
            for (const change of approvalChanges) {
                await fetch('/api/admin/approve', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ userId: change.userId, approved: change.value })
                });
            }

            // Execute subscription changes (group by userId)
            const subByUser = new Map<string, { tier?: string; status?: string }>();
            for (const change of subChanges) {
                const existing = subByUser.get(change.userId) || {};
                if (change.field === 'tier') existing.tier = change.value as string;
                if (change.field === 'status') existing.status = change.value as string;
                subByUser.set(change.userId, existing);
            }

            for (const [userId, updates] of subByUser) {
                const user = users.find(u => u.id === userId);
                const tier = updates.tier || user?.subscription?.subscription_tier || 'artist';
                const status = updates.status || user?.subscription?.subscription_status || 'active';
                await fetch('/api/admin/update-subscription', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ userId, tier, status })
                });
            }

            setPendingChanges([]);
            setSaveSuccess(true);
            showToast(`Saved ${approvalChanges.length + subByUser.size} change(s) successfully`);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error(err);
            showToast('Failed to save some changes. Please retry.');
        } finally {
            setSaving(false);
        }
    };

    const filteredUsers = users.filter((u) => {
        const q = search.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const name = (u.user_metadata?.full_name || '').toLowerCase();
        return email.includes(q) || name.includes(q);
    });

    // Computed analytics
    const analytics = useMemo(() => {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const totalUsers = users.length;
        const approvedUsers = users.filter(u => u.app_metadata?.approved).length;
        const pendingUsers = totalUsers - approvedUsers;
        const premiumUsers = users.filter(u => u.subscription?.subscription_tier && u.subscription.subscription_tier !== 'artist').length;

        // Signups by time
        const signupsToday = users.filter(u => new Date(u.created_at) >= dayAgo).length;
        const signupsThisWeek = users.filter(u => new Date(u.created_at) >= weekAgo).length;
        const signupsThisMonth = users.filter(u => new Date(u.created_at) >= monthAgo).length;

        // Active users (last sign in)
        const activeToday = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= dayAgo).length;
        const activeThisWeek = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= weekAgo).length;

        // Tier distribution
        const tierCounts: Record<string, number> = {};
        users.forEach(u => {
            const tier = u.subscription?.subscription_tier || 'artist';
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });

        // Status distribution
        const statusCounts: Record<string, number> = {};
        users.forEach(u => {
            const status = u.subscription?.subscription_status || 'active';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        // Provider distribution
        const providerCounts: Record<string, number> = {};
        users.forEach(u => {
            const provider = u.app_metadata?.provider || 'email';
            providerCounts[provider] = (providerCounts[provider] || 0) + 1;
        });

        const totalPaidCents = users.reduce((sum, u) => sum + (u.billing?.totalPaid || 0), 0);
        const payingCustomers = users.filter(u => (u.billing?.paidInvoices || 0) > 0).length;

        return {
            totalUsers, approvedUsers, pendingUsers, premiumUsers,
            signupsToday, signupsThisWeek, signupsThisMonth,
            activeToday, activeThisWeek,
            tierCounts, statusCounts, providerCounts,
            totalPaidCents, payingCustomers,
            leadRequests: leads.length,
        };
    }, [users, leads]);

    const approvedUsers = useMemo(() =>
        users.filter(u => u.app_metadata?.approved === true),
        [users]
    );

    // Error states
    if (error) {
        if (error === "No session found") {
            return (
                <div className="min-h-screen bg-visio-bg flex flex-col items-center justify-center gap-4 text-white font-outfit">
                    <Loader2 className="animate-spin text-visio-teal w-8 h-8" />
                    <p>Session check failed. Please log in again.</p>
                    <button onClick={() => window.location.href = '/auth'} className="px-6 py-2 bg-visio-teal text-black rounded-lg font-bold hover:bg-visio-teal/90 transition-colors">Log In</button>
                    <button onClick={() => window.location.href = '/'} className="text-white/40 text-sm hover:text-white">Back to Home</button>
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
                        <button onClick={() => { setError(null); fetchData(); }} className="px-4 py-3 bg-white/5 text-white/80 font-medium rounded-xl hover:bg-white/10 hover:text-white transition-colors">Retry</button>
                        <button onClick={() => window.location.href = '/auth'} className="px-4 py-3 bg-visio-teal text-black font-bold rounded-xl hover:bg-visio-teal/90 transition-colors">Switch Account</button>
                        <button onClick={() => window.location.href = '/'} className="px-4 py-3 bg-white/5 text-white/60 font-medium rounded-xl hover:bg-white/10 hover:text-white transition-colors">Return Home</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit flex">
            <BackgroundBeams className="fixed inset-0 z-0 opacity-20 pointer-events-none" />

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-6 right-6 z-50 px-4 py-3 bg-visio-teal/90 text-black text-sm font-bold rounded-xl shadow-2xl"
                    >
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 p-6 flex flex-col z-10 bg-visio-bg/50 backdrop-blur-xl fixed h-full">
                {/* Back Button */}
                <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors text-sm mb-4 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to App
                </button>

                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-8 h-8 bg-visio-teal rounded-lg flex items-center justify-center">
                        <Shield size={18} className="text-black" />
                    </div>
                    <span className="font-bold text-lg">Admin</span>
                </div>

                <nav className="space-y-2 flex-1">
                    {([
                        { key: 'users' as AdminView, icon: Users, label: 'Users & Access' },
                        { key: 'approved' as AdminView, icon: UserCheck, label: 'Approved Accounts' },
                        { key: 'analytics' as AdminView, icon: BarChart3, label: 'User Analytics' },
                        { key: 'leads' as AdminView, icon: Zap, label: 'Lead Requests' },
                    ]).map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setView(item.key)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${view === item.key ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                            <item.icon size={18} />
                            {item.label}
                            {item.key === 'approved' && (
                                <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">{approvedUsers.length}</span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Pending Changes Indicator */}
                {pendingChanges.length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <p className="text-yellow-400 text-xs font-bold mb-1">{pendingChanges.length} unsaved change{pendingChanges.length > 1 ? 's' : ''}</p>
                        <button
                            onClick={saveAllChanges}
                            disabled={saving}
                            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 bg-visio-teal text-black text-xs font-bold rounded-lg hover:bg-visio-teal/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? 'Saving...' : 'Save All Changes'}
                        </button>
                    </div>
                )}

                <div className="px-4 py-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-visio-teal to-purple-500" />
                        <div>
                            <p className="text-xs font-bold truncate max-w-[140px]">{viewerEmail || 'Admin'}</p>
                            <p className="text-[10px] text-white/40">Super Admin</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 ml-64 p-10 z-10">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">
                            {view === 'users' ? 'User Management' :
                                view === 'approved' ? 'Approved Accounts' :
                                    view === 'analytics' ? 'User Analytics' :
                                        'Live Lead Requests'}
                        </h1>
                        <p className="text-white/50">
                            {view === 'users' ? 'Manage approvals and subscriptions' :
                                view === 'approved' ? 'All approved platform users' :
                                    view === 'analytics' ? 'Platform usage and growth metrics' :
                                        'Real-time feed of user generation requests'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Save Changes Button (always visible when changes exist) */}
                        {pendingChanges.length > 0 && (
                            <button
                                onClick={saveAllChanges}
                                disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-visio-teal text-black text-sm font-bold rounded-xl hover:bg-visio-teal/90 transition-colors disabled:opacity-50 shadow-lg shadow-visio-teal/20"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : `Save ${pendingChanges.length} Change${pendingChanges.length > 1 ? 's' : ''}`}
                            </button>
                        )}
                        {saveSuccess && (
                            <span className="flex items-center gap-1 text-emerald-400 text-sm font-medium">
                                <CheckCircle size={16} /> Saved
                            </span>
                        )}
                        <button onClick={fetchData} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Reload Data">
                            <Loader2 size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {/* ═══ USERS VIEW ═══ */}
                    {view === 'users' && (
                        <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            {/* Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">Total Users</p>
                                    <p className="text-3xl font-bold">{users.length}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">Approved</p>
                                    <p className="text-3xl font-bold text-emerald-400">{analytics.approvedUsers}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">Pending</p>
                                    <p className="text-3xl font-bold text-yellow-400">{analytics.pendingUsers}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">Premium</p>
                                    <p className="text-3xl font-bold text-visio-teal">{analytics.premiumUsers}</p>
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
                                            <th className="p-4">Sub Status</th>
                                            <th className="p-4">Last Active</th>
                                            <th className="p-4">Paid History</th>
                                            <th className="p-4 text-center">Approval</th>
                                            <th className="p-4 text-right pr-6">Access</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map(user => {
                                            const isApproved = user.app_metadata?.approved === true;
                                            const isPremium = user.subscription?.subscription_tier && user.subscription?.subscription_tier !== 'artist';
                                            const currentTier = user.subscription?.subscription_tier || 'artist';
                                            const currentStatus = user.subscription?.subscription_status || 'active';
                                            const hasPendingChange = pendingChanges.some(c => c.userId === user.id);
                                            const totalPaid = user.billing?.totalPaid || 0;
                                            const paidInvoices = user.billing?.paidInvoices || 0;
                                            const lastPaidAt = user.billing?.lastPaidAt
                                                ? new Date(user.billing.lastPaidAt).toLocaleDateString()
                                                : null;

                                            return (
                                                <tr key={user.id} className={`hover:bg-white/5 transition-colors ${hasPendingChange ? 'bg-yellow-500/5' : ''}`}>
                                                    <td className="p-4 pl-6">
                                                        <div className="font-medium text-white">{user.user_metadata?.full_name || 'Unknown'}</div>
                                                        <div className="text-white/50 text-xs">{user.email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <select
                                                            value={currentTier}
                                                            onChange={(e) => handleTierChange(user.id, e.target.value, currentStatus)}
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
                                                    <td className="p-4">
                                                        <select
                                                            value={currentStatus}
                                                            onChange={(e) => handleStatusChange(user.id, currentTier, e.target.value)}
                                                            className={`bg-white/5 border border-white/10 rounded-lg text-xs px-2 py-1 focus:outline-none focus:border-visio-teal ${currentStatus === 'active' ? 'text-emerald-400' : currentStatus === 'trialing' ? 'text-yellow-400' : currentStatus === 'past_due' ? 'text-orange-400' : 'text-red-400'}`}
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="trialing">Trialing</option>
                                                            <option value="canceled">Canceled</option>
                                                            <option value="past_due">Past Due</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="text-xs text-white/40">
                                                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={`text-xs font-medium ${paidInvoices > 0 ? 'text-visio-teal' : 'text-white/60'}`}>
                                                            {formatZar(totalPaid)}
                                                        </div>
                                                        <div className="text-[11px] text-white/35">
                                                            {paidInvoices > 0
                                                                ? `${paidInvoices} paid • ${lastPaidAt || 'date n/a'}`
                                                                : 'No paid invoices'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isApproved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                                            {isApproved ? 'Approved' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right pr-6">
                                                        <button
                                                            onClick={() => toggleApproval(user.id, isApproved)}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isApproved ? 'text-white/40 hover:text-red-400 hover:bg-red-500/10' : 'bg-visio-teal text-black hover:bg-visio-teal/90'}`}
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
                    )}

                    {/* ═══ APPROVED ACCOUNTS VIEW ═══ */}
                    {view === 'approved' && (
                        <motion.div key="approved" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                                    <p className="text-emerald-400 text-xs uppercase font-bold tracking-wider mb-1">Approved</p>
                                    <p className="text-3xl font-bold text-emerald-400">{approvedUsers.length}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">Premium</p>
                                    <p className="text-3xl font-bold text-visio-teal">
                                        {approvedUsers.filter(u => u.subscription?.subscription_tier && u.subscription.subscription_tier !== 'artist').length}
                                    </p>
                                </div>
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                    <p className="text-white/40 text-xs uppercase font-bold tracking-wider mb-1">Free Tier</p>
                                    <p className="text-3xl font-bold">
                                        {approvedUsers.filter(u => !u.subscription?.subscription_tier || u.subscription.subscription_tier === 'artist').length}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-white/40 uppercase tracking-wider font-medium">
                                        <tr>
                                            <th className="p-4 pl-6">User</th>
                                            <th className="p-4">Plan</th>
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Provider</th>
                                            <th className="p-4">Joined</th>
                                            <th className="p-4">Last Active</th>
                                            <th className="p-4 text-right pr-6">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {approvedUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-visio-teal/20 flex items-center justify-center text-emerald-400 text-xs font-bold">
                                                            {(user.user_metadata?.full_name || user.email)?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-white">{user.user_metadata?.full_name || 'Unknown'}</div>
                                                            <div className="text-white/50 text-xs">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${(user.subscription?.subscription_tier || 'artist') !== 'artist' ? 'bg-visio-teal/10 text-visio-teal' : 'bg-white/5 text-white/50'}`}>
                                                        {user.subscription?.subscription_tier || 'artist'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-xs ${(user.subscription?.subscription_status || 'active') === 'active' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                                        {user.subscription?.subscription_status || 'active'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs text-white/40 capitalize">{user.app_metadata?.provider || 'email'}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs text-white/40">{new Date(user.created_at).toLocaleDateString()}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-xs text-white/40">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</span>
                                                </td>
                                                <td className="p-4 text-right pr-6">
                                                    <button
                                                        onClick={() => toggleApproval(user.id, true)}
                                                        className="text-xs text-white/30 hover:text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                                                    >
                                                        Revoke
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {approvedUsers.length === 0 && (
                                    <div className="p-12 text-center text-white/40">
                                        <UserCheck size={32} className="mx-auto mb-3 opacity-30" />
                                        <p>No approved accounts yet.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ ANALYTICS VIEW ═══ */}
                    {view === 'analytics' && (
                        <motion.div key="analytics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            {/* Overview Cards */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-visio-teal/10 to-transparent border border-visio-teal/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users size={16} className="text-visio-teal" />
                                        <p className="text-visio-teal text-xs uppercase font-bold tracking-wider">Total Users</p>
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.totalUsers}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Activity size={16} className="text-emerald-400" />
                                        <p className="text-emerald-400 text-xs uppercase font-bold tracking-wider">Active Today</p>
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.activeToday}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp size={16} className="text-purple-400" />
                                        <p className="text-purple-400 text-xs uppercase font-bold tracking-wider">New This Week</p>
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.signupsThisWeek}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap size={16} className="text-yellow-400" />
                                        <p className="text-yellow-400 text-xs uppercase font-bold tracking-wider">Lead Requests</p>
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.leadRequests}</p>
                                </div>
                            </div>

                            {/* Growth & Activity */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Signups */}
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-visio-teal" /> Growth
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/60">Today</span>
                                            <span className="text-lg font-bold">{analytics.signupsToday} <span className="text-xs text-white/30">signups</span></span>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/60">This Week</span>
                                            <span className="text-lg font-bold">{analytics.signupsThisWeek} <span className="text-xs text-white/30">signups</span></span>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/60">This Month</span>
                                            <span className="text-lg font-bold">{analytics.signupsThisMonth} <span className="text-xs text-white/30">signups</span></span>
                                        </div>
                                        <div className="h-px bg-white/5" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-white/60">Active This Week</span>
                                            <span className="text-lg font-bold text-emerald-400">{analytics.activeThisWeek} <span className="text-xs text-white/30">users</span></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tier Distribution */}
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <BarChart3 size={16} className="text-purple-400" /> Plan Distribution
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(analytics.tierCounts).sort((a, b) => b[1] - a[1]).map(([tier, count]) => {
                                            const pct = analytics.totalUsers > 0 ? Math.round((count / analytics.totalUsers) * 100) : 0;
                                            const colors: Record<string, string> = {
                                                artist: 'bg-white/20', starter: 'bg-blue-400', artiste: 'bg-indigo-400',
                                                starter_label: 'bg-purple-400', label: 'bg-visio-teal', agency: 'bg-emerald-400', enterprise: 'bg-yellow-400'
                                            };
                                            return (
                                                <div key={tier}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="text-white/70 capitalize">{tier.replace('_', ' ')}</span>
                                                        <span className="text-white/40">{count} ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${colors[tier] || 'bg-white/30'}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Auth Providers & Status */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Auth Providers</h3>
                                    <div className="space-y-2">
                                        {Object.entries(analytics.providerCounts).sort((a, b) => b[1] - a[1]).map(([provider, count]) => (
                                            <div key={provider} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                                                <span className="text-sm text-white/70 capitalize">{provider}</span>
                                                <span className="text-sm font-bold">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-4">Subscription Status</h3>
                                    <div className="space-y-2">
                                        {Object.entries(analytics.statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                                            const statusColor: Record<string, string> = {
                                                active: 'text-emerald-400 bg-emerald-500/10',
                                                trialing: 'text-yellow-400 bg-yellow-500/10',
                                                canceled: 'text-red-400 bg-red-500/10',
                                                past_due: 'text-orange-400 bg-orange-500/10'
                                            };
                                            return (
                                                <div key={status} className={`flex justify-between items-center p-2 rounded-lg ${statusColor[status] || 'bg-white/5'}`}>
                                                    <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                                                    <span className="text-sm font-bold">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ LEADS VIEW ═══ */}
                    {view === 'leads' && (
                        <motion.div key="leads" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                {leads.filter(l => l.status !== 'archived').map((lead) => (
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
                                            <div className="flex items-center gap-3">
                                                {lead.status && (
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                        lead.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        lead.status === 'in_progress' || lead.status === 'admin_processing' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        lead.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                                        'bg-white/10 text-white/50'
                                                    }`}>
                                                        {lead.status === 'admin_processing' ? 'Processing...' : lead.status?.replace('_', ' ')}
                                                        {lead.results_count ? ` (${lead.results_count})` : ''}
                                                    </span>
                                                )}
                                                <span className="text-xs text-white/30 font-mono">
                                                    {new Date(lead.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-black/30 p-4 rounded-xl border border-white/5 relative">
                                            <MessageSquare size={16} className="absolute top-4 right-4 text-visio-teal opacity-50" />
                                            <p className="text-white/80 italic">&quot;{lead.content}&quot;</p>
                                        </div>
                                        <div className="mt-4 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleArchiveLead(lead.id)}
                                                className="text-xs text-white/40 hover:text-white px-3 py-2"
                                            >
                                                Archive
                                            </button>
                                            {lead.status === 'completed' && (lead.results_count || 0) > 0 && (
                                                <button
                                                    onClick={() => handleSendToUser(lead.id)}
                                                    disabled={sendingLeads.has(lead.id)}
                                                    className="bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
                                                >
                                                    {sendingLeads.has(lead.id) ? 'Sending...' : 'Send to User'}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleProcessLead(lead.id)}
                                                disabled={processingLeads.has(lead.id) || lead.status === 'admin_processing'}
                                                className="bg-visio-teal text-black text-xs font-bold px-4 py-2 rounded-lg hover:brightness-110 disabled:opacity-50"
                                            >
                                                {processingLeads.has(lead.id) || lead.status === 'admin_processing' ? (
                                                    <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Processing...</span>
                                                ) : 'Process Lead'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {leads.filter(l => l.status !== 'archived').length === 0 && (
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
