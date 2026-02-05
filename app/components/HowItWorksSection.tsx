import React from 'react';
import {
    UserPlus,
    Palette,
    MessageSquare,
    Target,
    Users,
    Database,
    CheckCircle,
    Send,
    BarChart3,
    Repeat,
    Sparkles,
    ArrowRight
} from 'lucide-react';

const steps = [
    {
        number: 1,
        icon: UserPlus,
        title: 'Sign Up',
        description: 'Create your free account in seconds.',
        color: 'text-blue-400'
    },
    {
        number: 2,
        icon: Palette,
        title: 'Complete Artist Portal',
        description: 'Build your identity: bio, assets, brand voice, and campaign goals.',
        color: 'text-purple-400'
    },
    {
        number: 3,
        icon: MessageSquare,
        title: 'Start a Campaign via Chat',
        description: 'Simply tell the AI what you want to achieve.',
        color: 'text-visio-teal'
    },
    {
        number: 4,
        icon: Target,
        title: 'AI Returns Plan + Targeting',
        description: 'Get a complete campaign strategy with targeting recommendations.',
        color: 'text-cyan-400'
    },
    {
        number: 5,
        icon: Users,
        title: 'Choose Markets + Targets',
        description: 'Select your markets and target types: journalists, DJs, creators, etc.',
        color: 'text-amber-400'
    },
    {
        number: 6,
        icon: Database,
        title: 'Generate Lead List',
        description: 'System generates your curated list (credits-based).',
        color: 'text-green-400'
    },
    {
        number: 7,
        icon: CheckCircle,
        title: 'Review & Approve',
        description: 'Review your list and approve for outreach.',
        color: 'text-emerald-400'
    },
    {
        number: 8,
        icon: Send,
        title: 'Outreach Button Appears',
        description: 'One click to launch your professional outreach campaign.',
        color: 'text-red-400'
    },
    {
        number: 9,
        icon: BarChart3,
        title: 'Track Results',
        description: 'Monitor opens, clicks, replies, and engagement.',
        color: 'text-pink-400'
    },
    {
        number: 10,
        icon: Repeat,
        title: 'Improve & Repeat',
        description: 'Results feed back into your portal for smarter future campaigns.',
        color: 'text-violet-400'
    }
];

const useCases = [
    {
        title: 'New Single Release',
        description: 'Country launch plan + DJ + creator push',
        icon: '🎵'
    },
    {
        title: 'EP Rollout',
        description: 'Multi-city media campaign',
        icon: '💿'
    },
    {
        title: 'Tour Announcement',
        description: 'Local promoters + venue reach + media',
        icon: '🎤'
    },
    {
        title: 'Brand Partnership',
        description: 'Audience-fit creator list + PR angles',
        icon: '🤝'
    },
    {
        title: 'Label Roster Export',
        description: 'Territory-by-territory PR engine',
        icon: '🌍'
    }
];

export default function HowItWorksSection() {
    return (
        <section id="how-it-works" className="py-24 bg-visio-bg text-white font-outfit">
            {/* Header */}
            <div className="max-w-4xl mx-auto px-6 text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-visio-teal/10 border border-visio-teal/20 text-visio-teal text-sm font-medium mb-8">
                    <Sparkles size={16} />
                    User Journey
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6">
                    From Idea to<br />
                    <span className="bg-gradient-to-r from-visio-teal to-visio-sage bg-clip-text text-transparent">Global Outreach</span>
                </h2>
                <p className="text-lg text-white/60 max-w-2xl mx-auto">
                    See how Visio AI transforms your campaign goals into targeted outreach in just 10 simple steps.
                </p>
            </div>

            {/* Journey Steps */}
            <div className="max-w-4xl mx-auto px-6 mb-24">
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-visio-teal/50 via-white/10 to-transparent hidden md:block" />

                    <div className="space-y-6">
                        {steps.map((step, index) => (
                            <div
                                key={step.number}
                                className={`relative flex ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-6`}
                            >
                                {/* Card */}
                                <div className={`flex-1 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                                        <div className={`flex items-center gap-3 mb-3 ${index % 2 === 0 ? 'md:justify-end' : ''}`}>
                                            <step.icon size={20} className={step.color} />
                                            <span className="text-white/30 text-sm font-mono">Step {step.number}</span>
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                                        <p className="text-white/60">{step.description}</p>
                                    </div>
                                </div>

                                {/* Center Node */}
                                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-visio-bg border-2 border-visio-teal items-center justify-center">
                                    <span className="text-visio-teal font-bold">{step.number}</span>
                                </div>

                                {/* Spacer */}
                                <div className="hidden md:block flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Flow Summary */}
            <div className="py-16 bg-white/[0.02] border-y border-white/5 mb-20">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-2xl font-bold mb-8">The Complete Flow</h2>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <span className="bg-visio-teal/10 border border-visio-teal/30 text-visio-teal px-4 py-2 rounded-full font-medium">
                            Artist Identity
                        </span>
                        <ArrowRight className="text-white/30" size={18} />
                        <span className="bg-white/5 border border-white/10 text-white/70 px-4 py-2 rounded-full">
                            Campaign Goal
                        </span>
                        <ArrowRight className="text-white/30" size={18} />
                        <span className="bg-white/5 border border-white/10 text-white/70 px-4 py-2 rounded-full">
                            Curated Target Lists
                        </span>
                        <ArrowRight className="text-white/30" size={18} />
                        <span className="bg-white/5 border border-white/10 text-white/70 px-4 py-2 rounded-full">
                            Outreach
                        </span>
                        <ArrowRight className="text-white/30" size={18} />
                        <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-full font-medium">
                            Results Tracking
                        </span>
                    </div>
                </div>
            </div>

            {/* Use Cases */}
            <div className="max-w-6xl mx-auto px-6">
                <h2 className="text-3xl font-bold mb-4 text-center">Real-World Use Cases</h2>
                <p className="text-white/60 text-center mb-12">See how artists use Visio AI for different campaigns</p>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {useCases.map((uc, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:border-visio-teal/30 transition-colors">
                            <span className="text-4xl mb-4 block">{uc.icon}</span>
                            <h3 className="font-bold mb-2">{uc.title}</h3>
                            <p className="text-white/50 text-sm">{uc.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
