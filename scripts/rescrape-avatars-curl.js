const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TOKEN = process.env.APIFY_API_TOKEN;
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const AVATARS_DIR = path.join(__dirname, '..', 'public', 'avatars');

if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

function curlPost(url, body) {
    const tmpIn = '/tmp/apify-req.json';
    fs.writeFileSync(tmpIn, JSON.stringify(body));
    const result = execSync(
        `curl -s -X POST "${url}" -H "Content-Type: application/json" -d @${tmpIn}`,
        { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
    ).toString();
    return JSON.parse(result);
}

function curlDownload(url, dest) {
    try {
        execSync(`curl -sL -o "${dest}" --max-time 15 "${url}"`, { timeout: 20000 });
        const stat = fs.statSync(dest);
        if (stat.size < 500) {
            fs.unlinkSync(dest);
            return false;
        }
        return true;
    } catch {
        try { fs.unlinkSync(dest); } catch {}
        return false;
    }
}

function main() {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const first300 = data.slice(0, 300);

    // Gather IG handles that need avatars
    const handleMap = new Map(); // handle -> [entry ids]
    for (const entry of first300) {
        let handle = (entry.realInstagram || entry.instagram || '').replace(/^@/, '').trim().toLowerCase();
        if (!handle) continue;
        const localFile = path.join(AVATARS_DIR, `${entry.id}.jpg`);
        if (fs.existsSync(localFile) && fs.statSync(localFile).size > 500) continue;
        if (!handleMap.has(handle)) handleMap.set(handle, []);
        handleMap.get(handle).push(entry.id);
    }

    const handles = Array.from(handleMap.keys());
    console.log(`Need to scrape ${handles.length} IG handles...\n`);

    if (handles.length === 0) {
        console.log('All avatars already downloaded!');
        updateJsonPaths(data);
        return;
    }

    let totalDownloaded = 0;
    let totalFailed = 0;
    const BATCH_SIZE = 30;

    for (let b = 0; b < handles.length; b += BATCH_SIZE) {
        const batch = handles.slice(b, b + BATCH_SIZE);
        const batchNum = Math.floor(b / BATCH_SIZE) + 1;
        console.log(`\nBatch ${batchNum}: Scraping ${batch.length} profiles...`);

        try {
            const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${TOKEN}`;
            const results = curlPost(url, { usernames: batch });

            if (!Array.isArray(results)) {
                console.log('  Unexpected response');
                totalFailed += batch.length;
                continue;
            }

            console.log(`  Got ${results.length} profiles.`);

            for (const profile of results) {
                const username = (profile.username || '').toLowerCase();
                const picUrl = profile.profilePicUrlHD || profile.profilePicUrl || '';
                if (!username || !picUrl) continue;

                const entryIds = handleMap.get(username) || [];
                for (const id of entryIds) {
                    const dest = path.join(AVATARS_DIR, `${id}.jpg`);
                    if (curlDownload(picUrl, dest)) {
                        totalDownloaded++;
                        process.stdout.write(`  OK: @${username} -> ${id}.jpg\n`);
                    } else {
                        totalFailed++;
                    }
                }
            }
        } catch (e) {
            console.log(`  Batch failed: ${e.message}`);
            totalFailed += batch.length;
        }
    }

    console.log(`\n\nDownloaded: ${totalDownloaded}, Failed: ${totalFailed}`);
    updateJsonPaths(data);
}

function updateJsonPaths(data) {
    let updated = 0;
    for (const entry of data) {
        const localFile = path.join(AVATARS_DIR, `${entry.id}.jpg`);
        if (fs.existsSync(localFile) && fs.statSync(localFile).size > 500) {
            entry.profilePic = `/avatars/${entry.id}.jpg`;
            updated++;
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`Updated ${updated} entries with local avatar paths`);

    const missing = data.slice(0, 300).filter(e => !e.profilePic || !e.profilePic.startsWith('/avatars/'));
    console.log(`Still missing: ${missing.length} of 300`);
    if (missing.length <= 30) {
        missing.forEach(e => console.log(`  [${e.id}] ${e.person} (${e.instagram || 'no handle'})`));
    }
}

main();
