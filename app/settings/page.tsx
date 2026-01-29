'use client';

import { useState } from 'react';
import { Save, ArrowLeft, Key } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const [keys, setKeys] = useState({
        firecrawl: '',
        apollo: '',
        exa: '',
        openai: ''
    });

    const handleSave = () => {
        // In a real app, this would POST to an API to save to .env
        alert('Keys saved to secure storage (Simulated)');
    };

    return (
        <main className="min-h-screen bg-[#050505] p-6 text-white relative overflow-hidden bg-grid-white/[0.02]">
            <div className="max-w-3xl mx-auto space-y-8">
                <header className="flex items-center gap-4 mb-8">
                    <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold">Protocol Configuration</h1>
                </header>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Key className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">API Credentials</h2>
                            <p className="text-sm text-zinc-500">Securely store your access tokens for the autonomous agents.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Firecrawl API Key</label>
                            <input
                                type="password"
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                                placeholder="fc_..."
                                value={keys.firecrawl}
                                onChange={(e) => setKeys({ ...keys, firecrawl: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Apollo API Key</label>
                            <input
                                type="password"
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                                placeholder="..."
                                value={keys.apollo}
                                onChange={(e) => setKeys({ ...keys, apollo: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Exa / Metaphor API Key</label>
                            <input
                                type="password"
                                className="w-full bg-black/50 border border-zinc-700 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors font-mono"
                                placeholder="..."
                                value={keys.exa}
                                onChange={(e) => setKeys({ ...keys, exa: e.target.value })}
                            />
                        </div>

                        <div className="pt-6 border-t border-zinc-800">
                            <button
                                onClick={handleSave}
                                className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-zinc-200 transition-colors flex justify-center items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
