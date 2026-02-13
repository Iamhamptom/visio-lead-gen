/**
 * Yoco Payment Gateway Integration
 * Docs: https://developer.yoco.com/api-reference/checkout-api
 */

const YOCO_API_BASE = 'https://payments.yoco.com/api';

// Pricing in cents (ZAR)
export const PLAN_PRICING = {
    artist: 0, // Free
    starter: 19900, // R199 (~$10 USD)
    artiste: 57000, // R570 (~$30 USD)
    starter_label: 95000, // R950 (~$50 USD)
    label: 179900, // R1,799
    agency: 449900, // R4,499
    enterprise: 0 // Custom (contact sales)
} as const;

export const PLAN_NAMES = {
    artist: 'Artist Base',
    starter: 'Starter',
    artiste: 'Artiste',
    starter_label: 'Starter Label',
    label: 'Label Pro',
    agency: 'Agency Elite',
    enterprise: 'Enterprise'
} as const;

export type PlanTier = keyof typeof PLAN_PRICING;

/**
 * Get the appropriate Yoco secret key based on environment
 */
export function getYocoSecretKey(): string {
    const mode = process.env.YOCO_MODE || 'test';
    return mode === 'live'
        ? process.env.YOCO_LIVE_SECRET_KEY || ''
        : process.env.YOCO_TEST_SECRET_KEY || '';
}

/**
 * Get the appropriate Yoco public key based on environment
 */
export function getYocoPublicKey(): string {
    const mode = process.env.YOCO_MODE || 'test';
    return mode === 'live'
        ? process.env.YOCO_LIVE_PUBLIC_KEY || ''
        : process.env.YOCO_TEST_PUBLIC_KEY || '';
}

export interface YocoCheckoutResponse {
    id: string;
    // Yoco may return additional success states depending on endpoint/version.
    status: 'created' | 'completed' | 'expired' | 'succeeded' | string;
    amount: number;
    currency: string;
    redirectUrl: string;
    paymentId: string | null;
    successUrl: string;
    cancelUrl: string;
    failureUrl: string;
    metadata: Record<string, string> | null;
    merchantId: string;
    processingMode: 'live' | 'test';
}

export interface CreateCheckoutParams {
    tier: PlanTier;
    userId?: string;
    email?: string;
    successUrl: string;
    cancelUrl: string;
    failureUrl: string;
}

/**
 * Create a Yoco checkout session
 */
export async function createYocoCheckout(params: CreateCheckoutParams): Promise<YocoCheckoutResponse> {
    const secretKey = getYocoSecretKey();

    if (!secretKey) {
        throw new Error('Yoco secret key not configured');
    }

    const amount = PLAN_PRICING[params.tier];

    if (amount <= 0) {
        throw new Error(`Plan "${params.tier}" is not available for online checkout`);
    }

    const response = await fetch(`${YOCO_API_BASE}/checkouts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount,
            currency: 'ZAR',
            successUrl: params.successUrl,
            cancelUrl: params.cancelUrl,
            failureUrl: params.failureUrl,
            metadata: {
                tier: params.tier,
                userId: params.userId || 'anonymous',
                email: params.email || ''
            }
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Yoco API error: ${error.message || response.statusText}`);
    }

    return response.json();
}

/**
 * Fetch an existing Yoco checkout by ID.
 */
export async function getYocoCheckout(checkoutId: string): Promise<YocoCheckoutResponse> {
    const secretKey = getYocoSecretKey();
    if (!secretKey) {
        throw new Error('Yoco secret key not configured');
    }

    const response = await fetch(`${YOCO_API_BASE}/checkouts/${checkoutId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Yoco API error: ${error.message || response.statusText}`);
    }

    return response.json();
}

/**
 * Charge a Yoco Token (Recurring/Saved Card)
 */
export async function chargeYocoToken(token: string, amountInCents: number, currency: string = 'ZAR'): Promise<any> {
    const secretKey = getYocoSecretKey();
    if (!secretKey) throw new Error('Yoco secret key not configured');

    const response = await fetch(`${YOCO_API_BASE}/charges`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${secretKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token,
            amountInCents,
            currency
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Payment failed');
    }

    return response.json();
}
