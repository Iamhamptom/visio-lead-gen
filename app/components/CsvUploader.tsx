import React, { useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { VisioOrb } from './VisioOrb';

interface CsvUploaderProps {
    onFileLoaded: (csvData: string, fileName: string) => void;
    onReset: () => void;
    isLoading?: boolean;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onFileLoaded, onReset, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const processFile = (file: File) => {
        setError(null);
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            setError('Please upload a valid CSV file.');
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            onFileLoaded(content, file.name);
        };
        reader.readAsText(file);
    };

    const handleClear = () => {
        setFileName(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onReset();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleDownloadTemplate = () => {
        const headers = ["Handle", "Followers", "Engagement Rate", "Avg Views"];
        const rows = [
            ["@example_user", "15000", "3.5", "5000"],
            ["@another_creator", "50000", "2.1", "12000"]
        ];
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "visio_reach_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            {!fileName ? (
                <div
                    className="border-2 border-dashed border-white/10 rounded-2xl p-8 hover:bg-white/5 transition-colors cursor-pointer flex flex-col items-center justify-center text-center gap-4 group"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <Upload size={20} className="text-white/40 group-hover:text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-white mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs text-white/40">CSV files only (Max 2MB)</p>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}
                        className="text-[10px] text-visio-teal hover:underline mt-2"
                    >
                        Download Template
                    </button>
                    {error && (
                        <div className="text-xs text-red-400 flex items-center gap-1 mt-2">
                            <AlertCircle size={10} />
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                            <FileText size={20} className="text-visio-teal" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white truncate max-w-[150px]">{fileName}</p>
                            <p className="text-xs text-white/40">Ready to calculate</p>
                        </div>
                    </div>
                    {isLoading ? (
                        <VisioOrb active={true} size="sm" />
                    ) : (
                        <button
                            onClick={handleClear}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv"
                className="hidden"
            />
        </div>
    );
};
