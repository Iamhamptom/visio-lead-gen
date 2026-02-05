'use client';

import React from 'react';
import Link from 'next/link';
import {
    Play,
    FileText,
    Download,
    Video,
    Lightbulb,
    FlaskConical,
    ArrowLeft,
    ChevronRight,
    ArrowRight
} from 'lucide-react';
import { BackgroundBeams } from '../components/ui/background-beams';

export default function LabsPage() {
    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit relative overflow-hidden selection:bg-visio-accent selection:text-black">
            <BackgroundBeams className="fixed inset-0 z-0 opacity-30 pointer-events-none" />

            {/* Nav */}
            <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <ArrowLeft size={18} className="text-white/70" />
                    <span className="text-sm font-medium text-white/70">Back to Visio</span>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-visio-teal font-bold">L</div>
                    <span className="font-bold text-xl tracking-tight">Visio Research Labs</span>
                </div>
            </nav>

            {/* Hero */}
            <section className="relative z-10 py-20 px-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-visio-teal/10 border border-visio-teal/20 text-visio-teal text-sm font-medium mb-8">
                    <FlaskConical size={16} />
                    Research & Development
                </div>
                <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                    The Science of <br />
                    <span className="bg-gradient-to-r from-visio-teal to-visio-sage bg-clip-text text-transparent">Music Influence</span>
                </h1>
                <p className="text-xl text-white/50 max-w-2xl mx-auto leading-relaxed mb-12">
                    Peer-reviewed research, methodology papers, and deep-dives into the algorithms powering Visio AI.
                </p>
            </section>

            {/* Featured Demo Video */}
            <section className="relative z-10 max-w-5xl mx-auto px-6 mb-32">
                <div className="bg-gradient-to-br from-white/10 to-transparent p-1 rounded-3xl backdrop-blur-sm border border-white/10">
                    <div className="bg-black/80 rounded-[22px] overflow-hidden aspect-video relative group">
                        {/* Video Player Placeholder - User needs to upload 'demo.mp4' */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 pointer-events-none group-hover:bg-black/30 transition-colors">
                            <div className="w-20 h-20 rounded-full bg-visio-teal/90 flex items-center justify-center pl-1 shadow-2xl shadow-visio-teal/20 scale-100 group-hover:scale-110 transition-transform duration-500">
                                <Play fill="currentColor" className="text-black" size={32} />
                            </div>
                        </div>
                        <video
                            poster="/hero-video-1.mp4" // Fallback using hero video as poster basically
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                            controls
                        >
                            <source src="/demo.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>

                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                            <h2 className="text-2xl font-bold mb-2">Visio PrAI Assistant: Full Demo</h2>
                            <p className="text-white/70">A complete walkthrough of the agentic workflow and campaign generation engine.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Three Columns: Papers, Keynotes, Propositions */}
            <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Column 1: Research Papers */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                            <FileText className="text-visio-teal" size={24} />
                            <h2 className="text-2xl font-bold">Research Papers</h2>
                        </div>
                        <div className="space-y-4">
                            {[
                                { title: "Algorithmic PR: The End of Gatekeepers", size: "2.4 MB", tag: "Methodology" },
                                { title: "Genre-Fit Scoring Systems v2.0", size: "1.1 MB", tag: "Technical" },
                                { title: "The State of Independent Music 2026", size: "5.8 MB", tag: "Industry Report" },
                                { title: "Automating Emotional Pitching", size: "3.2 MB", tag: "AI Ethics" },
                            ].map((paper, i) => (
                                <div key={i} className="group p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors cursor-pointer">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-white/10 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-white/50">{paper.tag}</div>
                                        <Download size={16} className="text-white/30 group-hover:text-visio-teal transition-colors" />
                                    </div>
                                    <h3 className="font-semibold leading-snug mb-2 group-hover:text-visio-teal transition-colors">{paper.title}</h3>
                                    <p className="text-sm text-white/40">PDF • {paper.size}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 2: Keynotes */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Video className="text-visio-sage" size={24} />
                            <h2 className="text-2xl font-bold">Keynotes</h2>
                        </div>
                        <div className="space-y-6">
                            {[
                                { title: "Visio Architecture Deep Dive", duration: "45:00", speaker: "Head of AI" },
                                { title: "Building for the Culture", duration: "12:30", speaker: "Tony Duardo" },
                                { title: "Future of Agentic Workflows", duration: "28:15", speaker: "Research Team" },
                            ].map((video, i) => (
                                <div key={i} className="group relative aspect-video bg-black/40 rounded-xl overflow-hidden border border-white/10 hover:border-visio-sage/50 transition-colors cursor-pointer">
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                            <Play size={16} fill="currentColor" className="text-white ml-0.5" />
                                        </div>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                        <h3 className="font-bold text-sm mb-1">{video.title}</h3>
                                        <div className="flex items-center gap-2 text-xs text-white/50">
                                            <span>{video.duration}</span>
                                            <span>•</span>
                                            <span>{video.speaker}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Column 3: Propositions / Thesis */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 mb-6">
                            <Lightbulb className="text-amber-400" size={24} />
                            <h2 className="text-2xl font-bold">Our Propositions</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20">
                                <h3 className="font-bold text-amber-200 mb-3">01. Attention Engineering</h3>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    In a saturated market, attention is not luck—it is an engineered outcome of targeting precision + pitch resonance.
                                </p>
                            </div>
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-visio-teal/10 to-transparent border border-visio-teal/20">
                                <h3 className="font-bold text-visio-teal mb-3">02. Agentic Scale</h3>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    Humans cannot manually research 10,000 niche playlists. Agents can. The future of PR is human strategy running on agentic infrastructure.
                                </p>
                            </div>
                            <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
                                <h3 className="font-bold text-purple-300 mb-3">03. Decentralized Media</h3>
                                <p className="text-sm text-white/70 leading-relaxed">
                                    The major labels lost their monopoly on distribution. Now they are losing their monopoly on attention. Using AI, independent teams can rival global agency reach.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/10">
                            <h4 className="font-bold mb-4">Join the Lab</h4>
                            <p className="text-sm text-white/50 mb-4">Get early access to our latest research and beta features.</p>
                            <div className="flex gap-2">
                                <input type="email" placeholder="Enter email" className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm flex-1 focus:border-visio-teal/50 outline-none transition-colors" />
                                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Join</button>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 text-center text-white/20 text-sm border-t border-white/5">
                <p>&copy; 2026 Visio AI Research Labs.</p>
            </footer>
        </div>
    );
}
