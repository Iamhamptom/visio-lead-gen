// Quick test of Google Search Scraper to see response format
const fs = require('fs');
const { execSync } = require('child_process');

const token = process.env.APIFY_API_TOKEN;
const actorId = 'apify~google-search-scraper';
const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`;
const payload = {
    queries: 'Musa Khawula instagram profile',
    resultsPerPage: 3,
    maxPagesPerQuery: 1
};

fs.writeFileSync('/tmp/test-payload.json', JSON.stringify(payload));

console.log('Calling Apify Google Search Scraper...');
const result = execSync(
    `curl -s -X POST "${url}" -H "Content-Type: application/json" -d @/tmp/test-payload.json`,
    { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
).toString();

console.log('Response length:', result.length);

try {
    const parsed = JSON.parse(result);
    console.log('Is array:', Array.isArray(parsed));
    if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('Items count:', parsed.length);
        console.log('First item keys:', Object.keys(parsed[0]));
        // Check for organic results
        if (parsed[0].organicResults) {
            console.log('\nOrganic results count:', parsed[0].organicResults.length);
            parsed[0].organicResults.forEach((r, i) => {
                console.log(`\nResult ${i+1}:`);
                console.log('  Title:', r.title);
                console.log('  URL:', r.url);
                console.log('  Thumbnail:', r.thumbnailUrl || 'none');
            });
        }
    } else if (typeof parsed === 'object' && parsed.error) {
        console.log('Error:', JSON.stringify(parsed.error));
    } else {
        console.log('Response:', JSON.stringify(parsed, null, 2).substring(0, 2000));
    }
} catch(e) {
    console.log('Parse error:', e.message);
    console.log('Raw:', result.substring(0, 1000));
}
