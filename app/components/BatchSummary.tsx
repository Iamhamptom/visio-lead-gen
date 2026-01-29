import React from 'react';
import { Users, BarChart2, Hash } from 'lucide-react';
import { BatchReachResult } from '../types';

interface BatchSummaryProps {
    result: BatchReachResult;
}

export const BatchSummary: React.FC<BatchSummaryProps> = ({ result }) => {
    return (
        <div className="grid grid-cols-3 gap-4 mb-6">
            <SummaryCard
                label="Profiles Analyzed"
                value={result.pageCount.toLocaleString()}
                icon={<Hash size={16} className="text-visio-teal" />}
            />
            <SummaryCard
                label="Total Follower Base"
                value={(result.totalFollowers / 1000000).toFixed(1) + 'M'}
                subValue={result.totalFollowers.toLocaleString()}
                icon={<Users size={16} className="text-purple-400" />}
            />
            <SummaryCard
                label="Avg. Engagement"
                value={result.avgEngagementRate.toFixed(2) + '%'}
                icon={<BarChart2 size={16} className="text-visio-accent" />}
            />
        </div>
    );
};

const SummaryCard = ({ label, value, subValue, icon }: any) => (
    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</span>
            {icon}
        </div>
        <div>
            <div className="text-xl font-bold text-white">{value}</div>
            {subValue && <div className="text-[10px] text-white/40">{subValue}</div>}
        </div>
    </div>
);
