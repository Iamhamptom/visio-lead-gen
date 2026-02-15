// Fix double @@ in Instagram handles
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

let fixed = 0;
for (const entry of data) {
  if (entry.instagram && entry.instagram.startsWith('@@')) {
    const old = entry.instagram;
    entry.instagram = '@' + entry.instagram.replace(/^@+/, '');
    fixed++;
    if (fixed <= 10) console.log(`Fixed: ${old} -> ${entry.instagram}`);
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`\nFixed ${fixed} entries with double @@ handles`);
