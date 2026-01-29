import React from 'react';
import { BatchReachResult, ReachResult, ReachScenario } from '../types';

interface ReachResultsProps {
    result: ReachResult | BatchReachResult;
    isBatch?: boolean;
}

export const ReachResults: React.FC<ReachResultsProps> = ({ result, isBatch = false }) => {
    const cost = isBatch ? (result as BatchReachResult).totalCost : (result as ReachResult).cost;
    const placement = result.placement;

    return (
        <div className="h-full bg-black/20 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 bg-white/5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-visio-accent animate-pulse" />
                    {isBatch ? 'Collective Projection' : 'Projected Performance'}
                </h2>
                <div className="flex gap-4 mt-2 text-xs text-white/40 font-mono">
                    <span>${cost.toLocaleString()} Budget</span>
                    <span>•</span>
                    <span className="capitalize">{placement.count}x {placement.type.replace('_', ' ')} {isBatch ? 'per page' : ''}</span>
                </div>
            </div>

            <div className="p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-xs text-white/30 uppercase tracking-wider">
                            <th className="py-4 font-medium">Metric</th>
                            <th className="py-4 font-medium text-right text-white/50">Conservative (Low)</th>
                            <th className="py-4 font-medium text-right text-visio-teal/80">Expected (Base)</th>
                            <th className="py-4 font-medium text-right text-visio-accent/80">Viral (High)</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm font-mono">
                        <ResultRow
                            label="Total Reach"
                            low={result.scenarios.low.reach}
                            base={result.scenarios.base.reach}
                            high={result.scenarios.high.reach}
                            format
                        />
                        <ResultRow
                            label="Impressions"
                            low={result.scenarios.low.impressions}
                            base={result.scenarios.base.impressions}
                            high={result.scenarios.high.impressions}
                            format
                        />
                        <ResultRow
                            label="Est. Clicks"
                            low={result.scenarios.low.clicks}
                            base={result.scenarios.base.clicks}
                            high={result.scenarios.high.clicks}
                            format
                        />
                        <tr className="h-4" /> {/* Spacer */}
                        <ResultRow
                            label="CPM ($)"
                            low={result.scenarios.low.cpm}
                            base={result.scenarios.base.cpm}
                            high={result.scenarios.high.cpm}
                            prefix="$"
                            inverse // Lower is better
                        />
                        <ResultRow
                            label="CPC ($)"
                            low={result.scenarios.low.cpc}
                            base={result.scenarios.base.cpc}
                            high={result.scenarios.high.cpc}
                            prefix="$"
                            inverse
                        />
                        <ResultRow
                            label="CPE ($)"
                            low={result.scenarios.low.cpe}
                            base={result.scenarios.base.cpe}
                            high={result.scenarios.high.cpe}
                            prefix="$"
                            inverse
                        />
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ResultRow = ({ label, low, base, high, format, prefix = '', inverse }: any) => {
    const formatVal = (v: number) => format ? v.toLocaleString() : v.toFixed(2);

    // Highlight 'best' value
    const isBest = (val: number, comp1: number, comp2: number) => inverse ? val < comp1 && val < comp2 : val > comp1 && val > comp2;

    return (
        <tr className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
            <td className="py-4 text-white/60 font-medium font-sans">{label}</td>
            <td className="py-4 text-right text-white/50">{prefix}{formatVal(low)}</td>
            <td className="py-4 text-right text-white font-bold">{prefix}{formatVal(base)}</td>
            <td className="py-4 text-right text-visio-accent">{prefix}{formatVal(high)}</td>
        </tr>
    );
};
