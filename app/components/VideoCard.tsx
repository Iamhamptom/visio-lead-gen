'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

interface VideoCardProps {
    src: string;
    title: string;
    thumbnail?: string;
    index: number;
    isPlaying: boolean;
    onPlay: () => void;
    className?: string;
}

const VideoCard = ({ src, title, thumbnail, index, isPlaying, onPlay, className = "aspect-video" }: VideoCardProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Intersection Observer — only load the video when it's near the viewport
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el);
                }
            },
            { rootMargin: '200px' } // Start loading 200px before visible
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Play/pause logic
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isPlaying) {
            video.play().catch(() => { }); // Catch autoplay errors
        } else {
            video.pause();
        }
    }, [isPlaying, videoLoaded]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasInteracted) setHasInteracted(true);
        onPlay();
    }, [hasInteracted, onPlay]);

    const handleVideoLoaded = useCallback(() => {
        setVideoLoaded(true);
    }, []);

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: Math.min(index * 0.08, 0.3) }}
            className={`group relative rounded-xl overflow-hidden cursor-pointer ${className}`}
            onClick={handleClick}
        >
            {/* Thumbnail poster — always visible until video is playing + loaded */}
            {thumbnail && (
                <img
                    src={thumbnail}
                    alt={title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isPlaying && videoLoaded ? 'opacity-0' : 'opacity-100'
                        }`}
                    loading="lazy"
                    decoding="async"
                />
            )}

            {/* Shimmer skeleton when no thumbnail */}
            {!thumbnail && !videoLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-pulse" />
            )}

            {/* Video element — only rendered when near viewport AND user has interacted or is Playing */}
            {isVisible && (hasInteracted || isPlaying) && (
                <video
                    ref={videoRef}
                    src={src}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isPlaying && videoLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                    playsInline
                    preload="auto"
                    loop
                    muted
                    onLoadedData={handleVideoLoaded}
                    poster={thumbnail}
                />
            )}

            {/* Magic Glow Border */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-visio-teal/50 rounded-xl transition-colors duration-500 pointer-events-none z-10" />

            {/* Play Overlay */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 z-20 ${isPlaying && videoLoaded ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20 transform group-hover:scale-110 transition-transform duration-300">
                    {isPlaying && videoLoaded ? (
                        <div className="w-6 h-6 flex gap-1 justify-center items-center">
                            <div className="w-2 h-6 bg-white rounded-full animate-bounce" />
                            <div className="w-2 h-6 bg-white rounded-full animate-bounce [animation-delay:0.1s]" />
                        </div>
                    ) : (
                        <Play className="text-white fill-white ml-1" size={28} />
                    )}
                </div>
            </div>

            {/* Title Overlay on Hover */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20">
                <p className="text-white font-medium text-sm">{title}</p>
            </div>
        </motion.div>
    );
};

export default VideoCard;
