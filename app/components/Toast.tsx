import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-white/90 backdrop-blur-md text-black px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-white/20">
                <div className="p-1 bg-green-100 rounded-full text-green-600">
                    <CheckCircle size={16} strokeWidth={3} />
                </div>
                <span className="text-sm font-semibold pr-2">{message}</span>
                <button onClick={onClose} className="text-black/20 hover:text-black transition-colors">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
