'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck, CreditCard } from 'lucide-react';
// import { getYocoPublicKey } from '@/lib/yoco'; 

// Declare global Yoco SDK
declare global {
    interface Window {
        YocoSDK: any;
    }
}

interface YocoCardFormProps {
    onSuccess: (token: string) => void;
    onError: (error: string) => void;
    amountInCents?: number;
}

export const YocoCardForm: React.FC<YocoCardFormProps> = ({
    onSuccess,
    onError,
    amountInCents = 100 // Default to 1.00 for validation if 0
}) => {
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formContainerRef = useRef<HTMLDivElement>(null);
    const sdkRef = useRef<any>(null);
    const uniqueId = useRef(`yoco-form-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        // Initialize Yoco SDK
        const initYoco = async () => {
            try {
                if (!window.YocoSDK) {
                    throw new Error('Yoco SDK not loaded. Refresh page.');
                }

                // Fetch Public Key
                const res = await fetch('/api/payments/setup');
                const data = await res.json();

                if (!res.ok || !data.publicKey) {
                    // Try env fallback
                    const envKey = process.env.NEXT_PUBLIC_YOCO_LIVE_PUBLIC_KEY || process.env.NEXT_PUBLIC_YOCO_TEST_PUBLIC_KEY;
                    if (!envKey) {
                        throw new Error(data.error || 'Yoco Public Key missing');
                    }
                    data.publicKey = envKey;
                }

                const publicKey = data.publicKey;
                console.log('Initializing Yoco (new method) with key:', publicKey);

                const yoco = new window.YocoSDK({
                    publicKey: publicKey
                });

                // Create Inline Form Object
                // Use 'inline' method which returns an object with 'mount'
                if (typeof yoco.inline !== 'function') {
                    throw new Error("SDK method 'inline' missing. Check API version.");
                }

                const inline = yoco.inline({
                    layout: 'basic',
                    amountInCents: amountInCents || 100,
                    currency: 'ZAR'
                });

                // Keep reference to invoke createToken later
                sdkRef.current = inline;

                // Mount
                if (formContainerRef.current) {
                    formContainerRef.current.innerHTML = '';
                    inline.mount(`#${uniqueId.current}`);
                    setLoading(false);
                }

            } catch (err: any) {
                console.error('Yoco Init Error:', err);
                const msg = err.message || 'Failed to initialize payment form';
                setError(msg);
                onError(msg);
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            if (window.YocoSDK) {
                initYoco();
            } else {
                setTimeout(() => {
                    if (window.YocoSDK) initYoco();
                    else {
                        const e = "Could not load payment system. Internet issue?";
                        setError(e);
                        onError(e);
                    }
                }, 1500);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [onSuccess, onError, amountInCents]);

    const handleSubmit = async () => {
        if (!sdkRef.current) {
            setError("Payment form not ready");
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            // Using the new V1 SDK pattern: createToken() returns Promise
            const result = await sdkRef.current.createToken();

            if (result.error) {
                setError(result.error.message);
                setProcessing(false);
            } else if (result.id) {
                onSuccess(result.id);
                // Don't stop processing here, let parent close modal
            } else {
                setError("Unknown error: No token received");
                setProcessing(false);
            }
        } catch (err: any) {
            console.error("Tokenization Error:", err);
            setError(err.message || "Payment processing failed");
            setProcessing(false);
        }
    };

    return (
        <div className="w-full">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-xs">
                    {error}
                </div>
            )}

            <div className={`transition-opacity duration-300 ${loading ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                {/* White Container */}
                <div className="bg-white rounded-lg p-4 shadow-inner min-h-[50px] mb-4">
                    <div id={uniqueId.current} ref={formContainerRef} className="min-h-[200px] w-full" />
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={processing || loading}
                    className="w-full bg-visio-teal text-black font-semibold py-3 rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {processing ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    {processing ? 'Processing...' : 'Save Card securely'}
                </button>
            </div>

            {loading && (
                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                    <Loader2 className="animate-spin mb-2" />
                    <p className="text-xs">Connecting to Secure Gateway...</p>
                </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-2 text-white/30 text-[10px] uppercase tracking-wider">
                <CreditCard size={12} />
                Secured by Yoco
            </div>
        </div>
    );
};
