// Categorize missing entries - which look like real IG accounts vs generated names
const d = require("../public/data/db_ZA.json");
const first300 = d.slice(0, 300);
const missing = first300.filter(x => {
  return x.instagram && (!x.profilePic || !x.profilePic.startsWith('http'));
});

// Heuristic: handles with patterns like _official, _sa, sa_, mzansi prefix + genre
// are likely generated. Real accounts tend to have unique/specific names.
const generatedPatterns = [
  /_official$/,
  /^(sa|mzansi|african|township|kasi)(house|hiphop|jazz|gospel|rnb|dancehall|reggae|metal|indie|electronic|edm|kwaito|gqom|beats|music|sounds)/i,
  /^(house|hiphop|jazz|gospel|rnb|dancehall|reggae|deep|afro|gqom|kwaito)(sa_?|nation|hub)/i,
  /^(joburg|capetown|durban|pretoria|soweto)music/i,
  /(hub|central|daily|updates|trends|world|nation|zone|connect|network|blog|digest|feed|post|wire|source|repost|spotlight|buzz)(sa)?$/i,
  /^(amapiano|hiphop|gospel|jazz|rnb|reggae|electronic|indie|rap|gqom|kwaito)(nation|intelligence|repost|spotlight|buzz|zone|connect|network|blog|digest|feed|post|wire|source)/i,
];

const realLooking = [];
const generatedLooking = [];

for (const entry of missing) {
  const handle = entry.instagram.replace(/^@/, '').toLowerCase().trim();
  const isGenerated = generatedPatterns.some(p => p.test(handle));
  if (isGenerated) {
    generatedLooking.push(entry);
  } else {
    realLooking.push(entry);
  }
}

console.log(`=== LIKELY REAL ACCOUNTS (${realLooking.length}) ===`);
console.log("These are unique names that probably exist on Instagram:");
realLooking.forEach((x, i) => {
  console.log(`${i+1}. [id:${x.id}] ${x.person} | ${x.instagram}`);
});

console.log(`\n=== LIKELY GENERATED HANDLES (${generatedLooking.length}) ===`);
console.log("These follow systematic naming patterns and may not exist on Instagram:");
generatedLooking.forEach((x, i) => {
  console.log(`${i+1}. [id:${x.id}] ${x.person} | ${x.instagram}`);
});
