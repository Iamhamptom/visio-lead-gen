import React from 'react';
import { Users, Eye, Heart, BarChart } from 'lucide-react';

interface MetricsInputProps {
    values: {
        followers: number;
        avgViews: number;
        engagementRate: number;
    };
    onChange: (key: string, value: number) => void;
}

export const MetricsInput: React.FC<MetricsInputProps> = ({ values, onChange }) => {
    return (
        <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-2">Target Metrics</h3>

            <div className="space-y-4">
                <InputRow
                    label="Followers"
                    icon={<Users size={16} />}
                    value={values.followers}
                    onChange={(v) => onChange('followers', v)}
                    step={100}
                />
                <InputRow
                    label="Avg. Views"
                    icon={<Eye size={16} />}
                    value={values.avgViews}
                    onChange={(v) => onChange('avgViews', v)}
                    step={100}
                />
                <InputRow
                    label="Engagement Rate (%)"
                    icon={<Heart size={16} />}
                    value={values.engagementRate}
                    onChange={(v) => onChange('engagementRate', v)}
                    step={0.1}
                />
            </div>
        </div>
    );
};

interface InputRowProps {
    label: string;
    icon: React.ReactNode;
    value: number;
    onChange: (value: number) => void;
    step: number;
}

const InputRow = ({ label, icon, value, onChange, step }: InputRowProps) => (
    <div className="flex flex-col gap-1">
        <label className="text-xs text-white/40 flex items-center gap-2">
            {icon} {label}
        </label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step={step}
            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-visio-teal focus:outline-none transition-colors"
        />
    </div>
);
