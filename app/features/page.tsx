'use client';

import React from 'react';
import Link from 'next/link';
import {
    ArrowLeft,
    MessageSquare,
    Search,
    Lightbulb,
    Calculator,
    Send,
    FileText,
    Sparkles,
    ChevronRight,
    Rocket
} from 'lucide-react';

const modules = [
    {
        id: 'campaign-builder',
        icon: MessageSquare,
        title: 'Campaign Builder',
        subtitle: 'Chat-to-Campaign',
        description: 'Simply describe your goal and the AI builds your campaign plan.',
        examples: [
            '"Promote my song in South Africa"',
            '"Find 500 journalists who cover amapiano + Afro-house"',
            '"Find local DJs under 50k followers who break new music"'
        ],
        outputs: [
            'Recommended campaign plan',
            'Targeting options (who/where/why)',
            'Estimated reach + outcome range',
            'Cost-in-credits to generate lists'
        ],
        gradient: 'from-blue-500/20 to-purple-500/20'
    },
    {
        id: 'lead-finder',
        icon: Search,
        title: 'Lead Finder',
        subtitle: 'List Generator',
        description: 'Build targeted lead lists filtered by territory, genre, audience, platform, and role.',
        features: [
            'Territory + genre-fit filtering',
            'Audience-fit + platform targeting',
            'Batch exports (100 leads = $10 credits)',
            'Auto-tagging + segmentation'
        ],
        gradient: 'from-visio-teal/20 to-cyan-500/20'
    },
    {
        id: 'reason-tab',
        icon: Lightbulb,
        title: '"Reason Tab"',
        subtitle: 'Why This Target Matters',
        description: 'For every contact, understand exactly why you should pitch them.',
        insights: [
            'Why you should pitch them',
            'What value you can offer them',
            'What angle fits (story, culture, release, exclusives)'
        ],
        gradient: 'from-amber-500/20 to-orange-500/20'
    },
    {
        id: 'reach-calculator',
        icon: Calculator,
        title: 'Reach Calculator',
        subtitle: 'ROI + Exposure Projection',
        description: 'A built-in calculator that estimates campaign value and expected outcomes.',
        metrics: [
            'Potential impressions / views',
            'Likely engagement ranges',
            'Expected click-through rates',
            'Worth-it analysis for paid placements'
        ],
        gradient: 'from-green-500/20 to-emerald-500/20'
    },
    {
        id: 'outreach-engine',
        icon: Send,
        title: 'Outreach Engine',
        subtitle: 'Sequences + Personalization + Tracking',
        description: 'Launch professional campaigns with automated follow-ups and tracking.',
        features: [
            'Email sequences',
            'Personalization tokens (name, city, niche, recent work)',
            'Follow-ups + reminders',
            'Engagement tracking (opens/clicks/replies)'
        ],
        gradient: 'from-red-500/20 to-pink-500/20'
    },
    {
        id: 'epk-generator',
        icon: FileText,
        title: 'Proposal Generator',
        subtitle: 'EPK + Media Kits',
        description: 'Auto-generate media-friendly pitches and one-pagers from your Artist Portal.',
        outputs: [
            'Takes Artist Portal + campaign theme',
            'Generates media-friendly pitches',
            'Creates one-pagers and mini proposals',
            'Exports PDF + shareable link'
        ],
        gradient: 'from-violet-500/20 to-indigo-500/20'
    }
];

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to App</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-bold">V</div>
                        <span className="font-outfit text-lg font-medium tracking-tight">Visio<span className="opacity-50">AI</span></span>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-visio-teal/5 via-transparent to-transparent" />
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-visio-teal/10 border border-visio-teal/20 text-visio-teal text-sm font-medium mb-8">
                        <Sparkles size={16} />
                        Product Features
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">
                        Everything You Need to<br />
                        <span className="bg-gradient-to-r from-visio-teal to-visio-sage bg-clip-text text-transparent">Scale Your PR</span>
                    </h1>
                    <p className="text-lg text-white/60 max-w-2xl mx-auto">
                        From campaign planning to targeted outreach—six powerful modules that work together seamlessly.
                    </p>
                </div>
            </section>

            {/* Modules */}
            <section className="py-12 pb-24">
                <div className="max-w-5xl mx-auto px-6 space-y-8">
                    {modules.map((module, index) => (
                        <div
                            key={module.id}
                            className={`bg-gradient-to-br ${module.gradient} border border-white/10 rounded-3xl p-8 md:p-10 hover:border-white/20 transition-all`}
                        >
                            <div className="flex flex-col md:flex-row md:items-start gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                                    <module.icon size={28} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-white/30 text-sm font-mono">{String(index + 1).padStart(2, '0')}</span>
                                        <h3 className="text-2xl font-bold">{module.title}</h3>
                                    </div>
                                    <p className="text-visio-teal text-sm font-medium mb-4">{module.subtitle}</p>
                                    <p className="text-white/70 mb-6 leading-relaxed">{module.description}</p>

                                    {module.examples && (
                                        <div className="mb-4">
                                            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Example Prompts</p>
                                            <div className="space-y-2">
                                                {module.examples.map((ex, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-white/60 bg-black/30 rounded-lg px-4 py-2">
                                                        <ChevronRight size={14} className="text-visio-teal flex-shrink-0" />
                                                        <span>{ex}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {module.outputs && (
                                        <div>
                                            <p className="text-white/40 text-xs uppercase tracking-wider mb-3">System Outputs</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {module.outputs.map((output, i) => (
                                                    <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-visio-teal" />
                                                        <span>{output}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {module.features && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {module.features.map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-visio-teal" />
                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {module.insights && (
                                        <div className="grid gap-2">
                                            {module.insights.map((insight, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                                                    <Lightbulb size={14} className="text-amber-400" />
                                                    <span>{insight}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {module.metrics && (
                                        <div className="grid grid-cols-2 gap-2">
                                            {module.metrics.map((metric, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                    <span>{metric}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 border-t border-white/5">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">Ready to Try It?</h2>
                    <p className="text-white/60 mb-8">
                        Start building your first campaign in minutes.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-visio-teal text-black px-8 py-4 rounded-xl font-bold hover:bg-visio-teal/90 transition-all hover:scale-105"
                    >
                        Launch App
                        <Rocket size={18} />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-white/30 text-sm">© 2026 Visio AI. All rights reserved.</p>
                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <Link href="/about" className="hover:text-white transition-colors">About</Link>
                        <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
                        <a href="mailto:admin@visiocorp.co" className="hover:text-white transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
