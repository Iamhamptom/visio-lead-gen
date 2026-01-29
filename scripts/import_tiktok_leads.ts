
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Define paths
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db_ZA.json');
const CSV_FILE = '/Volumes/HGARADIO-DRIVE1/Visio Research Labs/South Africa (Entertainment)/SA_Music_TikTok_PAGES_ONLY (1).csv';

interface DBLead {
    id: string;
    person: string;
    company: string;
    title: string;
    email: string;
    phone?: string;
    country: string;
    industry: string;
    source: string;
    dateAdded?: string;
    status?: string;
    // Socials
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    followers?: string;
}

interface TikTokRow {
    Page: string;
    Handle: string;
    Followers: string;
    Likes: string;
    Category: string;
    Contact: string;
    Notes: string;
}

// Utility to parse follower count for comparison
function parseFollowerCount(str: string | undefined): number {
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

function normalizeHandle(handle: string): string {
    if (!handle) return '';
    let clean = handle.trim();
    if (!clean.startsWith('@') && clean.length > 0) clean = '@' + clean;
    return clean.toLowerCase();
}

function main() {
    console.log('🚀 Starting TikTok Import...');

    // 1. Read Existing DB
    if (!fs.existsSync(DB_FILE)) {
        console.error('❌ DB File not found:', DB_FILE);
        return;
    }
    const dbData = fs.readFileSync(DB_FILE, 'utf-8');
    const leads: DBLead[] = JSON.parse(dbData);
    console.log(`📊 Current DB count: ${leads.length}`);

    // 2. Read CSV
    if (!fs.existsSync(CSV_FILE)) {
        console.error('❌ CSV File not found:', CSV_FILE);
        return;
    }
    const csvData = fs.readFileSync(CSV_FILE, 'utf-8');
    const records = parse(csvData, {
        columns: true,
        skip_empty_lines: true
    }) as TikTokRow[];
    console.log(`📄 CSV Records found: ${records.length}`);

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // 3. Process records
    for (const row of records) {
        // Skip empty rows
        if (!row.Page && !row.Handle) continue;

        const normalizedHandle = normalizeHandle(row.Handle);
        const tiktokFollowers = row.Followers;

        // Extract Email/Phone from Contact
        let email = '';
        let phone = '';
        const contact = row.Contact || '';

        const emailMatch = contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) email = emailMatch[0];

        const phoneMatch = contact.match(/(\d{3}\s\d{3}\s\d{4})|(\d{10})|(\d{2}\s\d{3}\s\d{4})/);
        // Basic phone extraction - can be improved
        if (phoneMatch) phone = phoneMatch[0];

        // CHECK FOR DUPLICATES
        // 1. Check by TikTok handle
        let existingIndex = -1;

        if (normalizedHandle) {
            existingIndex = leads.findIndex(l =>
                (l.tiktok && normalizeHandle(l.tiktok) === normalizedHandle) ||
                (l.instagram && normalizeHandle(l.instagram) === normalizedHandle) // Sometimes people put IG handle in TikTok column or reuse handle
            );
        }

        // 2. Check by Name (Fuzzy)
        if (existingIndex === -1 && row.Page) {
            existingIndex = leads.findIndex(l =>
                l.person.toLowerCase() === row.Page.toLowerCase() ||
                l.company.toLowerCase() === row.Page.toLowerCase()
            );
        }

        if (existingIndex !== -1) {
            // MERGE / UPDATE
            const existing = leads[existingIndex];
            let updated = false;

            if (!existing.tiktok && normalizedHandle) {
                existing.tiktok = row.Handle; // Store original casing preferrably, or just raw
                updated = true;
            }
            if (!existing.email && email) {
                existing.email = email;
                updated = true;
            }
            if (!existing.phone && phone) {
                existing.phone = phone;
                updated = true;
            }

            // Update follower count if TikTok count is higher
            const currentFollowers = parseFollowerCount(existing.followers);
            const newFollowers = parseFollowerCount(tiktokFollowers);

            if (newFollowers > currentFollowers) {
                existing.followers = tiktokFollowers; // Update to the higher count string
                updated = true;
            }

            if (updated) updatedCount++;
            else skippedCount++;

        } else {
            // NEW RECORD
            const newLead: DBLead = {
                id: (leads.length + 1 + addedCount).toString(),
                person: row.Page,
                company: row.Page,
                title: row.Category || 'Content Creator', // Fallback title
                email: email,
                phone: phone,
                country: 'ZA',
                industry: row.Category || 'Entertainment',
                source: `TikTok List - ${row.Notes || ''}`,
                dateAdded: new Date().toISOString().split('T')[0],
                status: 'New',
                tiktok: row.Handle,
                followers: tiktokFollowers
            };

            leads.push(newLead);
            addedCount++;
        }
    }

    // 4. Save DB
    fs.writeFileSync(DB_FILE, JSON.stringify(leads, null, 2));

    console.log('\n✅ Import Complete');
    console.log(`➕ Added: ${addedCount}`);
    console.log(`🔄 Updated: ${updatedCount}`);
    console.log(`⏭️ Skipped/Unchanged: ${skippedCount}`);
    console.log(`📊 New DB Total: ${leads.length}`);
}

main();
