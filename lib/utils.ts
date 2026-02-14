import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Parse follower count strings like "622K", "1.2M", "253K IG / 487K X" into numbers.
 * For multi-platform formats, extract the HIGHEST individual count.
 * Extracted from lib/db.ts for client-side use.
 */
export function parseFollowerCount(str: string | undefined): number {
    if (!str || str === '—' || str === '-') return 0;

    const pattern = /(\d+(?:\.\d+)?)\s*(K|M|B)?/gi;
    const matches = [...str.matchAll(pattern)];

    if (matches.length === 0) return 0;

    const numbers = matches.map(match => {
        const num = parseFloat(match[1]);
        const suffix = (match[2] || '').toUpperCase();

        let multiplier = 1;
        if (suffix === 'K') multiplier = 1000;
        else if (suffix === 'M') multiplier = 1000000;
        else if (suffix === 'B') multiplier = 1000000000;

        return Math.round(num * multiplier);
    });

    return Math.max(...numbers);
}
