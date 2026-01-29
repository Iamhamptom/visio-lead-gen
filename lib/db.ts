import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export interface DBLead {
    id: string;
    company: string;
    person: string;
    title: string;
    email: string;
    country: string;
    industry: string;
    source: string;
    dateAdded: string;
    // Extended fields for SA database
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    followers?: string;
    status?: string;
}

// Parse follower count strings like "622K", "1.2M", "253K IG / 487K X" into numbers
// For multi-platform formats, extract the HIGHEST individual count
export function parseFollowerCount(str: string | undefined): number {
    if (!str || str === '—' || str === '-') return 0;

    // Find all number+suffix patterns (e.g., "253K", "1.2M", "500", "487K")
    // Use matchAll to capture number and suffix separately
    const pattern = /(\d+(?:\.\d+)?)\s*(K|M|B)?/gi;
    const matches = [...str.matchAll(pattern)];

    if (matches.length === 0) return 0;

    // Convert each match to a number and find the highest
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

export function getLeadsByCountry(countryCode: string): DBLead[] {
    const file = path.join(DATA_DIR, `db_${countryCode}.json`);
    if (!fs.existsSync(file)) return [];

    try {
        const data = fs.readFileSync(file, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error(`Error reading DB for ${countryCode}:`, e);
        return [];
    }
}

export function getAvailableCountries(): string[] {
    try {
        const files = fs.readdirSync(DATA_DIR);
        return files
            .filter(f => f.startsWith('db_') && f.endsWith('.json'))
            .map(f => f.replace('db_', '').replace('.json', ''));
    } catch {
        return [];
    }
}

export function getDatabaseSummary(): { country: string; count: number }[] {
    const countries = getAvailableCountries();
    return countries.map(c => ({
        country: c,
        count: getLeadsByCountry(c).length
    }));
}

// Smart filtering interface
export interface FilterOptions {
    country?: string;
    category?: string;
    minFollowers?: number;
    maxFollowers?: number;
    searchTerm?: string;
    limit?: number;
    offset?: number;
}

// Filter leads with smart matching
export function filterLeads(leads: DBLead[], options: FilterOptions): { results: DBLead[]; total: number } {
    let filtered = [...leads];

    // Filter by category/industry (normalize hyphens/spaces for flexible matching)
    if (options.category) {
        const cat = options.category.toLowerCase().replace(/[\s-]/g, '');
        filtered = filtered.filter(l => {
            const industry = (l.industry || '').toLowerCase().replace(/[\s-]/g, '');
            const title = (l.title || '').toLowerCase().replace(/[\s-]/g, '');
            return industry.includes(cat) || title.includes(cat);
        });
    }

    // Filter by follower count
    if (options.minFollowers) {
        filtered = filtered.filter(l => {
            const count = parseFollowerCount(l.followers);
            return count >= (options.minFollowers || 0);
        });
    }

    if (options.maxFollowers) {
        filtered = filtered.filter(l => {
            const count = parseFollowerCount(l.followers);
            return count <= (options.maxFollowers || Infinity);
        });
    }

    // Search term matching
    if (options.searchTerm) {
        const term = options.searchTerm.toLowerCase();
        filtered = filtered.filter(l =>
            (l.person || '').toLowerCase().includes(term) ||
            (l.company || '').toLowerCase().includes(term) ||
            (l.industry || '').toLowerCase().includes(term) ||
            (l.instagram || '').toLowerCase().includes(term) ||
            (l.title || '').toLowerCase().includes(term)
        );
    }

    // Sort by follower count (descending)
    filtered.sort((a, b) => parseFollowerCount(b.followers) - parseFollowerCount(a.followers));

    const total = filtered.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    filtered = filtered.slice(offset, offset + limit);

    return { results: filtered, total };
}

export function saveLead(countryCode: string, lead: DBLead) {
    const file = path.join(DATA_DIR, `db_${countryCode}.json`);
    let leads: DBLead[] = [];

    if (fs.existsSync(file)) {
        try {
            leads = JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch (e) { leads = []; }
    }

    // Dedupe by email or instagram
    const isDupe = leads.some(l =>
        (l.email && l.email === lead.email) ||
        (l.instagram && l.instagram === lead.instagram)
    );

    if (!isDupe) {
        leads.push(lead);
        fs.writeFileSync(file, JSON.stringify(leads, null, 2));
        return true;
    }
    return false;
}
