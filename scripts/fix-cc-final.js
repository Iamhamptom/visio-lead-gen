const fs = require('fs');
const path = require('path');
const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const entry = data.find(e => String(e.id) === '100');

if (!entry) {
    console.log('Entry not found');
    process.exit(1);
}

console.log('Before:', JSON.stringify({
    id: entry.id, person: entry.person, instagram: entry.instagram,
    realInstagram: entry.realInstagram, hasPic: entry.profilePic ? 'YES' : 'NO'
}, null, 2));

// Update: remove "Top 3", add real handle and profile pic from @culturecollecter
entry.person = 'Culture Collector';
entry.company = 'Culture Collector';
entry.realInstagram = '@culturecollecter';
// We need to set the profile pic - let me grab it from another entry that used @culturecollecter
// Entry id:111 (Bacardi Clout) was mapped to @culturecollecter and got its pic
const bacardi = data.find(e => String(e.id) === '111');
if (bacardi && bacardi.profilePic) {
    entry.profilePic = bacardi.profilePic;
    console.log('Using profile pic from @culturecollecter (same as entry 111)');
} else {
    console.log('Could not find profile pic from entry 111, need to scrape');
}

console.log('\nAfter:', JSON.stringify({
    id: entry.id, person: entry.person, instagram: entry.instagram,
    realInstagram: entry.realInstagram, hasPic: entry.profilePic ? 'YES' : 'NO'
}, null, 2));

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log('\nSaved!');

// Count remaining missing
const first300 = data.slice(0, 300);
const missing = first300.filter(x => x.instagram && (!x.profilePic || !x.profilePic.startsWith('http')));
console.log('Still missing pics in first 300:', missing.length);
