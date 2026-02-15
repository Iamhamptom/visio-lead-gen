const data = require("../public/data/db_ZA.json");
const total = data.length;
const withPic = data.filter(d => d.profilePic && d.profilePic.startsWith("http")).length;
const withIG = data.filter(d => d.instagram).length;
const noPic = data.filter(d => !d.profilePic || !d.profilePic.startsWith("http"));
const hasIGnoPic = data.filter(d => d.instagram && (!d.profilePic || !d.profilePic.startsWith("http")));

console.log("Total entries:", total);
console.log("With real profile pic:", withPic);
console.log("With Instagram handle:", withIG);
console.log("Have IG but NO pic:", hasIGnoPic.length);
console.log("No pic at all:", noPic.length);
console.log("---");
console.log("\n=== ENTRIES WITH IG HANDLE BUT NO PROFILE PIC ===");
hasIGnoPic.forEach((d, i) => {
  console.log(`${i + 1}. ${d.person} | @${d.instagram} | pic: ${d.profilePic || "NONE"}`);
});
console.log("\n=== ENTRIES WITH NO PROFILE PIC AND NO IG ===");
const noIGnoPic = data.filter(d => !d.instagram && (!d.profilePic || !d.profilePic.startsWith("http")));
noIGnoPic.forEach((d, i) => {
  console.log(`${i + 1}. ${d.person} | company: ${d.company || "?"} | pic: ${d.profilePic || "NONE"}`);
});
