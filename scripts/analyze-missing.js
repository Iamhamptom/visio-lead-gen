// Analyze which missing entries look real vs generated
const d = require("../public/data/db_ZA.json");

// The first ~300 entries (by ID) should be the user's original data
// Let's check by looking at dateAdded and source patterns
const nopics = d.filter(x => x.instagram && !(x.profilePic && x.profilePic.startsWith("http")));
const withpics = d.filter(x => x.profilePic && x.profilePic.startsWith("http"));

// Check which IDs are missing pics
const numericIds = nopics.filter(x => !isNaN(parseInt(x.id))).map(x => parseInt(x.id)).sort((a,b) => a-b);
const maxOriginalId = Math.max(...d.filter(x => !isNaN(parseInt(x.id))).map(x => parseInt(x.id)));

console.log("Total entries:", d.length);
console.log("With pics:", withpics.length);
console.log("Missing pics (with IG):", nopics.length);
console.log("Max numeric ID:", maxOriginalId);
console.log("");

// Group by source/dateAdded to find patterns
const byDate = {};
nopics.forEach(x => {
  const key = x.dateAdded || "none";
  if (!byDate[key]) byDate[key] = [];
  byDate[key].push(x.person);
});

console.log("Missing entries by dateAdded:");
Object.entries(byDate).forEach(([date, names]) => {
  console.log(`  ${date}: ${names.length} entries (e.g. ${names.slice(0,3).join(", ")})`);
});

// Check which of the first 300 IDs are missing pics
console.log("\n--- First 300 entries by ID that are missing pics ---");
const first300 = d.slice(0, 300);
const first300Missing = first300.filter(x => x.instagram && !(x.profilePic && x.profilePic.startsWith("http")));
console.log(`Of first 300 entries: ${first300Missing.length} missing pics`);
first300Missing.forEach((x, i) => {
  console.log(`${i+1}. [id:${x.id}] ${x.person} | @${x.instagram.replace(/^@/,'')} | source: ${x.source || '?'}`);
});
