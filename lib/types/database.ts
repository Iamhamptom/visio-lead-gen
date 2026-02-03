/**
 * Database Types for Subscription Management
 */

import { SubscriptionTier } from '@/app/types';

export interface Subscriber {
    id: string;
    email: string;
    name?: string;
    tier: SubscriptionTier;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'pending';
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
    renewalDate?: string; // ISO date
    yocoCustomerId?: string;
    metadata?: Record<string, string>;
}

export interface InvoiceLineItem {
    description: string;
    amount: number; // in cents
    quantity: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string; // e.g., "INV-2026-001"
    subscriberId: string;
    email: string;
    tier: SubscriptionTier;
    status: 'draft' | 'pending' | 'paid' | 'failed' | 'refunded';
    amount: number; // in cents (ZAR)
    currency: string;
    lineItems: InvoiceLineItem[];
    createdAt: string; // ISO date
    paidAt?: string; // ISO date
    dueDate?: string; // ISO date
    paymentMethod?: {
        brand: string; // e.g., "visa", "mastercard"
        last4: string;
    };
    yocoCheckoutId?: string;
    yocoPaymentId?: string;
    metadata?: Record<string, string>;
}

export interface Transaction {
    id: string;
    type: 'checkout_created' | 'payment_success' | 'payment_failed' | 'refund';
    checkoutId?: string;
    paymentId?: string;
    invoiceId?: string;
    subscriberId?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    rawWebhookData?: Record<string, unknown>;
}

// Database collections
export interface Database {
    subscribers: Subscriber[];
    invoices: Invoice[];
    transactions: Transaction[];
}
