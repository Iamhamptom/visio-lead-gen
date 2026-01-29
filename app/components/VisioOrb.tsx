import React from 'react';

interface VisioOrbProps {
    active?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export const VisioOrb: React.FC<VisioOrbProps> = ({ active = true, size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-24 h-24', // Chat size
        lg: 'w-32 h-32'
    };

    return (
        <div className={`relative flex items-center justify-center ${sizeClasses[size]} mx-auto my-4 animate-float`}>
            {/* Background Glow */}
            <div
                className={`absolute inset-0 bg-visio-accent/20 rounded-full blur-3xl transition-all duration-1000 ${active ? 'opacity-100 scale-150' : 'opacity-20 scale-75'
                    }`}
            />

            {/* Outer Ring - Slow Reverse Spin */}
            <div
                className={`absolute inset-0 rounded-full border border-visio-teal/30 border-t-visio-teal border-l-transparent transition-all duration-700 ${active ? 'animate-spin opacity-100' : 'opacity-30'
                    }`}
                style={{
                    animationDuration: active ? '3s' : '10s',
                    animationDirection: 'reverse'
                }}
            />

            {/* Middle Ring - Fast Spin */}
            <div
                className={`absolute inset-2 rounded-full border-2 border-transparent border-r-visio-accent border-b-visio-accent/50 transition-all duration-700 ${active ? 'animate-spin opacity-100' : 'opacity-0'
                    }`}
                style={{ animationDuration: active ? '1.5s' : '5s' }}
            />

            {/* Core Orb */}
            <div
                className={`relative w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-visio-teal to-visio-accent shadow-[0_0_30px_rgba(182,240,156,0.4)] transition-all duration-500 ${active ? 'scale-100 brightness-125 animate-pulse' : 'scale-75 brightness-75'
                    }`}
            >
                <div
                    className={`absolute inset-0 bg-white/40 blur-sm rounded-full ${active ? 'animate-pulse' : ''}`}
                    style={{ animationDuration: '2s' }}
                ></div>
            </div>
        </div>
    );
};
