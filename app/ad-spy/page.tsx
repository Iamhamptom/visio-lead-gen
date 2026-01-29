'use client';

import { useState } from 'react';
import { Search, Eye, Filter, ArrowUpRight } from 'lucide-react';

export default function AdSpyPage() {
    const [query, setQuery] = useState('');
    const [platform, setPlatform] = useState<'all' | 'meta' | 'google'>('all');
    const [results, setResults] = useState<any[]>([]); // Mock data type
    const [isLoading, setIsLoading] = useState(false);

    // Mock Data for Demo
    const MOCK_ADS = [
        {
            id: 1,
            platform: 'Meta',
            company: 'Competitor A',
            text: 'Stop wasting time on manual lead gen. Use AI.',
            image: 'https://via.placeholder.com/400x200/101010/333333?text=Ad+Creative',
            cta: 'Sign Up',
            active: true
        },
        {
            id: 2,
            platform: 'Google',
            company: 'Competitor B',
            text: 'Top Rated CRM for 2026. Get a Demo.',
            image: '', // Text ad
            cta: 'Visit Site',
            active: true
        }
    ];

    const handleSearch = () => {
        setIsLoading(true);
        setTimeout(() => {
            setResults(MOCK_ADS); // Load mock data
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Ad Intelligence Spy</h1>
                <p className="text-zinc-500">Uncover competitor strategies on Meta & Google Ads.</p>
            </div>

            {/* Filters & Search */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-6 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Enter competitor name or keyword (e.g. 'Monday.com')..."
                            className="w-full bg-black border border-zinc-800 rounded-lg py-3 pl-12 pr-4 text-white focus:border-cyan-500 outline-none transition-colors"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        disabled={isLoading}
                        className="bg-cyan-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-cyan-500 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Scanning...' : 'Spy Now'}
                    </button>
                </div>

                <div className="flex gap-2">
                    {['all', 'meta', 'google'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setPlatform(p as any)}
                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${platform === p
                                    ? 'bg-zinc-100 text-black border-zinc-100'
                                    : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600'
                                }`}
                        >
                            {p === 'all' ? 'All Platforms' : p.charAt(0).toUpperCase() + p.slice(1) + ' Ads'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((ad) => (
                    <div key={ad.id} className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors group">
                        <div className="p-4 border-b border-zinc-800/50 flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${ad.platform === 'Meta' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm font-semibold text-white">{ad.company}</span>
                            </div>
                            <span className="text-xs text-zinc-500 border border-zinc-800 px-2 py-0.5 rounded uppercase">{ad.platform}</span>
                        </div>

                        {ad.image && (
                            <div className="aspect-video bg-zinc-800/50 relative">
                                {/* Placeholder for real scraped image */}
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                                    [Ad Creative Preview]
                                </div>
                            </div>
                        )}

                        <div className="p-4 space-y-4">
                            <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">"{ad.text}"</p>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xs text-zinc-500 font-mono">Active Now</span>
                                <button className="text-cyan-400 text-sm font-medium flex items-center gap-1 hover:underline">
                                    View Details <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {!isLoading && results.length === 0 && (
                    <div className="col-span-full py-20 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                        <Eye className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Enter a competitor to reveal their ads.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
