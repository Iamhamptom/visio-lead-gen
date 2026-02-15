/**
 * Smart enrichment:
 * Phase 1: Google Search to find correct Instagram usernames
 * Phase 2: Apify Instagram Scraper with corrected usernames
 *
 * Usage: APIFY_API_TOKEN=<token> node scripts/smart-enrich.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const GOOGLE_BATCH_SIZE = 10;
const IG_BATCH_SIZE = 20;

function googleSearch(queries, token) {
    const actorId = 'apify~google-search-scraper';
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
    const payload = {
        queries: queries.join('\n'),
        resultsPerPage: 5,
        maxPagesPerQuery: 1
    };

    const tmpFile = '/tmp/google-payload.json';
    fs.writeFileSync(tmpFile, JSON.stringify(payload));

    try {
        const result = execSync(
            `curl -s -X POST "${url}" -H "Content-Type: application/json" -d @${tmpFile}`,
            { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
        ).toString();
        return JSON.parse(result);
    } catch (err) {
        console.error(`  -> Google error: ${(err.message || '').substring(0, 200)}`);
        return [];
    }
}

function igProfileScrape(usernames, token) {
    const actorId = 'apify~instagram-profile-scraper';
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
    const payload = JSON.stringify({ usernames });

    try {
        const result = execSync(
            `curl -s -X POST "${url}" -H "Content-Type: application/json" -d '${payload.replace(/'/g, "'\\''")}'`,
            { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
        ).toString();
        return JSON.parse(result);
    } catch (err) {
        console.error(`  -> IG error: ${(err.message || '').substring(0, 200)}`);
        return [];
    }
}

function extractIGUsername(url) {
    // Extract username from Instagram URL like https://www.instagram.com/username/
    const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match) {
        const username = match[1].toLowerCase();
        // Skip non-profile pages
        if (['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts'].includes(username)) return null;
        return username;
    }
    return null;
}

function main() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.error('APIFY_API_TOKEN required');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const first300 = data.slice(0, 300);
    const missing = first300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });

    console.log(`=== PHASE 1: Google Search to find correct IG usernames ===`);
    console.log(`Processing ${missing.length} entries...\n`);

    // Map: dbId -> { name, oldHandle, newHandle }
    const corrections = [];

    for (let i = 0; i < missing.length; i += GOOGLE_BATCH_SIZE) {
        const batch = missing.slice(i, i + GOOGLE_BATCH_SIZE);
        const batchNum = Math.floor(i / GOOGLE_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(missing.length / GOOGLE_BATCH_SIZE);

        console.log(`Google Batch ${batchNum}/${totalBatches}:`);

        const queries = batch.map(e => `${e.person} instagram`);
        const results = googleSearch(queries, token);

        if (!Array.isArray(results)) {
            console.log(`  -> Unexpected response, skipping batch`);
            continue;
        }

        // Match results to entries by query order
        for (let j = 0; j < batch.length; j++) {
            const entry = batch[j];
            const searchResult = results[j]; // Results come back in query order

            if (!searchResult || !searchResult.organicResults) {
                console.log(`  [${entry.id}] ${entry.person}: No results`);
                continue;
            }

            // Find Instagram profile URLs in results
            const igUsernames = [];
            for (const org of searchResult.organicResults) {
                if (org.url && org.url.includes('instagram.com')) {
                    const username = extractIGUsername(org.url);
                    if (username && !igUsernames.includes(username)) {
                        igUsernames.push(username);
                    }
                }
            }

            const oldHandle = entry.instagram.replace(/^@/, '').toLowerCase().trim();

            if (igUsernames.length > 0) {
                // Prefer the first unique profile username found
                const newHandle = igUsernames[0];
                if (newHandle !== oldHandle) {
                    console.log(`  [${entry.id}] ${entry.person}: ${oldHandle} -> ${newHandle} (CORRECTED)`);
                } else {
                    console.log(`  [${entry.id}] ${entry.person}: ${oldHandle} (confirmed)`);
                }
                corrections.push({
                    id: entry.id,
                    name: entry.person,
                    oldHandle,
                    newHandle,
                    allHandles: igUsernames
                });
            } else {
                console.log(`  [${entry.id}] ${entry.person}: No Instagram found on Google`);
            }
        }

        if (i + GOOGLE_BATCH_SIZE < missing.length) {
            execSync('sleep 2');
        }
    }

    console.log(`\n=== PHASE 1 RESULTS ===`);
    console.log(`Found Instagram profiles for ${corrections.length}/${missing.length} entries`);
    const corrected = corrections.filter(c => c.newHandle !== c.oldHandle);
    console.log(`Handle corrections: ${corrected.length}`);
    corrected.forEach(c => {
        console.log(`  ${c.name}: @${c.oldHandle} -> @${c.newHandle}`);
    });

    if (corrections.length === 0) {
        console.log('\nNo Instagram profiles found via Google. Exiting.');
        return;
    }

    console.log(`\n=== PHASE 2: Scrape Instagram profiles ===`);

    // Get unique new handles
    const uniqueHandles = [...new Set(corrections.map(c => c.newHandle))];
    console.log(`Scraping ${uniqueHandles.length} unique Instagram profiles...\n`);

    const igResults = {};

    for (let i = 0; i < uniqueHandles.length; i += IG_BATCH_SIZE) {
        const batch = uniqueHandles.slice(i, i + IG_BATCH_SIZE);
        const batchNum = Math.floor(i / IG_BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(uniqueHandles.length / IG_BATCH_SIZE);

        console.log(`IG Batch ${batchNum}/${totalBatches}: ${batch.length} handles`);
        console.log(`  ${batch.join(', ')}`);

        const items = igProfileScrape(batch, token);
        if (!Array.isArray(items)) {
            console.log(`  -> Unexpected response`);
            continue;
        }

        let found = 0;
        for (const item of items) {
            const username = (item.username || '').toLowerCase();
            const pic = item.profilePicUrl || item.profilePicUrlHD || item.profile_pic_url || '';
            if (username && pic) {
                igResults[username] = pic;
                found++;
            }
        }
        console.log(`  -> Got ${found}/${batch.length} profile pics`);

        if (i + IG_BATCH_SIZE < uniqueHandles.length) {
            execSync('sleep 2');
        }
    }

    console.log(`\n=== PHASE 2 RESULTS ===`);
    console.log(`Got profile pics for ${Object.keys(igResults).length}/${uniqueHandles.length} handles`);

    // Apply to database
    let updated = 0;
    let handleFixed = 0;

    for (const correction of corrections) {
        const pic = igResults[correction.newHandle];
        if (!pic) continue;

        // Find entry in full data
        const entry = data.find(e => e.id === correction.id);
        if (!entry) continue;

        entry.profilePic = pic;
        updated++;

        // Also update the handle if it was wrong
        if (correction.newHandle !== correction.oldHandle) {
            entry.instagram = '@' + correction.newHandle;
            handleFixed++;
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    // Final stats
    const freshData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const freshFirst300 = freshData.slice(0, 300);
    const withPics = freshFirst300.filter(x => x.profilePic && x.profilePic.startsWith('http'));
    const stillMissing = freshFirst300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });

    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Profile pics updated: ${updated}`);
    console.log(`Handles corrected: ${handleFixed}`);
    console.log(`First 300 with pics: ${withPics.length}/300`);
    console.log(`Still missing: ${stillMissing.length}`);

    if (stillMissing.length > 0 && stillMissing.length <= 50) {
        console.log('\n--- Still missing ---');
        stillMissing.forEach((x, i) => {
            console.log(`${i+1}. [id:${x.id}] ${x.person} | ${x.instagram}`);
        });
    }
}

main();
