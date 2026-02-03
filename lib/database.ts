/**
 * Local JSON Database for Subscription Management
 * Provides simple file-based persistence for subscribers, invoices, and transactions.
 * Can be replaced with Supabase or other database later.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Database, Subscriber, Invoice, Transaction } from './types/database';

const DATA_DIR = join(process.cwd(), '.data');
const DB_FILE = join(DATA_DIR, 'database.json');

// Ensure data directory exists
function ensureDataDir(): void {
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
}

// Initialize empty database
function getEmptyDatabase(): Database {
    return {
        subscribers: [],
        invoices: [],
        transactions: []
    };
}

// Read database from file
function readDatabase(): Database {
    ensureDataDir();
    if (!existsSync(DB_FILE)) {
        return getEmptyDatabase();
    }
    try {
        const data = readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(data) as Database;
    } catch {
        return getEmptyDatabase();
    }
}

// Write database to file
function writeDatabase(db: Database): void {
    ensureDataDir();
    writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Generate unique ID
export function generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

// Generate invoice number
export function generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const db = readDatabase();
    const yearInvoices = db.invoices.filter(inv =>
        inv.invoiceNumber.includes(`INV-${year}`)
    );
    const nextNumber = (yearInvoices.length + 1).toString().padStart(4, '0');
    return `INV-${year}-${nextNumber}`;
}

// ========== SUBSCRIBER OPERATIONS ==========

export async function getSubscribers(): Promise<Subscriber[]> {
    return readDatabase().subscribers;
}

export async function getSubscriberById(id: string): Promise<Subscriber | null> {
    const db = readDatabase();
    return db.subscribers.find(s => s.id === id) || null;
}

export async function getSubscriberByEmail(email: string): Promise<Subscriber | null> {
    const db = readDatabase();
    return db.subscribers.find(s => s.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createSubscriber(subscriber: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscriber> {
    const db = readDatabase();
    const now = new Date().toISOString();
    const newSubscriber: Subscriber = {
        ...subscriber,
        id: generateId('sub'),
        createdAt: now,
        updatedAt: now
    };
    db.subscribers.push(newSubscriber);
    writeDatabase(db);
    return newSubscriber;
}

export async function updateSubscriber(id: string, updates: Partial<Subscriber>): Promise<Subscriber | null> {
    const db = readDatabase();
    const index = db.subscribers.findIndex(s => s.id === id);
    if (index === -1) return null;

    db.subscribers[index] = {
        ...db.subscribers[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    writeDatabase(db);
    return db.subscribers[index];
}

export async function upsertSubscriberByEmail(
    email: string,
    data: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Subscriber> {
    const existing = await getSubscriberByEmail(email);
    if (existing) {
        return (await updateSubscriber(existing.id, data))!;
    }
    return createSubscriber(data);
}

// ========== INVOICE OPERATIONS ==========

export async function getInvoices(): Promise<Invoice[]> {
    return readDatabase().invoices;
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
    const db = readDatabase();
    return db.invoices.find(inv => inv.id === id) || null;
}

export async function getInvoicesBySubscriberId(subscriberId: string): Promise<Invoice[]> {
    const db = readDatabase();
    return db.invoices.filter(inv => inv.subscriberId === subscriberId);
}

export async function getInvoicesByEmail(email: string): Promise<Invoice[]> {
    const db = readDatabase();
    return db.invoices.filter(inv => inv.email.toLowerCase() === email.toLowerCase());
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>): Promise<Invoice> {
    const db = readDatabase();
    const newInvoice: Invoice = {
        ...invoice,
        id: generateId('inv'),
        invoiceNumber: generateInvoiceNumber(),
        createdAt: new Date().toISOString()
    };
    db.invoices.push(newInvoice);
    writeDatabase(db);
    return newInvoice;
}

export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    const db = readDatabase();
    const index = db.invoices.findIndex(inv => inv.id === id);
    if (index === -1) return null;

    db.invoices[index] = {
        ...db.invoices[index],
        ...updates
    };
    writeDatabase(db);
    return db.invoices[index];
}

// ========== TRANSACTION OPERATIONS ==========

export async function getTransactions(): Promise<Transaction[]> {
    return readDatabase().transactions;
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const db = readDatabase();
    const newTransaction: Transaction = {
        ...transaction,
        id: generateId('txn'),
        createdAt: new Date().toISOString()
    };
    db.transactions.push(newTransaction);
    writeDatabase(db);
    return newTransaction;
}

// ========== STATS ==========

export async function getSubscriptionStats(): Promise<{
    totalSubscribers: number;
    byTier: Record<string, number>;
    totalRevenue: number;
    recentInvoices: Invoice[];
}> {
    const db = readDatabase();
    const byTier: Record<string, number> = {};

    db.subscribers.forEach(sub => {
        byTier[sub.tier] = (byTier[sub.tier] || 0) + 1;
    });

    const paidInvoices = db.invoices.filter(inv => inv.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    const recentInvoices = [...db.invoices]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);

    return {
        totalSubscribers: db.subscribers.length,
        byTier,
        totalRevenue,
        recentInvoices
    };
}
