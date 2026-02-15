const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const AVATARS_DIR = path.join(__dirname, '..', 'public', 'avatars');

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const req = proto.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
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
    const withPics = data.filter(e => e.profilePic && e.profilePic.startsWith('http'));

    console.log(`Downloading ${withPics.length} profile pics...\n`);

    let success = 0, failed = 0;
    const BATCH = 10;

    for (let i = 0; i < withPics.length; i += BATCH) {
        const batch = withPics.slice(i, i + BATCH);
        const results = await Promise.allSettled(
            batch.map(async (entry) => {
                const dest = path.join(AVATARS_DIR, `${entry.id}.jpg`);
                if (fs.existsSync(dest)) {
                    const stat = fs.statSync(dest);
                    if (stat.size > 500) return { id: entry.id, ok: true, cached: true };
                }
                await downloadFile(entry.profilePic, dest);
                const stat = fs.statSync(dest);
                if (stat.size < 500) {
                    fs.unlinkSync(dest);
                    throw new Error('Too small');
                }
                return { id: entry.id, ok: true };
            })
        );

        for (const r of results) {
            if (r.status === 'fulfilled') {
                success++;
            } else {
                failed++;
            }
        }

        process.stdout.write(`  Batch ${Math.floor(i/BATCH)+1}: ${success} ok, ${failed} failed\r`);
    }

    console.log(`\n\nResults: ${success} downloaded, ${failed} failed`);

    // Update db_ZA.json: point to local files
    let updated = 0;
    for (const entry of data) {
        const localPath = path.join(AVATARS_DIR, `${entry.id}.jpg`);
        if (fs.existsSync(localPath)) {
            const stat = fs.statSync(localPath);
            if (stat.size > 500) {
                entry.profilePic = `/avatars/${entry.id}.jpg`;
                updated++;
            }
        }
    }

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`Updated ${updated} entries to use local avatars`);

    // Count remaining
    const stillMissing = data.slice(0, 300).filter(e => !e.profilePic || !e.profilePic.startsWith('/avatars/'));
    console.log(`Still missing local avatars in first 300: ${stillMissing.length}`);
    if (stillMissing.length > 0 && stillMissing.length <= 20) {
        stillMissing.forEach(e => console.log(`  [${e.id}] ${e.person}`));
    }
}

main().catch(console.error);
