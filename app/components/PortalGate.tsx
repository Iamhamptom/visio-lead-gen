import React from 'react';
import { ExternalLink, RefreshCw, Lock } from 'lucide-react';

interface PortalGateProps {
    onRefresh: () => void;
    isLoading?: boolean;
}

export const PortalGate: React.FC<PortalGateProps> = ({ onRefresh, isLoading = false }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-6 text-center z-50">
            <div className="max-w-md w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-visio-teal/10 blur-3xl rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 ring-1 ring-white/10">
                        <Lock className="w-8 h-8 text-visio-teal" />
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-3 font-outfit">Unlock Your PR Assistant</h2>

                    <p className="text-white/60 mb-8 leading-relaxed">
                        To generate media leads and strategy, Visio needs to know your <span className="text-white font-medium">Sonic DNA</span> and <span className="text-white font-medium">Brand Identity</span>. Manage this in your Artist Portal.
                    </p>

                    <div className="flex flex-col w-full gap-3">
                        <a
                            href="https://portal.visio.ai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-visio-teal to-visio-sage text-black font-bold py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(45,212,191,0.3)] transition-all transform hover:-translate-y-0.5"
                        >
                            Build My Artist Portal
                            <ExternalLink size={16} />
                        </a>

                        <button
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white hover:bg-white/10 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw size={16} />
                                    I've Updated My Portal
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
