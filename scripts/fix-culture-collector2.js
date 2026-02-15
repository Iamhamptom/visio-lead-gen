const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const token = process.env.APIFY_API_TOKEN;
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');

// Try multiple Google searches
const queries = [
    'Culture Collector instagram',
    '"culture collector" south africa instagram page',
    'culture collector SA music blog instagram'
];

console.log('Trying multiple Google searches...\n');
const payload = { queries: queries.join('\n'), resultsPerPage: 5, maxPagesPerQuery: 1 };
fs.writeFileSync('/tmp/cc-search2.json', JSON.stringify(payload));

const gResult = execSync(
    `curl -s -X POST "https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${token}" -H "Content-Type: application/json" -d @/tmp/cc-search2.json`,
    { timeout: 180000, maxBuffer: 5 * 1024 * 1024 }
).toString();

const parsed = JSON.parse(gResult);
const skip = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts'];
const foundHandles = [];

if (Array.isArray(parsed)) {
    for (const result of parsed) {
        if (result.searchQuery) console.log('Query: ' + result.searchQuery.term);
        if (result.organicResults) {
            for (const r of result.organicResults) {
                console.log('  ' + r.title + ' | ' + r.url);
                if (r.url && r.url.includes('instagram.com')) {
                    const match = r.url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
                    if (match && skip.indexOf(match[1]) === -1) {
                        foundHandles.push(match[1]);
                    }
                }
            }
        }
        console.log('');
    }
}

console.log('Found IG handles:', foundHandles);

// Also try directly scraping likely handles
const likelyHandles = [
    'culturecollecter',       // Found earlier for Bacardi Clout
    'culturecollector',
    'theculturecollector',
    'culture_collector',
    'culturecollectorsa',
    'culture.collector',
    ...foundHandles
];

const uniqueHandles = [...new Set(likelyHandles)];
console.log('\nTrying direct IG scrape for:', uniqueHandles.join(', '));

const igPayload = JSON.stringify({ usernames: uniqueHandles });
const igResult = execSync(
    `curl -s -X POST "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}" -H "Content-Type: application/json" -d '${igPayload.replace(/'/g, "'\\''")}'`,
    { timeout: 180000, maxBuffer: 5 * 1024 * 1024 }
).toString();

const igItems = JSON.parse(igResult);
console.log('\nIG results:');

if (Array.isArray(igItems)) {
    for (const item of igItems) {
        const pic = item.profilePicUrl || item.profilePicUrlHD || '';
        console.log(`  @${item.username} | followers: ${item.followersCount || '?'} | pic: ${pic ? 'YES' : 'NO'}`);
        if (item.biography) console.log(`    bio: ${item.biography.substring(0, 100)}`);
    }

    // Pick the best match (most followers, or "culture collector" in bio/username)
    const bestMatch = igItems.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))[0];

    if (bestMatch) {
        const pic = bestMatch.profilePicUrl || bestMatch.profilePicUrlHD || '';
        console.log(`\nBest match: @${bestMatch.username} (${bestMatch.followersCount} followers)`);

        if (pic) {
            const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
            const entry = data.find(e => e.id === 100);
            if (entry) {
                entry.person = 'Culture Collector';
                entry.company = 'Culture Collector';
                entry.realInstagram = '@' + bestMatch.username;
                entry.profilePic = pic;
                fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
                console.log('Updated entry [id:100] with @' + bestMatch.username);
            }
        }
    }
} else {
    console.log('Unexpected IG response:', igResult.substring(0, 500));
}
