import React from 'react';
import {
    Globe,
    Target,
    Music,
    Rocket,
    Mic2,
    Building2,
    Sparkles,
    CheckCircle2,
    Shield
} from 'lucide-react';

export default function AboutSection() {
    return (
        <div id="about" className="bg-visio-bg text-white font-outfit">
            {/* Hero with Video Background */}
            <section className="relative py-20 md:py-32 overflow-hidden min-h-[80vh] flex items-center">
                {/* Video Background */}
                <div className="absolute inset-0 z-0">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                    >
                        <source src="/hero-video-2.mp4" type="video/mp4" />
                    </video>
                    {/* Dark Overlay */}
                    <div className="absolute inset-0 bg-black/70" />
                    <div className="absolute inset-0 bg-gradient-to-b from-visio-bg via-transparent to-visio-bg" />
                </div>

                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-visio-teal/20 border border-visio-teal/30 text-visio-teal text-sm font-medium mb-8 backdrop-blur-sm">
                        <Sparkles size={16} />
                        AI-Powered PR Engine
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
                        Turn Your Music Into<br />
                        <span className="bg-gradient-to-r from-visio-teal to-visio-sage bg-clip-text text-transparent">Global Reach</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
                        Visio AI PR Assistant helps artists plan PR campaigns, generate targeted industry contact lists,
                        and run outreach—so they can scale globally beyond their borders.
                    </p>
                </div>
            </section>

            {/* Overview */}
            <section className="py-20 border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold mb-6">What is Visio AI?</h2>
                            <p className="text-white/70 leading-relaxed mb-6">
                                <strong className="text-white">Visio AI PR Assistant</strong> is an AI-powered PR + lead generation + outreach engine
                                built specifically for the entertainment industry. It helps artists, labels, managers, and entertainment brands
                                find the right media, creators, DJs, and promoters—fast, repeatably, and at global scale.
                            </p>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-visio-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Music size={16} className="text-visio-teal" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Artist Portal</p>
                                        <p className="text-white/50 text-sm">Deep profile + brand voice + assets</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-visio-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Globe size={16} className="text-visio-teal" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">Global Contact Universe</p>
                                        <p className="text-white/50 text-sm">Media, DJs, dancers, clubs, promoters, creators, curators</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-visio-teal/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Rocket size={16} className="text-visio-teal" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">AI Campaign Engine</p>
                                        <p className="text-white/50 text-sm">Plans campaigns, builds lead lists, launches outreach</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8">
                            <h3 className="text-xl font-bold mb-4 text-visio-teal">Our Mission</h3>
                            <p className="text-white/70 leading-relaxed">
                                Enable artists to <strong className="text-white">scale globally beyond their borders</strong>,
                                by connecting them to the full industry ecosystem—country by country, city by city.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Problem */}
            <section className="py-20 bg-red-500/5 border-y border-red-500/10">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-6">The Problem We Solve</h2>
                    <p className="text-white/60 mb-12">Entertainment marketing is broken by:</p>
                    <div className="grid md:grid-cols-2 gap-6 text-left">
                        {[
                            { title: "Scattered Contacts", desc: "Lists live everywhere; most are outdated" },
                            { title: "Slow Research", desc: "Finding 100–500 relevant contacts takes days/weeks" },
                            { title: "No Targeting Intelligence", desc: "Genre-fit, audience-fit, location-fit missing" },
                            { title: "Poor Outreach Execution", desc: "Weak messaging, no follow-up, no tracking" },
                        ].map((item, i) => (
                            <div key={i} className="bg-black/40 border border-white/10 rounded-xl p-5">
                                <p className="font-semibold text-red-400 mb-1">{item.title}</p>
                                <p className="text-white/50 text-sm">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                    <p className="text-white/40 text-sm mt-8 italic">
                        Result: great music loses because distribution + attention is hard to engineer.
                    </p>
                </div>
            </section>

            {/* Ethics & Compliance */}
            <section className="py-20 bg-white/[0.02] border-y border-white/5">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <Shield size={40} className="text-visio-teal mx-auto mb-6" />
                    <h2 className="text-3xl font-bold mb-6">Data, Ethics & Compliance</h2>
                    <p className="text-white/60 mb-8">Visio is built to be powerful without being creepy:</p>
                    <div className="grid md:grid-cols-2 gap-4 text-left">
                        {[
                            "Public, professional, industry-relevant data only",
                            "Respect platform rules and privacy laws",
                            "Opt-in outreach where possible",
                            "Unsubscribe handling for email campaigns",
                            "Suppression lists (do-not-contact)",
                            "Audit trails for data collection",
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-lg px-4 py-3">
                                <CheckCircle2 size={16} className="text-visio-teal flex-shrink-0" />
                                <span className="text-white/70 text-sm">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
