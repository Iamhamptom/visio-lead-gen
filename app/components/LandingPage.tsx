import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check, Play, Menu, X, Sparkles, Zap, ChevronRight, Shield } from 'lucide-react';
import Link from 'next/link';
import VideoCard from './VideoCard';
import AboutSection from './AboutSection';
import FeaturesSection from './FeaturesSection';
import HowItWorksSection from './HowItWorksSection';

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

interface LandingPageProps {
    onGetStarted: () => void;
    onLogin: () => void;
}

const customEase = [0.16, 1, 0.3, 1] as const;

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: customEase } }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
    const [playingId, setPlayingId] = React.useState<string | null>(null);
    
    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const yHero = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setMobileMenuOpen(false);
        }
    };

    return (
        <div className="min-h-screen bg-visio-bg text-white font-outfit relative overflow-x-hidden selection:bg-visio-teal/30">
            {/* Layered Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-visio-teal/20 rounded-full blur-[150px] mix-blend-screen animate-blob" />
                <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-visio-sage/10 rounded-full blur-[150px] mix-blend-screen animate-blob-slow animation-delay-2000" />
                <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] bg-visio-teal/10 rounded-full blur-[150px] mix-blend-screen animate-blob animation-delay-4000" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />
            </div>

            {/* Navbar */}
            <motion.nav 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: customEase }}
                className="relative z-50 flex items-center justify-between px-6 py-6 md:py-8 max-w-7xl mx-auto"
            >
                <div className="flex items-center gap-4 group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-visio-teal to-visio-sage p-[1px]">
                        <div className="w-full h-full bg-visio-bg/80 backdrop-blur-xl rounded-2xl flex items-center justify-center group-hover:bg-transparent transition-colors duration-500">
                            <span className="text-white font-extrabold text-lg tracking-tighter">V</span>
                        </div>
                    </div>
                    <span className="font-bold text-2xl tracking-tight text-white">Visio</span>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8 px-8 py-3 rounded-full glass-panel border-white/5 bg-white/[0.01]">
                    <button onClick={() => scrollToSection('about')} className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300">About</button>
                    <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300">Features</button>
                    <button onClick={() => scrollToSection('how-it-works')} className="text-sm font-medium text-white/60 hover:text-white transition-colors duration-300">Process</button>
                    <div className="w-px h-4 bg-white/10" />
                    <Link href="/labs" className="text-sm font-medium text-visio-teal hover:text-visio-accent transition-colors duration-300 flex items-center gap-2 group">
                        <Sparkles size={14} className="group-hover:animate-pulse" />
                        Labs
                    </Link>
                </div>

                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-6">
                    <button onClick={onLogin} className="text-sm font-medium text-white/60 hover:text-white transition-colors tracking-wide">
                        Sign In
                    </button>
                    <button 
                        onClick={onGetStarted}
                        className="relative group px-6 py-2.5 rounded-full overflow-hidden bg-white text-black text-sm font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all duration-500"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative z-10">Get Started</span>
                    </button>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex items-center gap-4 md:hidden">
                    <button 
                        onClick={onGetStarted}
                        className="bg-white text-black px-5 py-2 rounded-full text-xs font-bold"
                    >
                        Start Free
                    </button>
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white/70 hover:text-white">
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <motion.div 
                    initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                    animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/80 flex flex-col items-center justify-center gap-8 md:hidden"
                >
                    <button onClick={() => scrollToSection('about')} className="text-3xl font-bold text-white/80 hover:text-white transition-colors">About</button>
                    <button onClick={() => scrollToSection('features')} className="text-3xl font-bold text-white/80 hover:text-white transition-colors">Features</button>
                    <button onClick={() => scrollToSection('how-it-works')} className="text-3xl font-bold text-white/80 hover:text-white transition-colors">Process</button>
                    <Link href="/labs" className="text-3xl font-bold text-visio-teal">Labs</Link>
                    <div className="h-px w-20 bg-white/10 my-4" />
                    <button onClick={onLogin} className="text-xl font-medium text-white/50 hover:text-white transition-colors">Sign In</button>
                </motion.div>
            )}

            {/* Hero Section */}
            <main ref={heroRef} className="relative z-10 pt-20 pb-32 px-6 lg:min-h-[85vh] flex flex-col justify-center">
                <motion.div style={{ y: yHero, opacity: opacityHero }} className="absolute inset-0 -z-10 h-[100vh]">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-visio-bg/80 to-visio-bg z-10" />
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster="/hero-poster.jpg"
                        className="w-full h-full object-cover opacity-30 mix-blend-luminosity mask-image-b"
                        style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)' }}
                    >
                        <source src="/hero-video-1.mp4" type="video/mp4" />
                    </video>
                </motion.div>

                <motion.div 
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="max-w-5xl mx-auto text-center space-y-8 relative z-20"
                >
                    <motion.div variants={fadeInUp} className="flex justify-center">
                        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-panel border-visio-teal/20 bg-visio-teal/5 text-xs font-bold uppercase tracking-widest text-visio-teal backdrop-blur-md hover:bg-visio-teal/10 transition-colors cursor-default">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-visio-teal opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-visio-teal"></span>
                            </span>
                            Next-Gen PR Intelligence
                        </div>
                    </motion.div>

                    <motion.h1 
                        variants={fadeInUp}
                        className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tighter leading-[1.05] text-white text-balance"
                    >
                        Elevate Your Career <br className="hidden md:block"/>
                        with <span className="text-transparent bg-clip-text bg-gradient-to-r from-visio-teal via-visio-sage to-white animate-text-shimmer bg-[length:200%_auto]">Visio AI</span>
                    </motion.h1>

                    <motion.p 
                        variants={fadeInUp}
                        className="text-lg md:text-2xl text-white/50 max-w-3xl mx-auto leading-relaxed font-light text-balance"
                    >
                        Stop searching, start closing. Find contacts, draft intelligent pitches, and manage campaigns effortlessly with your autonomous AI PR agent.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10">
                        <button
                            onClick={onGetStarted}
                            className="group relative px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-all duration-300 flex items-center gap-3 shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start 7-Day Trial 
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </button>
                        <Link href="/ads" className="px-8 py-4 rounded-full font-medium text-white border border-white/10 hover:bg-white/5 hover:border-white/20 transition-all duration-300 flex items-center gap-3 glass-panel group">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                                <Play size={14} fill="currentColor" />
                            </div>
                            Watch Platform Demo
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Dashboard Preview Hint */}
                <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.6, ease: customEase }}
                    className="mt-32 max-w-6xl mx-auto relative group perspective-[2000px]"
                >
                    <div className="absolute -inset-1 bg-gradient-to-b from-visio-teal/20 via-visio-sage/10 to-transparent rounded-t-[2.5rem] blur-2xl opacity-50 group-hover:opacity-80 transition duration-1000"></div>
                    <div className="relative rounded-t-[2rem] border-x border-t border-white/10 bg-[#0A0A0A]/80 backdrop-blur-3xl overflow-hidden shadow-2xl shadow-visio-teal/10 transform-gpu transition-transform duration-700 hover:-translate-y-2">
                        {/* Mock UI Header */}
                        <div className="h-14 bg-white/5 border-b border-white/5 flex items-center px-6 gap-3 backdrop-blur-md">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                                <div className="w-3 h-3 rounded-full bg-white/20"></div>
                            </div>
                            <div className="mx-auto px-4 py-1.5 rounded-full bg-black/40 border border-white/5 text-xs text-white/40 font-mono flex items-center gap-2">
                                <Shield size={12} className="text-visio-teal" />
                                app.visiocorp.co
                            </div>
                        </div>
                        <div className="aspect-[21/9] flex items-center justify-center bg-gradient-to-b from-white/[0.02] to-transparent relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" />
                            <div className="absolute inset-x-20 top-0 bottom-0 border-x border-white/[0.03] bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                            <div className="absolute inset-y-0 left-1/3 w-px bg-white/[0.03]" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-visio-teal/10 rounded-full blur-[100px] pointer-events-none" />
                            
                            <div className="relative z-10 flex flex-col items-center gap-4">
                                <Zap className="text-visio-teal/50 animate-pulse-slow" size={32} />
                                <p className="text-white/30 font-mono text-sm tracking-[0.3em] uppercase">Intelligence Engine Active</p>
                            </div>
                            
                            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-visio-bg to-transparent z-20" />
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Video Carousel 1 — Generated with Visio AI (Live, 9:16) */}
            <div className="relative z-20 py-20 bg-visio-bg">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-10"
                    >
                        <p className="text-visio-teal font-bold uppercase tracking-[0.2em] text-sm mb-3">Generated with Visio AI</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Live Campaign Videos</h2>
                    </motion.div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2">
                        {VIDEOS.live.map((video, index) => (
                            <div key={video.id} className="snap-start shrink-0 w-[220px] sm:w-[260px]">
                                <VideoCard
                                    src={video.src}
                                    title={video.title}
                                    thumbnail={video.thumbnail}
                                    index={index}
                                    isPlaying={playingId === video.id}
                                    onPlay={() => setPlayingId(playingId === video.id ? null : video.id)}
                                    className="aspect-[9/16] rounded-2xl"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Video Carousel 2 — Campaign Assets (TV + Corporate, 16:9) */}
            <div className="relative z-20 py-20 bg-visio-bg">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="mb-10"
                    >
                        <p className="text-visio-teal font-bold uppercase tracking-[0.2em] text-sm mb-3">Campaign Assets</p>
                        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">TV & Corporate Spots</h2>
                    </motion.div>
                    <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-2 px-2">
                        {[...VIDEOS.tv, ...VIDEOS.corporate].map((video, index) => (
                            <div key={video.id} className="snap-start shrink-0 w-[320px] sm:w-[400px]">
                                <VideoCard
                                    src={video.src}
                                    title={video.title}
                                    thumbnail={video.thumbnail}
                                    index={index}
                                    isPlaying={playingId === video.id}
                                    onPlay={() => setPlayingId(playingId === video.id ? null : video.id)}
                                    className="aspect-video rounded-2xl"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trusted By Section */}
            <div className="py-16 border-y border-white/[0.05] bg-black/40 backdrop-blur-md relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center">
                    <p className="text-xs font-bold text-white/30 uppercase tracking-[0.3em] mb-10">Trusted By Industry Leaders</p>
                    <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8 opacity-60 hover:opacity-100 transition-opacity duration-700 grayscale hover:grayscale-0">
                        <div className="text-2xl font-bold text-white tracking-tight">Tony Duardo</div>
                        <div className="text-3xl font-black tracking-tighter text-white">HGA</div>
                        <div className="text-xl font-medium tracking-wide text-white/80 border-l border-white/20 pl-8">+ 50 Global Agencies</div>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="relative z-20 bg-visio-bg">
                <AboutSection />
                <FeaturesSection />
                <HowItWorksSection />
            </div>

            {/* Pricing Section */}
            <div className="py-32 relative z-20 bg-visio-bg">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[500px] bg-visio-teal/5 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 text-center relative">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        <p className="text-visio-teal font-bold uppercase tracking-[0.2em] text-sm mb-4">Plans & Pricing</p>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight text-balance">Invest in your career.</h2>
                        <p className="text-white/50 text-lg max-w-2xl mx-auto mb-20">Transparent pricing. No hidden fees. Upgrade as your roster grows.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-6xl mx-auto">
                        {/* Artist Plan */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="p-10 rounded-[2rem] glass-panel hover:bg-white/[0.04] transition-all duration-300 relative group flex flex-col"
                        >
                            <h3 className="text-2xl font-bold text-white mb-2">Artist</h3>
                            <div className="text-5xl font-bold text-white mb-2">Free</div>
                            <p className="text-white/40 text-sm mb-8">Perfect for independent artists starting out.</p>
                            
                            <ul className="space-y-5 mb-10 flex-grow">
                                <li className="flex items-start gap-3 text-white/70">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>20 Intelligence Credits / mo</span>
                                </li>
                                <li className="flex items-start gap-3 text-white/70">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>Basic AI Pitch Drafting</span>
                                </li>
                                <li className="flex items-start gap-3 text-white/70">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>1 Active Artist Profile</span>
                                </li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all duration-300">Start Free</button>
                        </motion.div>

                        {/* Starter Label Plan (Featured) */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="p-10 rounded-[2rem] bg-gradient-to-b from-visio-teal/[0.08] to-transparent border border-visio-teal/30 relative group shadow-2xl shadow-visio-teal/10 scale-100 md:scale-105 z-10 flex flex-col overflow-hidden"
                        >
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-visio-teal via-visio-sage to-visio-teal" />
                            <div className="absolute top-6 right-6 bg-visio-teal/10 text-visio-teal text-xs font-bold px-3 py-1.5 rounded-full border border-visio-teal/20">MOST POPULAR</div>
                            
                            <h3 className="text-2xl font-bold text-white mb-2">Starter Label</h3>
                            <div className="text-5xl font-bold text-white mb-2 flex items-baseline gap-1">
                                R950<span className="text-lg text-white/40 font-normal">/mo</span>
                            </div>
                            <p className="text-white/50 text-sm mb-8">For labels and managers scaling up.</p>
                            
                            <ul className="space-y-5 mb-10 flex-grow">
                                <li className="flex items-start gap-3 text-white">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>250 Intelligence Credits / mo</span>
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>Advanced AI + Smart Scrape™</span>
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>Up to 3 Artist Profiles</span>
                                </li>
                                <li className="flex items-start gap-3 text-white">
                                    <Check size={20} className="text-visio-teal shrink-0 mt-0.5" /> 
                                    <span>CSV Export + Priority Support</span>
                                </li>
                            </ul>
                            <button onClick={onGetStarted} className="w-full py-4 rounded-xl bg-white text-black font-bold hover:scale-[1.02] hover:shadow-xl hover:shadow-white/10 transition-all duration-300">Upgrade Now</button>
                        </motion.div>

                        {/* Agency */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.3 }}
                            className="p-10 rounded-[2rem] glass-panel hover:bg-white/[0.04] transition-all duration-300 relative group flex flex-col"
                        >
                            <h3 className="text-2xl font-bold text-white mb-2">Agency</h3>
                            <div className="text-5xl font-bold text-white mb-2">Custom</div>
                            <p className="text-white/40 text-sm mb-8">Enterprise scale operations.</p>
                            
                            <ul className="space-y-5 mb-10 flex-grow">
                                <li className="flex items-start gap-3 text-white/70">
                                    <Check size={20} className="text-white/40 shrink-0 mt-0.5" /> 
                                    <span>Unlimited Searches</span>
                                </li>
                                <li className="flex items-start gap-3 text-white/70">
                                    <Check size={20} className="text-white/40 shrink-0 mt-0.5" /> 
                                    <span>Full API Access</span>
                                </li>
                                <li className="flex items-start gap-3 text-white/70">
                                    <Check size={20} className="text-white/40 shrink-0 mt-0.5" /> 
                                    <span>Unlimited Profiles</span>
                                </li>
                            </ul>
                            <a href="mailto:admin@visiocorp.co" className="flex items-center justify-center gap-2 w-full py-4 rounded-xl glass-panel hover:bg-white/10 text-white font-bold transition-all duration-300">
                                Contact Sales <ChevronRight size={18} />
                            </a>
                        </motion.div>
                    </div>
                </div>
            </div>

            <footer className="py-12 border-t border-white/5 relative z-20 bg-visio-bg">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3 opacity-50">
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-sm">V</div>
                        <span className="font-bold text-lg tracking-tight text-white">Visio</span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                        <a href="mailto:admin@visiocorp.co" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    
                    <p className="text-white/30 text-sm">&copy; 2026 Visio Corp. <span className="text-white/10 ml-2">v2.1</span></p>
                </div>
            </footer>
        </div>
    );
};