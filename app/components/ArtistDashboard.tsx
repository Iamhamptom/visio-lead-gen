import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { Upload, Users, Music, Activity, TrendingUp, Globe, MapPin, Share2, Heart, MessageCircle } from 'lucide-react';
import { ArtistAnalytics, MetricPoint } from '../types';
import { ShinyButton } from './ui/ShinyButton';

// Mock Data Generators
const generateTimeSeries = (days: number, startVal: number, volatility: number): MetricPoint[] => {
    const data: MetricPoint[] = [];
    let current = startVal;
    const now = new Date();
    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        current = current + (Math.random() - 0.3) * volatility; // slight upward trend
        data.push({
            date: date.toISOString().split('T')[0],
            value: Math.max(0, Math.floor(current))
        });
    }
    return data;
};

const MOCK_ANALYTICS: ArtistAnalytics = {
    totalFollowers: 124500,
    totalReach: 850000,
    totalStreams: 2100000,
    instagram: {
        followers: 45000,
        reach: generateTimeSeries(30, 2000, 500),
        posts: [
            { id: '1', image: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=500&h=500&fit=crop', likes: 1200, comments: 45 },
            { id: '2', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&h=500&fit=crop', likes: 2100, comments: 89 },
            { id: '3', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', likes: 3500, comments: 120 },
        ]
    },
    spotify: {
        monthlyListeners: 85000,
        streams: generateTimeSeries(30, 15000, 2000),
        topRegions: [
            { region: 'London, UK', listeners: 12500 },
            { region: 'Los Angeles, USA', listeners: 8900 },
            { region: 'Berlin, DE', listeners: 6200 },
            { region: 'Sydney, AU', listeners: 4100 },
            { region: 'Paris, FR', listeners: 3800 },
        ],
        playlists: [
            { name: 'Synthwave Essentials', followers: 250000 },
            { name: 'Night Drive', followers: 120000 },
            { name: 'Retro Future', followers: 85000 },
        ]
    }
};

export const ArtistDashboard = ({ analytics }: { analytics: ArtistAnalytics }) => {
    // CSV Parser Mock
    const handleFileUpload = () => {
        // In a real app, parse CSV here
        alert("Simulating CSV Import... Data updated.");
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Performance Overview</h2>
                    <p className="text-white/40 text-sm">Aggregated metrics from all connected platforms.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleFileUpload}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-white"
                    >
                        <Upload size={16} />
                        Import CSV
                    </button>
                    <ShinyButton text="Export Report" className="px-6 py-2 bg-visio-teal text-white" />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    label="Total Streams"
                    value={analytics.totalStreams.toLocaleString()}
                    trend="+0%"
                    icon={<Music size={20} className="text-visio-teal" />}
                />
                <MetricCard
                    label="Avg. Monthly Reach"
                    value={analytics.totalReach.toLocaleString()}
                    trend="+0%"
                    icon={<TrendingUp size={20} className="text-purple-400" />}
                />
                <MetricCard
                    label="Total Followers"
                    value={analytics.totalFollowers.toLocaleString()}
                    trend="+0%"
                    icon={<Users size={20} className="text-blue-400" />}
                />
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Growth Chart (2/3 width) */}
                <div className="lg:col-span-2 bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Activity size={18} className="text-visio-teal" />
                            Stream Growth
                        </h3>
                        <div className="flex gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-white/10 text-white">30 Days</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.spotify.streams}>
                                <defs>
                                    <linearGradient id="colorStreams" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(255,255,255,0.2)"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.2)"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(val) => `${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorStreams)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Demographics / Regions (1/3 width) */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                        <Globe size={18} className="text-blue-400" />
                        Top Regions
                    </h3>
                    <div className="space-y-4">
                        {analytics.spotify.topRegions.map((region, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-white/50">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">{region.region}</p>
                                        <div className="h-1.5 w-24 bg-white/10 rounded-full mt-1 overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${(region.listeners / 15000) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-white/40">{region.listeners.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Top Playlists */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                        <Music size={18} className="text-purple-400" />
                        Active Playlists
                    </h3>
                    <div className="space-y-4">
                        {analytics.spotify.playlists.map((pl, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                <div className="w-12 h-12 rounded bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-white/60">
                                    <Music size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-white">{pl.name}</p>
                                    <p className="text-xs text-white/40">{pl.followers.toLocaleString()} saves</p>
                                </div>
                                <button className="text-xs text-visio-teal hover:underline">View</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Posts Grid */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <h3 className="font-semibold text-white flex items-center gap-2 mb-6">
                        <Share2 size={18} className="text-pink-500" />
                        Top Performing Content
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        {analytics.instagram.posts.map((post) => (
                            <div key={post.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black/40">
                                <img src={post.image} alt="Post" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                    <div className="flex items-center gap-2 text-xs text-white">
                                        <span className="flex items-center gap-1"><Heart size={10} /> {post.likes}</span>
                                        <span className="flex items-center gap-1"><MessageCircle size={10} /> {post.comments}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
};

const MetricCard = ({ label, value, trend, icon }: { label: string, value: string, trend: string, icon: React.ReactNode }) => (
    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/5 rounded-lg">
                {icon}
            </div>
            <span className="text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">{trend}</span>
        </div>
        <div>
            <h4 className="text-2xl font-bold text-white mb-1">{value}</h4>
            <p className="text-xs text-white/40">{label}</p>
        </div>
    </div>
);
