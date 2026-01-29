'use client';

import React, { useState } from 'react';
import { CsvUploader } from '../components/CsvUploader';
import { PlacementBuilder } from '../components/PlacementBuilder';
import { ReachResults } from '../components/ReachResults';
import { BatchSummary } from '../components/BatchSummary';
import { BatchReachResult, PlacementType } from '../types';
import { calculateBatchReach } from './actions';
import { VisioOrb } from '../components/VisioOrb';
import { Calculator, BarChart, ArrowLeft } from 'lucide-react';

interface ReachPageProps {
    onBack?: () => void;
}

export default function ReachPage({ onBack }: ReachPageProps) {
    const [csvData, setCsvData] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const [placement, setPlacement] = useState({
        type: 'story' as PlacementType,
        count: 1
    });

    const [cost, setCost] = useState(500); // Default higher for batch
    const [isCalculating, setIsCalculating] = useState(false);
    const [result, setResult] = useState<BatchReachResult | null>(null);

    const handleCalculate = async () => {
        if (!csvData) return;
        setIsCalculating(true);
        try {
            const res = await calculateBatchReach({
                csvData,
                placement,
                cost
            });
            setResult(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsCalculating(false);
        }
    };

    const handleReset = () => {
        setCsvData(null);
        setFileName(null);
        setResult(null);
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-visio-bg text-white overflow-hidden font-outfit">
            {/* LEFT PANEL: INPUTS */}
            <div className="w-full md:w-[400px] border-r border-white/5 p-6 flex flex-col gap-6 overflow-y-auto">
                <div>
                    <h1 className="text-2xl font-bold mb-1">Batch Calculator</h1>
                    <p className="text-white/40 text-sm">Upload influencer cohort to estimate collective reach.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">1. Upload Cohort</label>
                    <CsvUploader
                        onFileLoaded={(data, name) => { setCsvData(data); setFileName(name); }}
                        onReset={handleReset}
                        isLoading={isCalculating}
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider">2. Campaign Config</label>
                    <PlacementBuilder
                        type={placement.type}
                        count={placement.count}
                        cost={cost}
                        onChangeType={(t) => setPlacement(prev => ({ ...prev, type: t }))}
                        onChangeCount={(c) => setPlacement(prev => ({ ...prev, count: c }))}
                        onChangeCost={setCost}
                    />
                </div>

                <button
                    onClick={handleCalculate}
                    disabled={!csvData || isCalculating}
                    className="w-full py-4 bg-visio-teal text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                >
                    {isCalculating ? (
                        <>
                            <VisioOrb active={true} size="sm" />
                            <span>Processing Batch...</span>
                        </>
                    ) : (
                        <>
                            <Calculator size={18} />
                            <span>Calculate Projection</span>
                        </>
                    )}
                </button>
            </div>

            {/* RIGHT PANEL: RESULTS */}
            <div className="flex-1 bg-black/20 overflow-y-auto p-4 md:p-8">
                {!result ? (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                            <BarChart size={40} className="opacity-50" />
                        </div>
                        <p className="text-center max-w-sm">Upload a CSV on the left to analyze collective performance across multiple pages.</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto h-full animate-in slide-in-from-bottom-8 fade-in duration-500">
                        <BatchSummary result={result} />
                        <ReachResults result={result} isBatch={true} />
                    </div>
                )}
            </div>
        </div>
    );
}
