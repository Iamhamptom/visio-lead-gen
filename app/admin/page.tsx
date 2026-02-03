'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Users, Search, BarChart3, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

// Types
interface AdminStats {
    totalUsers: number;
    totalSearches: number;
    activeSubs: number;
}

interface SearchLog {
    id: string;
    query: string;
    country: string;
    results_count: number;
    created_at: string;
    user_email?: string;
}

interface UserProfile {
    id: string;
    email: string; // We might not get this from profiles depending on schema
    subscription_tier: string;
    created_at: string;
}

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalSearches: 0, activeSubs: 0 });
    const [recentSearches, setRecentSearches] = useState<SearchLog[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // simple email check for MVP security
    const ADMIN_EMAILS = ['hamptonmusicgroup@gmail.com', 'admin@visio.ai'];

    useEffect(() => {
        if (!loading) {
            if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
                // Redirect or show access denied
                // router.push('/'); // Uncomment to enforce
                // For demo, we might allow it or just show state
                setIsAdmin(ADMIN_EMAILS.includes(user?.email || ''));
            } else {
                setIsAdmin(true);
            }
            fetchData();
        }
    }, [user, loading]);

    const fetchData = async () => {
        try {
            // 1. Fetch Stats
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: searchCount } = await supabase.from('search_logs').select('*', { count: 'exact', head: true });

            // 2. Fetch Recent Searches
            const { data: logs } = await supabase
                .from('search_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            // 3. Fetch Users (Profiles)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            setStats({
                totalUsers: userCount || 0,
                totalSearches: searchCount || 0,
                activeSubs: 0 // Need sub status query
            });

            setRecentSearches(logs || []);
            setUsers(profiles?.map(p => ({
                id: p.id,
                email: 'View in Supabase', // Profile table might not have email, auth does
                subscription_tier: p.subscription_tier || 'Free',
                created_at: p.created_at
            })) || []);

        } catch (e) {
            console.error('Admin fetch error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    if (loading || isLoading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
                <ShieldAlert size={48} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-white/50 mt-2">You do not have permission to view this page.</p>
                <button onClick={() => router.push('/')} className="mt-6 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20">Go Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-outfit">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-visio-teal to-visio-sage">Admin Dashboard</h1>
                    <p className="text-white/40 mt-1">Platform overview and logs</p>
                </div>
                <div className="px-3 py-1 bg-visio-teal/10 rounded-full border border-visio-teal/20 text-visio-teal text-xs font-mono">
                    LIVE MODE
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <StatsCard icon={<Users className="text-blue-400" />} label="Total Users" value={stats.totalUsers} />
                <StatsCard icon={<Search className="text-purple-400" />} label="Total Searches" value={stats.totalSearches} />
                <StatsCard icon={<BarChart3 className="text-green-400" />} label="Avg Searches/User" value={(stats.totalSearches / (stats.totalUsers || 1)).toFixed(1)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Searches */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Search size={20} className="text-visio-teal" />
                        Live Search Feed
                    </h2>
                    <div className="space-y-4">
                        {recentSearches.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <p className="font-medium text-white/90">"{log.query}"</p>
                                    <p className="text-xs text-white/40">{new Date(log.created_at).toLocaleString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded">{log.country}</span>
                                    <p className="text-xs text-white/40 mt-1">{log.results_count} hits</p>
                                </div>
                            </div>
                        ))}
                        {recentSearches.length === 0 && <p className="text-white/30 text-center py-4">No searches recorded yet.</p>}
                    </div>
                </div>

                {/* Recent Users */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Users size={20} className="text-visio-sage" />
                        Recent Signups
                    </h2>
                    <div className="space-y-4">
                        {users.map((u) => (
                            <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs ml-0">
                                        {u.id.substring(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white/80 font-mono text-sm">{u.id.slice(0, 8)}...</p>
                                        <p className="text-xs text-white/40">{new Date(u.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded border ${u.subscription_tier !== 'Free' ? 'bg-visio-teal/20 border-visio-teal/30 text-visio-teal' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                    {u.subscription_tier}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const StatsCard = ({ icon, label, value }: { icon: any, label: string, value: string | number }) => (
    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors">
        <div className="p-3 bg-white/5 rounded-xl">
            {icon}
        </div>
        <div>
            <p className="text-white/40 text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
    </div>
);
