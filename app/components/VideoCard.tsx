'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

interface VideoCardProps {
    src: string;
    title: string;
    index: number;
    isPlaying: boolean;
    onPlay: () => void;
    className?: string; // Allow overriding aspect ratio/styling
}

const VideoCard = ({ src, title, index, isPlaying, onPlay, className = "aspect-video" }: VideoCardProps) => {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (isPlaying) {
            videoRef.current?.play();
        } else {
            videoRef.current?.pause();
        }
    }, [isPlaying]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent bubbling if needed
        onPlay();
    };

    // Ensure video has a thumbnail frame by appending #t=1 if not present
    const videoSrc = React.useMemo(() => {
        if (src.includes('#t=')) return src;
        return `${src}#t=1`;
    }, [src]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`group relative rounded-xl overflow-hidden cursor-pointer ${className}`}
            onClick={togglePlay}
        >
            <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                playsInline
                preload="metadata"
                loop
                muted={!isPlaying} // Optionally mute when not playing to be safe, though pause handles it
            />
            {/* Magic Glow Border */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-visio-teal/50 rounded-xl transition-colors duration-500 pointer-events-none z-10" />

            {/* Play Overlay */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20 transform group-hover:scale-110 transition-transform duration-300">
                    {isPlaying ? (
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
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <p className="text-white font-medium text-sm">{title}</p>
            </div>
        </motion.div>
    );
};

export default VideoCard;
