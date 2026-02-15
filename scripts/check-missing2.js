const d = require("../public/data/db_ZA.json");
const nopics = d.filter(x => x.instagram && !(x.profilePic && x.profilePic.startsWith("http")));
console.log("Missing pics count:", nopics.length);
console.log("\nFirst 10:");
nopics.slice(0, 10).forEach(x => {
  console.log(JSON.stringify({ person: x.person, ig: x.instagram, pic: x.profilePic || "NONE" }));
});
console.log("\nAll unique IG handles missing pics:");
const handles = nopics.map(x => x.instagram.replace(/^@/, '').toLowerCase().trim());
console.log(handles.join('\n'));
