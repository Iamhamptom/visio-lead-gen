const d = require('../public/data/db_ZA.json');
const e = d.find(x => x.id == 100 || x.id === '100');
if (!e) { console.log('Not found by id. Checking person name...');
  const e2 = d.find(x => x.person && x.person.includes('Culture Collector'));
  if (e2) console.log('Found:', JSON.stringify({id:e2.id,person:e2.person,ig:e2.instagram,real:e2.realInstagram,pic:e2.profilePic?'YES':'NO'},null,2));
  else { console.log('Searching first 5 entries:'); d.slice(98,103).forEach(x => console.log(x.id, typeof x.id, x.person)); }
  process.exit(0);
}
console.log(JSON.stringify({
    id: e.id,
    person: e.person,
    instagram: e.instagram,
    realInstagram: e.realInstagram,
    hasPic: e.profilePic ? 'YES' : 'NO'
}, null, 2));
