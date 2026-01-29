import React, { useState, useEffect } from 'react';
import { Search, User, Check, Music } from 'lucide-react';
import { Target } from '../types';
import { searchTargets } from '../reason/actions';
import { VisioOrb } from './VisioOrb';

interface TargetPickerProps {
    selectedTargetId: string | null;
    onSelect: (targetId: string) => void;
}

export const TargetPicker: React.FC<TargetPickerProps> = ({ selectedTargetId, onSelect }) => {
    const [query, setQuery] = useState('');
    const [targets, setTargets] = useState<Target[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadTargets = async () => {
            setIsLoading(true);
            const results = await searchTargets(query);
            setTargets(results);
            setIsLoading(false);
        };

        const debounce = setTimeout(loadTargets, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search influencers, blogs, playlists..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/30 focus:border-visio-teal focus:outline-none transition-colors"
                />
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <VisioOrb active={true} size="sm" />
                    </div>
                ) : targets.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-sm">No targets found</div>
                ) : (
                    targets.map(target => (
                        <div
                            key={target.id}
                            onClick={() => onSelect(target.id)}
                            className={`p-3 rounded-xl border cursor-pointer hover:bg-white/5 transition-all flex items-center gap-3 ${selectedTargetId === target.id ? 'bg-visio-teal/10 border-visio-teal' : 'bg-white/5 border-transparent'}`}
                        >
                            <img src={target.avatarUrl} alt={target.name} className="w-10 h-10 rounded-full object-cover" />
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-white font-medium text-sm truncate">{target.name}</h4>
                                <p className="text-white/40 text-xs flex items-center gap-1.5">
                                    <span className="capitalize">{target.platform}</span> • {target.followers.toLocaleString()}
                                </p>
                            </div>
                            {selectedTargetId === target.id && (
                                <div className="w-6 h-6 rounded-full bg-visio-teal text-black flex items-center justify-center">
                                    <Check size={14} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
