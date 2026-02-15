const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const token = process.env.APIFY_API_TOKEN;
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');

// Step 1: Google search
console.log('Searching Google for "Culture Collector instagram south africa"...');
const payload = { queries: 'Culture Collector instagram south africa', resultsPerPage: 5, maxPagesPerQuery: 1 };
fs.writeFileSync('/tmp/cc-search.json', JSON.stringify(payload));

const gResult = execSync(
    `curl -s -X POST "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${token}" -H "Content-Type: application/json" -d @/tmp/cc-search.json`,
    { timeout: 120000, maxBuffer: 5 * 1024 * 1024 }
).toString();

const parsed = JSON.parse(gResult);
let igHandle = null;

if (Array.isArray(parsed) && parsed[0] && parsed[0].organicResults) {
    console.log('\nGoogle results:');
    parsed[0].organicResults.forEach((r, i) => {
        console.log(`${i + 1}. ${r.title} | ${r.url}`);
    });

    const skip = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts'];
    for (const r of parsed[0].organicResults) {
        if (r.url && r.url.includes('instagram.com')) {
            const match = r.url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (match && skip.indexOf(match[1]) === -1) {
                igHandle = match[1];
                console.log('\nFound IG handle: @' + igHandle);
                break;
            }
        }
    }
}

if (!igHandle) {
    console.log('No IG handle found via Google. Exiting.');
    process.exit(1);
}

// Step 2: Scrape IG profile pic
console.log(`\nScraping Instagram profile for @${igHandle}...`);
const igPayload = JSON.stringify({ usernames: [igHandle] });
const igResult = execSync(
    `curl -s -X POST "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}" -H "Content-Type: application/json" -d '${igPayload}'`,
    { timeout: 120000, maxBuffer: 5 * 1024 * 1024 }
).toString();

const igItems = JSON.parse(igResult);
let profilePic = null;

if (Array.isArray(igItems) && igItems.length > 0) {
    const item = igItems[0];
    profilePic = item.profilePicUrl || item.profilePicUrlHD || item.profile_pic_url || '';
    console.log('Profile pic URL: ' + (profilePic ? profilePic.substring(0, 80) + '...' : 'none'));
}

if (!profilePic) {
    console.log('No profile pic found. Exiting.');
    process.exit(1);
}

// Step 3: Update db_ZA.json
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const entry = data.find(e => e.id === 100);

if (entry) {
    console.log(`\nUpdating entry [id:100] "${entry.person}":`);
    console.log(`  person: "${entry.person}" -> "Culture Collector"`);
    console.log(`  instagram: ${entry.instagram} (kept)`);
    console.log(`  realInstagram: @${igHandle}`);
    console.log(`  profilePic: set`);

    entry.person = 'Culture Collector';
    entry.company = 'Culture Collector';
    entry.realInstagram = '@' + igHandle;
    entry.profilePic = profilePic;

    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log('\nDone! Entry updated.');
} else {
    console.log('Entry id:100 not found');
}
