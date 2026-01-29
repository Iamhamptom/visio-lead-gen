import React from 'react';
import { PlacementType } from '../types';
import { Instagram, Video, Mic2, Star } from 'lucide-react';

interface PlacementBuilderProps {
    type: PlacementType;
    count: number;
    cost: number;
    onChangeType: (t: PlacementType) => void;
    onChangeCount: (c: number) => void;
    onChangeCost: (c: number) => void;
}

export const PlacementBuilder: React.FC<PlacementBuilderProps> = ({
    type, count, cost, onChangeType, onChangeCount, onChangeCost
}) => {
    const types: { id: PlacementType; label: string; icon: React.ReactNode }[] = [
        { id: 'story', label: 'Story', icon: <Instagram size={14} /> },
        { id: 'feed_post', label: 'Post', icon: <Instagram size={14} /> },
        { id: 'reel', label: 'Reel', icon: <Video size={14} /> },
        { id: 'shoutout', label: 'Shoutout', icon: <Mic2 size={14} /> },
    ];

    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-2">Campaign Setup</h3>

            {/* Placement Type Grid */}
            <div className="grid grid-cols-2 gap-2">
                {types.map(t => (
                    <button
                        key={t.id}
                        onClick={() => onChangeType(t.id)}
                        className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-all ${type === t.id
                                ? 'bg-visio-teal text-black shadow-lg shadow-visio-teal/10'
                                : 'bg-black/20 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        {t.icon}
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-white/40">Quantity</label>
                    <input
                        type="number"
                        min="1"
                        value={count}
                        onChange={(e) => onChangeCount(parseInt(e.target.value) || 1)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-visio-teal focus:outline-none"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-xs text-white/40">Total Budget ($)</label>
                    <input
                        type="number"
                        min="0"
                        value={cost}
                        onChange={(e) => onChangeCost(parseFloat(e.target.value) || 0)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-visio-accent font-mono text-sm focus:border-visio-accent focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
};
