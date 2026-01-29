'use client';

import React, { useState, useEffect } from 'react';
import {
    Users,
    BarChart3,
    Settings,
    Shield,
    Search,
    MoreHorizontal,
    ArrowUpRight,
    DollarSign,
    TrendingUp,
    Activity,
    UserCheck,
    CreditCard
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

// Mock Data
const USER_DATA = [
    { id: '1', name: 'Neon Horizon', email: 'neon@example.com', plan: 'Artist', status: 'Active', joined: '2 days ago', spend: '$0' },
    { id: '2', name: 'Atlas Mgmt', email: 'team@atlas.co', plan: 'Agency', status: 'Active', joined: '1 week ago', spend: '$249' },
    { id: '3', name: 'Sony Music SA', email: 'reps@sony.com', plan: 'Enterprise', status: 'Active', joined: '2 weeks ago', spend: '$2,500' },
    { id: '4', name: 'Indie Collective', email: 'collect@indie.co', plan: 'Label', status: 'Past Due', joined: '1 month ago', spend: '$99' },
    { id: '5', name: 'Sarah J', email: 'sarah@gmail.com', plan: 'Artist', status: 'Trialing', joined: '2 hours ago', spend: '$0' },
];

const REVENUE_DATA = [
    { name: 'Jan', revenue: 4000, users: 240 },
    { name: 'Feb', revenue: 3000, users: 1398 },
    { name: 'Mar', revenue: 2000, users: 3800 },
    { name: 'Apr', revenue: 2780, users: 3908 },
    { name: 'May', revenue: 1890, users: 4800 },
    { name: 'Jun', revenue: 2390, users: 3800 },
    { name: 'Jul', revenue: 3490, users: 4300 },
];

const ADMIN_EMAILS = ['hampton@hgaradio.co.za', 'admin@visio.ai'];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Mock Admin Check
        // In real app, check session/token
        // For verify, we'll assume the developer is admin or we check specific email
        // Just setting to true for verify for now, or check localStorage
        const userEmail = 'hampton@hgaradio.co.za'; // Mock current user
        if (ADMIN_EMAILS.includes(userEmail)) {
            setIsAdmin(true);
        }
        setIsLoading(false);
    }, []);

    if (isLoading) return <div className="min-h-screen bg-visio-bg flex items-center justify-center text-white">Loading...</div>;

    if (!isAdmin) return (
        <div className="min-h-screen bg-visio-bg flex items-center justify-center text-white">
            <div className="text-center space-y-4">
                <Shield size={48} className="mx-auto text-red-500" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-white/50">You do not have permission to view this page.</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit flex">

            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-black/20 p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-8 h-8 rounded bg-gradient-to-br from-visio-teal to-visio-accent flex items-center justify-center text-black font-bold">V</div>
                    <span className="font-bold text-xl">Visio Admin</span>
                </div>

                <nav className="space-y-2 flex-1">
                    <SidebarItem
                        icon={BarChart3}
                        label="Overview"
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                    />
                    <SidebarItem
                        icon={Users}
                        label="Users"
                        active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                    />
                    <SidebarItem
                        icon={Settings}
                        label="Settings"
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                    />
                </nav>

                <div className="pt-6 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-visio-accent flex items-center justify-center text-black font-bold">H</div>
                        <div>
                            <p className="font-bold text-sm">Hampton</p>
                            <p className="text-xs text-white/50">Super Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 sticky top-0 z-10 backdrop-blur-md">
                    <h1 className="text-xl font-bold capitalize">{activeTab}</h1>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-visio-accent"
                            />
                        </div>
                        <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <Settings size={16} />
                        </button>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'users' && <UsersTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </main>
        </div>
    );
}

// Tabs

const OverviewTab = () => (
    <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
                label="Total Revenue"
                value="$12,450"
                change="+12%"
                icon={DollarSign}
                color="text-green-400"
            />
            <StatCard
                label="Active Users"
                value="1,240"
                change="+5%"
                icon={Users}
                color="text-blue-400"
            />
            <StatCard
                label="New Signups"
                value="145"
                change="+18%"
                icon={UserCheck}
                color="text-visio-accent"
            />
            <StatCard
                label="Churn Rate"
                value="2.4%"
                change="-0.5%"
                icon={Activity}
                color="text-purple-400"
            />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-6">Revenue Growth</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={REVENUE_DATA}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                            <YAxis stroke="rgba(255,255,255,0.5)" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.1)', color: '#FFF' }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#8884d8" fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-lg font-bold mb-6">User Acquisition</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={REVENUE_DATA}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                            <YAxis stroke="rgba(255,255,255,0.5)" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.1)', color: '#FFF' }}
                            />
                            <Line type="monotone" dataKey="users" stroke="#00FFE0" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
);

const UsersTab = () => (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
            <thead className="bg-black/20 border-b border-white/10">
                <tr>
                    <th className="p-4 text-xs font-bold uppercase text-white/50">User</th>
                    <th className="p-4 text-xs font-bold uppercase text-white/50">Plan</th>
                    <th className="p-4 text-xs font-bold uppercase text-white/50">Status</th>
                    <th className="p-4 text-xs font-bold uppercase text-white/50">Spend</th>
                    <th className="p-4 text-xs font-bold uppercase text-white/50">Joined</th>
                    <th className="p-4 text-xs font-bold uppercase text-white/50 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
                {USER_DATA.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                            <div>
                                <p className="font-bold text-white">{user.name}</p>
                                <p className="text-xs text-white/50">{user.email}</p>
                            </div>
                        </td>
                        <td className="p-4">
                            <span className={`
                                px-2 py-1 rounded text-xs font-medium
                                ${user.plan === 'Enterprise' ? 'bg-purple-500/20 text-purple-300' :
                                    user.plan === 'Agency' ? 'bg-visio-accent/20 text-visio-accent' :
                                        'bg-white/10 text-white/70'}
                            `}>
                                {user.plan}
                            </span>
                        </td>
                        <td className="p-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-400' : user.status === 'Trialing' ? 'bg-blue-400' : 'bg-red-400'}`} />
                                <span className="text-sm text-white/70">{user.status}</span>
                            </div>
                        </td>
                        <td className="p-4 text-white/70">{user.spend}</td>
                        <td className="p-4 text-white/50 text-sm">{user.joined}</td>
                        <td className="p-4 text-right">
                            <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white">
                                <MoreHorizontal size={16} />
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const SettingsTab = () => (
    <div className="max-w-2xl space-y-8">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Platform Configuration</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                    <div>
                        <p className="font-medium text-white">Maintenance Mode</p>
                        <p className="text-sm text-white/50">Disable access for non-admins</p>
                    </div>
                    <div className="w-12 h-6 bg-white/10 rounded-full relative cursor-pointer">
                        <div className="w-4 h-4 bg-white/50 rounded-full absolute top-1 left-1" />
                    </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                    <div>
                        <p className="font-medium text-white">New Signups</p>
                        <p className="text-sm text-white/50">Allow new users to register</p>
                    </div>
                    <div className="w-12 h-6 bg-green-500/20 rounded-full relative cursor-pointer border border-green-500/50">
                        <div className="w-4 h-4 bg-green-400 rounded-full absolute top-1 right-1" />
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Payout Settings</h3>
            <p className="text-white/50 mb-6">Configure Stitch integration for automated payouts.</p>
            <button className="flex items-center gap-2 bg-visio-accent text-black px-4 py-2 rounded-lg font-bold">
                <CreditCard size={16} />
                Manage Banking
            </button>
        </div>
    </div>
);

// Components

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${active ? 'bg-white/10 text-white font-medium' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
    >
        <Icon size={18} />
        {label}
    </button>
);

const StatCard = ({ label, value, change, icon: Icon, color }: { label: string, value: string, change: string, icon: any, color: string }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
        <div className="flex items-start justify-between mb-4">
            <div>
                <p className="text-white/50 text-sm font-medium uppercase tracking-wider mb-1">{label}</p>
                <h3 className="text-3xl font-bold text-white">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg bg-black/20 ${color}`}>
                <Icon size={20} />
            </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
            <TrendingUp size={14} className={change.startsWith('+') ? 'text-green-400' : 'text-red-400'} />
            <span className={change.startsWith('+') ? 'text-green-400' : 'text-red-400'}>{change}</span>
            <span className="text-white/30 ml-1">vs last month</span>
        </div>
    </div>
);
