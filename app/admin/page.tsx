'use client';

import React, { useEffect, useState } from 'react';
import { BackgroundBeams } from '../components/ui/background-beams';
import { Loader2, CheckCircle, XCircle, Shield, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';

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
}

export default function AdminPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const res = await fetch('/api/admin/users', {
                headers: {
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });

            if (res.status === 401) {
                setError("Unauthorized. Are you logged in as Admin?");
                setLoading(false);
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch users');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
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

            const res = await fetch('/api/admin/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ userId, approved: !currentStatus })
            });
            if (!res.ok) throw new Error('Update failed');
        } catch (err) {
            // Revert on error
            setUsers(prev => prev.map(u =>
                u.id === userId
                    ? { ...u, app_metadata: { ...u.app_metadata, approved: currentStatus } }
                    : u
            ));
            alert("Failed to update user status");
        }
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.user_metadata?.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-visio-bg flex items-center justify-center text-white">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-visio-bg flex items-center justify-center text-white font-outfit">
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-red-500/20">
                    <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                    <p className="text-white/60">{error}</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit p-8">
            <BackgroundBeams className="fixed inset-0 z-0 opacity-20 pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Shield className="text-visio-teal" />
                            Admin Console
                        </h1>
                        <p className="text-white/50 mt-1">Manage user access and approvals</p>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-visio-teal/50 transition-colors w-64"
                        />
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 text-white/40 uppercase tracking-wider font-medium">
                            <tr>
                                <th className="p-4 pl-6">User</th>
                                <th className="p-4">Created</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right pr-6">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map(user => {
                                const isApproved = user.app_metadata?.approved === true;
                                return (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-medium text-white">{user.user_metadata?.full_name || 'Unknown'}</div>
                                            <div className="text-white/50 text-xs">{user.email}</div>
                                        </td>
                                        <td className="p-4 text-white/60">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isApproved
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
                                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                                    : 'bg-visio-teal text-black hover:bg-visio-teal/90'
                                                    }`}
                                            >
                                                {isApproved ? 'Revoke' : 'Approve'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="p-12 text-center text-white/40">
                            No users found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
