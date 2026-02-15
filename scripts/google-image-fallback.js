/**
 * Google Image Scraper fallback for entries missing Instagram profile pics.
 * Searches Google for each page name + "instagram" and uses the image result.
 *
 * Usage: APIFY_API_TOKEN=<token> node scripts/google-image-fallback.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const BATCH_SIZE = 10;

function searchGoogleImages(queries, token) {
    const actorId = 'apify/google-search-scraper';
    const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
    const payload = {
        queries: queries.join('\n'),
        resultsPerPage: 3,
        maxPagesPerQuery: 1,
        languageCode: '',
        mobileResults: false,
        includeUnfilteredResults: false
    };

    try {
        const payloadStr = JSON.stringify(payload);
        // Write payload to temp file to avoid shell escaping issues
        const tmpFile = '/tmp/google-search-payload.json';
        fs.writeFileSync(tmpFile, payloadStr);

        const result = execSync(
            `curl -s -X POST "${url}" -H "Content-Type: application/json" -d @${tmpFile}`,
            { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
        ).toString();

        try {
            return JSON.parse(result);
        } catch (e) {
            console.error(`  -> Parse error: ${result.substring(0, 300)}`);
            return [];
        }
    } catch (err) {
        console.error(`  -> Error: ${(err.message || '').substring(0, 200)}`);
        return [];
    }
}

function extractImageFromResults(results, searchName) {
    // Look through organic results for an image/thumbnail
    for (const r of results) {
        if (r.searchQuery && r.searchQuery.term &&
            r.searchQuery.term.toLowerCase().includes(searchName.toLowerCase().substring(0, 10))) {

            // Check organic results for thumbnails
            if (r.organicResults) {
                for (const org of r.organicResults) {
                    // Prefer Instagram results
                    if (org.url && org.url.includes('instagram.com')) {
                        if (org.thumbnailUrl) return org.thumbnailUrl;
                    }
                }
                // Fallback to any result with a thumbnail
                for (const org of r.organicResults) {
                    if (org.thumbnailUrl) return org.thumbnailUrl;
                }
            }
        }
    }
    return null;
}

function main() {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
        console.error('Error: APIFY_API_TOKEN environment variable is required');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const first300 = data.slice(0, 300);
    const missing = first300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });

    console.log(`Found ${missing.length} entries still missing profile pics`);

    // Build search queries using page names
    const entries = missing.map(x => ({
        id: x.id,
        name: x.person || x.company || 'Unknown',
        instagram: x.instagram,
        query: `${x.person || x.company} instagram page profile picture`
    }));

    let enriched = 0;
    const resultMap = {}; // id -> imageUrl

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

        console.log(`\nBatch ${batchNum}/${totalBatches}: Searching Google for ${batch.length} names...`);
        batch.forEach(e => console.log(`  - "${e.name}" (${e.instagram})`));

        const queries = batch.map(e => e.query);
        const results = searchGoogleImages(queries, token);

        console.log(`  -> Got ${results.length} search result sets`);

        // Match results back to entries
        for (const entry of batch) {
            // Find matching result
            const matchedResult = results.filter(r => {
                if (!r.searchQuery || !r.searchQuery.term) return false;
                const term = r.searchQuery.term.toLowerCase();
                const name = entry.name.toLowerCase();
                // Match if first word of name appears in search term
                return term.includes(name.split(' ')[0].toLowerCase());
            });

            if (matchedResult.length > 0) {
                // Look for Instagram-related thumbnails
                let imgUrl = null;
                for (const mr of matchedResult) {
                    if (mr.organicResults) {
                        for (const org of mr.organicResults) {
                            if (org.thumbnailUrl && org.url && org.url.includes('instagram.com')) {
                                imgUrl = org.thumbnailUrl;
                                break;
                            }
                        }
                        if (!imgUrl) {
                            for (const org of mr.organicResults) {
                                if (org.thumbnailUrl) {
                                    imgUrl = org.thumbnailUrl;
                                    break;
                                }
                            }
                        }
                    }
                    if (imgUrl) break;
                }

                if (imgUrl) {
                    resultMap[entry.id] = imgUrl;
                    enriched++;
                    console.log(`  -> Found image for "${entry.name}": ${imgUrl.substring(0, 80)}...`);
                } else {
                    console.log(`  -> No image found for "${entry.name}"`);
                }
            } else {
                console.log(`  -> No search results matched "${entry.name}"`);
            }
        }

        // Pause between batches
        if (i + BATCH_SIZE < entries.length) {
            execSync('sleep 3');
        }
    }

    // Apply results
    let updated = 0;
    for (const c of data) {
        if (resultMap[c.id]) {
            c.profilePic = resultMap[c.id];
            updated++;
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    console.log(`\n=== GOOGLE IMAGE RESULTS ===`);
    console.log(`Found images for: ${enriched}/${missing.length} entries`);
    console.log(`Updated in DB: ${updated}`);

    // Final count
    const freshData = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const freshFirst300 = freshData.slice(0, 300);
    const stillMissing = freshFirst300.filter(x => {
        return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
    });
    const withPics = freshFirst300.filter(x => x.profilePic && x.profilePic.startsWith('http'));
    console.log(`\nFirst 300 with profile pics: ${withPics.length}/300`);
    console.log(`Still missing: ${stillMissing.length}`);
}

main();
