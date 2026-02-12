'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BackgroundBeams } from '../components/ui/background-beams';
import { ArrowLeft, Play, Mail } from 'lucide-react';
import Link from 'next/link';
import VideoCard from '../components/VideoCard';

// Video Data Structure
const VIDEOS = {
    corporate: [
        { id: 'corp-1', src: '/ads/Co-perate/The_Visio_AI_PR_Assistant.mp4', title: 'The Visio AI PR Assistant', thumbnail: '/ads/thumbnails/The_Visio_AI_PR_Assistant.jpg' },
        { id: 'corp-2', src: '/ads/Co-perate/hf_20260208_174655_8b98b0a1-6dd6-4e29-9898-940dfbd3578b.mp4', title: 'Corporate Identity', thumbnail: '/ads/thumbnails/hf_20260208_174655_8b98b0a1-6dd6-4e29-9898-940dfbd3578b.jpg' },
    ],
    live: [
        { id: 'live-1', src: '/ads/Live/hf_20260208_165317_5d0cf35e-7d61-4d3b-81c9-b95ac751d531.mp4', title: 'Live Session 1', thumbnail: '/ads/thumbnails/hf_20260208_165317_5d0cf35e-7d61-4d3b-81c9-b95ac751d531.jpg' },
        { id: 'live-2', src: '/ads/Live/hf_20260208_165440_a0a596e9-401c-448a-a4be-db5cd684536c.mp4', title: 'Live Session 2', thumbnail: '/ads/thumbnails/hf_20260208_165440_a0a596e9-401c-448a-a4be-db5cd684536c.jpg' },
        { id: 'live-3', src: '/ads/Live/hf_20260208_165506_022e7724-f7a7-408f-ab44-2037006d1a73 (1).mp4', title: 'Live Session 3', thumbnail: '/ads/thumbnails/hf_20260208_165506_022e7724-f7a7-408f-ab44-2037006d1a73_-1-.jpg' },
        { id: 'live-4', src: '/ads/Live/hf_20260208_165907_0ddd917a-575a-45c1-a100-5597cddfd99b.mp4', title: 'Live Session 4', thumbnail: '/ads/thumbnails/hf_20260208_165907_0ddd917a-575a-45c1-a100-5597cddfd99b.jpg' },
        { id: 'live-5', src: '/ads/Live/hf_20260208_165925_fdfeb3ca-2385-432b-8cc4-5e9fc4dbd666.mp4', title: 'Live Session 5', thumbnail: '/ads/thumbnails/hf_20260208_165925_fdfeb3ca-2385-432b-8cc4-5e9fc4dbd666.jpg' },
        { id: 'live-6', src: '/ads/Live/hf_20260208_170538_fd58205b-8499-4050-a1ee-cbb84b0fa5da.mp4', title: 'Live Session 6', thumbnail: '/ads/thumbnails/hf_20260208_170538_fd58205b-8499-4050-a1ee-cbb84b0fa5da.jpg' },
    ],
    tv: [
        { id: 'tv-1', src: '/ads/TV AD/hf_20260208_170124_2de6bca5-6b09-4cf2-b941-4272fd2b8871 (1).mp4', title: 'TV Spot 1', thumbnail: '/ads/thumbnails/hf_20260208_170124_2de6bca5-6b09-4cf2-b941-4272fd2b8871_-1-.jpg' },
        { id: 'tv-2', src: '/ads/TV AD/hf_20260208_171017_4f65375d-1f82-43f8-9d7c-7fafa0d12a55 (1).mp4', title: 'TV Spot 2', thumbnail: '/ads/thumbnails/hf_20260208_171017_4f65375d-1f82-43f8-9d7c-7fafa0d12a55_-1-.jpg' },
        { id: 'tv-3', src: '/ads/TV AD/hf_20260208_191001_10b31258-cd9e-4994-9604-eba3e948c70d.mp4', title: 'TV Spot 3', thumbnail: '/ads/thumbnails/hf_20260208_191001_10b31258-cd9e-4994-9604-eba3e948c70d.jpg' },
        { id: 'tv-4', src: '/ads/TV AD/hf_20260208_191921_e7967494-e9a6-4e5e-8d47-d3e62268f27e.mp4', title: 'TV Spot 4', thumbnail: '/ads/thumbnails/hf_20260208_191921_e7967494-e9a6-4e5e-8d47-d3e62268f27e.jpg' },
        { id: 'tv-5', src: '/ads/TV AD/hf_20260208_201453_32859a77-46de-4c10-af29-8ac5d3836e03.mp4', title: 'TV Spot 5', thumbnail: '/ads/thumbnails/hf_20260208_201453_32859a77-46de-4c10-af29-8ac5d3836e03.jpg' },
    ]
};

export default function AdsPage() {
    const [playingId, setPlayingId] = React.useState<string | null>(null);

    return (
        <div className="h-screen w-full bg-visio-bg text-white font-outfit relative overflow-y-auto overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <BackgroundBeams className="opacity-40" />
            </div>

            {/* Navbar / Back Button */}
            <nav className="relative z-10 px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group">
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">Back to Home</span>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-visio-teal to-visio-sage flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-visio-teal/20">V</div>
                    <span className="font-bold text-xl tracking-tight text-white">Visio</span>
                </div>
            </nav>

            <main className="relative z-10 px-6 py-12 max-w-7xl mx-auto space-y-24">

                {/* Header */}
                <div className="text-center space-y-6 max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-[10px] font-bold uppercase tracking-widest text-yellow-500 mb-2"
                    >
                        Internal Showcase
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl md:text-7xl font-bold tracking-tight text-white"
                    >
                        Funny Budget <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">A.I. ADS</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-xl text-white/40 leading-relaxed font-light"
                    >
                        A collection of our experimental, high-impact video campaigns generated with next-gen AI tools.
                    </motion.p>
                </div>

                {/* Categories */}

                {/* Corporate */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Co-operate</h2>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {VIDEOS.corporate.map((video, i) => (
                            <VideoCard
                                key={video.id}
                                index={i}
                                {...video}
                                isPlaying={playingId === video.id}
                                onPlay={() => setPlayingId(playingId === video.id ? null : video.id)}
                            />
                        ))}
                    </div>
                </div>

                {/* Live */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Live</h2>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>
                    {/* Carousel Container */}
                    <div className="flex overflow-x-auto gap-4 pb-8 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
                        {VIDEOS.live.map((video, i) => (
                            <div key={video.id} className="flex-none w-[280px] snap-center">
                                <VideoCard
                                    index={i}
                                    {...video}
                                    isPlaying={playingId === video.id}
                                    onPlay={() => setPlayingId(playingId === video.id ? null : video.id)}
                                    className="aspect-[9/16]"
                                />
                                {/* Aspect ratio override wrapper handled by class in VideoCard? No, we need to enforce aspect here or inside */}
                                {/* Since VideoCard is generic, we might need to pass className or handle it differently. 
                             Let's adjust VideoCard to accept className or just put the aspect on the wrapper. 
                          */}
                            </div>
                        ))}
                    </div>
                </div>

                {/* TV ADS */}
                <div className="space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-white/10 flex-1" />
                        <h2 className="text-2xl font-bold text-white uppercase tracking-widest">TV AD</h2>
                        <div className="h-px bg-white/10 flex-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {VIDEOS.tv.map((video, i) => (
                            <VideoCard
                                key={video.id}
                                index={i}
                                {...video}
                                isPlaying={playingId === video.id}
                                onPlay={() => setPlayingId(playingId === video.id ? null : video.id)}
                            />
                        ))}
                    </div>
                </div>

            </main>

            {/* Footer / Contact */}
            <footer className="relative z-10 py-20 border-t border-white/5 bg-black/40 backdrop-blur-3xl mt-20">
                <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                        <Mail className="text-visio-teal" size={32} />
                    </div>
                    <h3 className="text-3xl font-bold text-white">Want to know how we made them?</h3>
                    <p className="text-white/50 text-lg">
                        Oh if you wanna know how we made them just reach out @ <a href="mailto:admin@visiocorp.co" className="text-visio-teal hover:underline font-bold">admin@visiocorp.co</a>
                    </p>
                    <p className="text-white/20 text-sm pt-12">&copy; 2026 Visio Lead Gen. Built for the Culture.</p>
                </div>
            </footer>

        </div>
    );
}
