/**
 * One-time script to enrich db_ZA.json with Instagram profile picture URLs
 * Uses Apify Instagram Profile Scraper actor via curl (to bypass sandbox DNS issues)
 *
 * Usage: APIFY_API_TOKEN=<token> npx tsx scripts/enrich-profile-pics.ts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const APIFY_ACTOR = 'apify~instagram-profile-scraper';
const BATCH_SIZE = 20;

interface Contact {
    id: string;
    person: string;
    instagram: string;
    profilePic?: string;
    [key: string]: any;
}

function runApifyBatch(usernames: string[], token: string): Record<string, string> {
    const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?token=${token}`;
    const payload = JSON.stringify({ usernames });

    try {
        const result = execSync(
            `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}'`,
            { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
        ).toString();

        const items: any[] = JSON.parse(result);
        const map: Record<string, string> = {};

        for (const item of items) {
            const username = (item.username || '').toLowerCase();
            const pic = item.profilePicUrl || item.profilePicUrlHD || item.profile_pic_url || '';
            if (username && pic) {
                map[username] = pic;
            }
        }

        return map;
    } catch (err: any) {
        console.error(`  -> curl error: ${err.message?.substring(0, 200)}`);
        return {};
    }
}

function main() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.error('Error: APIFY_API_TOKEN environment variable is required');
        process.exit(1);
    }

    // Read data
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const contacts: Contact[] = JSON.parse(raw);
    console.log(`Loaded ${contacts.length} contacts from db_ZA.json`);

    // Extract unique IG handles
    const handleMap = new Map<string, string[]>();
    for (const c of contacts) {
        if (c.instagram) {
            const handle = c.instagram.replace(/^@/, '').toLowerCase().trim();
            if (handle) {
                if (!handleMap.has(handle)) handleMap.set(handle, []);
                handleMap.get(handle)!.push(c.id);
            }
        }
    }

    const allHandles = Array.from(handleMap.keys());
    console.log(`Found ${allHandles.length} unique Instagram handles`);

    // Process in batches
    const allResults: Record<string, string> = {};
    let enriched = 0;

    for (let i = 0; i < allHandles.length; i += BATCH_SIZE) {
        const batch = allHandles.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(allHandles.length / BATCH_SIZE);
        console.log(`\nBatch ${batchNum}/${totalBatches}: Processing ${batch.length} handles...`);

        const results = runApifyBatch(batch, token);
        const found = Object.keys(results).length;
        enriched += found;
        Object.assign(allResults, results);
        console.log(`  -> Got ${found}/${batch.length} profile pics (total: ${enriched})`);
    }

    // Apply results to contacts
    let updated = 0;
    for (const c of contacts) {
        if (c.instagram) {
            const handle = c.instagram.replace(/^@/, '').toLowerCase().trim();
            if (allResults[handle]) {
                c.profilePic = allResults[handle];
                updated++;
            }
        }
    }

    // Write back
    fs.writeFileSync(DATA_PATH, JSON.stringify(contacts, null, 2));
    console.log(`\nDone! Updated ${updated}/${contacts.length} contacts with profile pics.`);
    console.log(`Total enriched: ${enriched}/${allHandles.length} handles`);
}

main();
