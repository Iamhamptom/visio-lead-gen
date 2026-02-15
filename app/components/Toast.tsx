import React, { useEffect } from 'react';
import { CheckCircle, X, Bell } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'leads-ready' | 'error';
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const duration = type === 'leads-ready' ? 5000 : 3000;
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [onClose, type]);

    const isLeadsReady = type === 'leads-ready' || message.toLowerCase().includes('leads are ready');

    return (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
            <div className={`backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border ${
                isLeadsReady
                    ? 'bg-gradient-to-r from-emerald-500/90 to-teal-500/90 text-white border-emerald-400/30'
                    : type === 'error'
                        ? 'bg-red-500/90 text-white border-red-400/30'
                        : 'bg-white/90 text-black border-white/20'
            }`}>
                <div className={`p-1 rounded-full ${
                    isLeadsReady
                        ? 'bg-white/20 text-white'
                        : type === 'error'
                            ? 'bg-white/20 text-white'
                            : 'bg-green-100 text-green-600'
                }`}>
                    {isLeadsReady ? <Bell size={16} strokeWidth={3} /> : <CheckCircle size={16} strokeWidth={3} />}
                </div>
                <span className="text-sm font-semibold pr-2">{message}</span>
                <button onClick={onClose} className={`transition-colors ${
                    isLeadsReady || type === 'error' ? 'text-white/40 hover:text-white' : 'text-black/20 hover:text-black'
                }`}>
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
