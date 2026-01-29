import fs from 'fs';
import path from 'path';

interface DBLead {
    id: string;
    person: string;
    company: string;
    title: string;
    email: string;
    country: string;
    industry: string;
    source: string;
    dateAdded: string;
    followers?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    status?: string;
}

const CSV_PATH = '/Volumes/HGARADIO-DRIVE1/Visio Research Labs/South Africa (Entertainment)/SA_Music_Pages_FINAL_300.csv';
const OUTPUT_PATH = path.join(process.cwd(), 'data', 'db_ZA.json');

function parseCSV(content: string): DBLead[] {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');

    const leads: DBLead[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < 8) continue;

        const [id, name, instagram, tiktok, twitter, followers, category, status] = values;

        // Build source string from social handles
        const socials = [instagram, tiktok, twitter].filter(s => s && s.trim()).join(' | ');

        leads.push({
            id: id || String(i),
            person: name?.trim() || '',
            company: name?.trim() || '', // For media pages, name = company
            title: category?.trim() || 'Entertainment',
            email: '', // Not available in source
            country: 'ZA',
            industry: category?.trim() || 'Entertainment',
            source: socials || 'SA Music Pages CSV',
            dateAdded: new Date().toISOString().split('T')[0],
            followers: followers?.trim() || '',
            instagram: instagram?.trim() || '',
            tiktok: tiktok?.trim() || '',
            twitter: twitter?.trim() || '',
            status: status?.trim() || 'Verified'
        });
    }

    return leads;
}

async function main() {
    console.log('📁 Reading CSV from:', CSV_PATH);

    if (!fs.existsSync(CSV_PATH)) {
        console.error('❌ CSV file not found!');
        process.exit(1);
    }

    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const leads = parseCSV(csvContent);

    console.log(`✅ Parsed ${leads.length} leads`);

    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Write JSON
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(leads, null, 2));
    console.log(`💾 Saved to: ${OUTPUT_PATH}`);

    // Preview
    console.log('\n📊 Sample entries:');
    leads.slice(0, 3).forEach(l => {
        console.log(`  - ${l.person} (${l.industry}) ${l.instagram}`);
    });
}

main();
