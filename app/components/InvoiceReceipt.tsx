'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Download, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

interface InvoiceReceiptProps {
    invoice: {
        id: string;
        invoiceNumber: string;
        planName?: string;
        tier: string;
        amount: number;
        amountFormatted?: string;
        currency: string;
        status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded';
        createdAt: string;
        dateFormatted?: string;
        paidAt?: string;
        paidDateFormatted?: string;
        paymentMethod?: {
            brand: string;
            last4: string;
        };
    };
    compact?: boolean;
    onDownload?: () => void;
}

const STATUS_CONFIG = {
    paid: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10', label: 'Paid' },
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Pending' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10', label: 'Failed' },
    refunded: { icon: XCircle, color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Refunded' },
    draft: { icon: FileText, color: 'text-white/40', bg: 'bg-white/5', label: 'Draft' }
};

export const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({
    invoice,
    compact = false,
    onDownload
}) => {
    const statusConfig = STATUS_CONFIG[invoice.status];
    const StatusIcon = statusConfig.icon;

    const formatAmount = (amount: number, currency: string) => {
        if (invoice.amountFormatted) return invoice.amountFormatted;
        const value = amount / 100;
        return currency === 'ZAR'
            ? `R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`
            : `$${value.toFixed(2)}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-ZA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    if (compact) {
        // Mini receipt for list view
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-xl transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                        <StatusIcon size={16} className={statusConfig.color} />
                    </div>
                    <div>
                        <p className="text-white font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-white/40 text-xs">
                            {invoice.planName || invoice.tier} • {invoice.dateFormatted || formatDate(invoice.createdAt)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-white font-bold">
                        {formatAmount(invoice.amount, invoice.currency)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusConfig.bg} ${statusConfig.color}`}>
                        {statusConfig.label}
                    </span>
                    {onDownload && (
                        <button
                            onClick={onDownload}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <Download size={14} className="text-white/40" />
                        </button>
                    )}
                </div>
            </motion.div>
        );
    }

    // Full receipt view
    return (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden max-w-md mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-visio-teal/20 to-visio-accent/20 px-6 py-8 text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bg} mb-4`}>
                    <StatusIcon size={14} className={statusConfig.color} />
                    <span className={`text-xs font-bold uppercase ${statusConfig.color}`}>
                        {statusConfig.label}
                    </span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-1">
                    {formatAmount(invoice.amount, invoice.currency)}
                </h2>
                <p className="text-white/60">
                    {invoice.planName || invoice.tier} Subscription
                </p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                    <span className="text-white/40">Invoice Number</span>
                    <span className="text-white font-mono">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-white/40">Date</span>
                    <span className="text-white">{invoice.dateFormatted || formatDate(invoice.createdAt)}</span>
                </div>
                {invoice.paidAt && (
                    <div className="flex justify-between text-sm">
                        <span className="text-white/40">Paid On</span>
                        <span className="text-white">{invoice.paidDateFormatted || formatDate(invoice.paidAt)}</span>
                    </div>
                )}
                {invoice.paymentMethod && (
                    <div className="flex justify-between text-sm">
                        <span className="text-white/40">Payment Method</span>
                        <span className="text-white capitalize">
                            {invoice.paymentMethod.brand} •••• {invoice.paymentMethod.last4}
                        </span>
                    </div>
                )}

                <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="flex justify-between">
                        <span className="text-white font-medium">Total</span>
                        <span className="text-white font-bold text-lg">
                            {formatAmount(invoice.amount, invoice.currency)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer */}
            {onDownload && (
                <div className="px-6 pb-6">
                    <button
                        onClick={onDownload}
                        className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-medium transition-colors"
                    >
                        <Download size={16} />
                        Download Receipt
                    </button>
                </div>
            )}
        </div>
    );
};

export default InvoiceReceipt;
