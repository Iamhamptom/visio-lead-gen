const fs = require('fs');
const path = require('path');
const https = require('https');

const TOKEN = process.env.APIFY_API_TOKEN;
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const AVATARS_DIR = path.join(__dirname, '..', 'public', 'avatars');

if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

function httpPost(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const parsed = new URL(url);
        const req = https.request({
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            timeout: 300000,
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch { resolve(body); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(data);
        req.end();
    });
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : require('http');
        const req = proto.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode}`));
            }
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(true); });
            file.on('error', (e) => { fs.unlink(dest, () => {}); reject(e); });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
}

async function main() {
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const first300 = data.slice(0, 300);

    // Gather unique IG handles
    const handleMap = new Map(); // handle -> [entry ids]
    for (const entry of first300) {
        let handle = (entry.realInstagram || entry.instagram || '').replace(/^@/, '').trim().toLowerCase();
        if (!handle) continue;
        // Already have a working local avatar?
        const localFile = path.join(AVATARS_DIR, `${entry.id}.jpg`);
        if (fs.existsSync(localFile) && fs.statSync(localFile).size > 500) continue;

        if (!handleMap.has(handle)) handleMap.set(handle, []);
        handleMap.get(handle).push(entry.id);
    }

    const handles = Array.from(handleMap.keys());
    console.log(`Need to scrape ${handles.length} IG handles for ${handleMap.size} entries...\n`);

    if (handles.length === 0) {
        console.log('All avatars already downloaded!');
        return;
    }

    // Batch scrape in groups of 50
    const BATCH_SIZE = 50;
    let totalDownloaded = 0;
    let totalFailed = 0;

    for (let b = 0; b < handles.length; b += BATCH_SIZE) {
        const batch = handles.slice(b, b + BATCH_SIZE);
        console.log(`\nBatch ${Math.floor(b/BATCH_SIZE)+1}: Scraping ${batch.length} profiles...`);

        try {
            const url = `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${TOKEN}`;
            const results = await httpPost(url, { usernames: batch });

            if (!Array.isArray(results)) {
                console.log('  Unexpected response:', typeof results === 'string' ? results.substring(0, 200) : JSON.stringify(results).substring(0, 200));
                totalFailed += batch.length;
                continue;
            }

            console.log(`  Got ${results.length} profiles back.`);

            // Download each profile pic
            for (const profile of results) {
                const username = (profile.username || '').toLowerCase();
                const picUrl = profile.profilePicUrlHD || profile.profilePicUrl || profile.profile_pic_url || '';

                if (!username || !picUrl) continue;

                const entryIds = handleMap.get(username) || [];
                for (const id of entryIds) {
                    const dest = path.join(AVATARS_DIR, `${id}.jpg`);
                    try {
                        await downloadFile(picUrl, dest);
                        const stat = fs.statSync(dest);
                        if (stat.size > 500) {
                            totalDownloaded++;
                            process.stdout.write(`  Downloaded: ${username} -> ${id}.jpg (${stat.size}b)\n`);
                        } else {
                            fs.unlinkSync(dest);
                            totalFailed++;
                        }
                    } catch (e) {
                        totalFailed++;
                        process.stdout.write(`  Failed: ${username} -> ${e.message}\n`);
                    }
                }
            }
        } catch (e) {
            console.log(`  Batch failed: ${e.message}`);
            totalFailed += batch.length;
        }
    }

    console.log(`\n\nDownloaded: ${totalDownloaded}, Failed: ${totalFailed}`);

    // Update db_ZA.json
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
    console.log(`Still missing in first 300: ${missing.length}`);
    if (missing.length <= 30) {
        missing.forEach(e => console.log(`  [${e.id}] ${e.person} (${e.instagram || 'no handle'})`));
    }
}

main().catch(console.error);
