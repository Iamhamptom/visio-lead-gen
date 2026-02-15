const d = require("../public/data/db_ZA.json");
const first300 = d.slice(0, 300);
const missing = first300.filter(x => {
  return !x.profilePic || !x.profilePic.startsWith("http");
});
const missingWithIG = missing.filter(x => x.instagram);
const missingNoIG = missing.filter(x => {
  return !x.instagram;
});

console.log("Total first 300 entries:", first300.length);
console.log("With profile pic:", first300.length - missing.length);
console.log("Missing profile pic (with IG):", missingWithIG.length);
console.log("Missing profile pic (no IG):", missingNoIG.length);

console.log("\n--- Missing with IG handle (can be re-enriched) ---");
missingWithIG.forEach((x, i) => {
  console.log((i+1) + ". [id:" + x.id + "] " + x.person + " | " + x.instagram);
});

if (missingNoIG.length > 0) {
  console.log("\n--- Missing without IG handle (cannot enrich) ---");
  missingNoIG.forEach((x, i) => {
    console.log((i+1) + ". [id:" + x.id + "] " + x.person + " | company: " + (x.company || "?"));
  });
}

// Output just the handles for re-enrichment
console.log("\n--- IG handles to re-enrich ---");
const handles = missingWithIG.map(x => x.instagram.replace(/^@/, '').toLowerCase().trim());
console.log(JSON.stringify(handles));
