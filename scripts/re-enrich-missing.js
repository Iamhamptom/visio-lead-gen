/**
 * Re-enrich the 130 entries from the original 300 that are still missing profile pics.
 * Uses Apify Instagram Profile Scraper via curl.
 *
 * Usage: APIFY_API_TOKEN=<token> node scripts/re-enrich-missing.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const BATCH_SIZE = 15; // Smaller batches for better success rate

function runApifyBatch(usernames, token) {
    const actorId = 'apify~instagram-profile-scraper';
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
    const payload = JSON.stringify({ usernames });

    try {
        const result = execSync(
            `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}'`,
            { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
        ).toString();

        const items = JSON.parse(result);
        const map = {};

        for (const item of items) {
            const username = (item.username || '').toLowerCase();
            const pic = item.profilePicUrl || item.profilePicUrlHD || item.profile_pic_url || '';
            if (username && pic) {
                map[username] = pic;
            }
        }

        return map;
    } catch (err) {
        console.error(`  -> Error: ${(err.message || '').substring(0, 200)}`);
        return {};
    }
}

function main() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.error('Error: APIFY_API_TOKEN environment variable is required');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    console.log(`Loaded ${data.length} contacts`);

    // Get first 300 entries that are missing profile pics
    const first300 = data.slice(0, 300);
    const missing = first300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });

    console.log(`Found ${missing.length} entries in first 300 missing profile pics`);

    // Extract unique handles
    const handles = [...new Set(missing.map(x => x.instagram.replace(/^@/, '').toLowerCase().trim()))];
    console.log(`Unique handles to look up: ${handles.length}`);

    // Process in batches
    const allResults = {};
    let enriched = 0;

    for (let i = 0; i < handles.length; i += BATCH_SIZE) {
        const batch = handles.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(handles.length / BATCH_SIZE);
        console.log(`\nBatch ${batchNum}/${totalBatches}: Processing ${batch.length} handles...`);
        console.log(`  Handles: ${batch.join(', ')}`);

        const results = runApifyBatch(batch, token);
        const found = Object.keys(results).length;
        enriched += found;
        Object.assign(allResults, results);
        console.log(`  -> Got ${found}/${batch.length} profile pics (total: ${enriched})`);

        // Brief pause between batches to avoid rate limiting
        if (i + BATCH_SIZE < handles.length) {
            execSync('sleep 2');
        }
    }

    // Apply results to the full data array
    let updated = 0;
    for (const c of data) {
        if (c.instagram && (!c.profilePic || !c.profilePic.startsWith('http'))) {
            const handle = c.instagram.replace(/^@/, '').toLowerCase().trim();
            if (allResults[handle]) {
                c.profilePic = allResults[handle];
                updated++;
            }
        }
    }

    // Write back
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    console.log(`\n=== RESULTS ===`);
    console.log(`Apify found pics for: ${enriched}/${handles.length} handles`);
    console.log(`Updated entries in DB: ${updated}`);

    // Report which ones still failed
    const stillMissing = first300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });
    // Re-read to get fresh data
    const freshData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const freshFirst300 = freshData.slice(0, 300);
    const freshMissing = freshFirst300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });
    console.log(`Still missing after re-enrichment: ${freshMissing.length}`);
    if (freshMissing.length > 0) {
        console.log('\n--- Still missing ---');
        freshMissing.forEach((x, i) => {
            console.log(`${i+1}. [id:${x.id}] ${x.person} | ${x.instagram}`);
        });
    }
}

main();
