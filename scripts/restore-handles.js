/**
 * Restore original Instagram handles that were incorrectly changed by smart-enrich.js
 * Keep the profile pics but put back the original handles.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');

// These are the original handles from the first 300 entries that were changed
// Mapping: id -> original handle
const originalHandles = {
    11: '@musakhawula1',
    50: '@sacelebritylifestyle',
    76: '@samusicnews',
    94: '@flipmagazinesa',
    96: '@sowetoculture',
    98: '@blackyouthmag',
    100: '@culturecollectortop3',
    101: '@amapianomusicandclout',
    102: '@swezzytunes',
    111: '@bacardiclout',
    118: '@dohiphopblog',
    121: '@pabormusic',
    128: '@stundar',
    129: '@fanbasemusicmag',
    130: '@krugermp3',
    154: '@amapianosessions',
    157: '@pianokings_sa',
    160: '@mzansihiphop_',
    162: '@hiphopsa_official',
    164: '@sabars_official',
    165: '@mzansibars',
    166: '@saunderground_',
    167: '@undergroundsa_',
    168: '@mzansiunderground',
    169: '@sahouse_official',
    170: '@housesa_',
    171: '@deephousesa_',
    172: '@afrohousesa_',
    173: '@gqomnation_',
    174: '@gqomsa_',
    175: '@durbangqom',
    176: '@kwaitosa_',
    177: '@kwaitonation',
    178: '@mzansikwaito',
    179: '@sagospel_official',
    180: '@gospelsa_',
    181: '@mzansigospel',
    182: '@sarnb_official',
    184: '@mzansirnb',
    185: '@sajazz_official',
    186: '@jazzsa_',
    187: '@mzansijazz',
    188: '@sadancehall_',
    189: '@dancehallsa_',
    190: '@sareggae_official',
    191: '@reggaesa_',
    194: '@sametal_official',
    195: '@saindie_official',
    196: '@indiesa_',
    197: '@saelectronic_',
    198: '@electronicsa_',
    199: '@saedm_official',
    202: '@joburgmusic_',
    203: '@capetownmusic_',
    204: '@durbanmusic_',
    205: '@pretoriamusic_sa',
    206: '@sowetomusic_',
    207: '@kasimusic_',
    208: '@townshipmusic_',
    210: '@sabeats_official',
    211: '@africanbeats_',
    212: '@samusichub_',
    215: '@pianohubsa',
    216: '@hiphophubsa',
    217: '@househubsa',
    218: '@gqomhubsa',
    220: '@mzansimusiccentral',
    221: '@africanmusiccentral',
    222: '@samusicdaily_',
    223: '@mzansidailymusic',
    224: '@africandailymusic',
    225: '@samusicupdates_',
    227: '@africanmusicupdates',
    228: '@samusictrends',
    229: '@mzansimusictrends',
    230: '@africanmusictrends',
    231: '@samusicworld_',
    234: '@amapianonation_',
    236: '@rapnationsa',
    238: '@gqomnationsa',
    239: '@kwaitonationsa',
    241: '@jazznationsa',
    242: '@rnbnationsa',
    244: '@reggaenationsa',
    245: '@electronicnationsa',
    246: '@indienationsa',
    247: '@afrobeatsintelligence',
    248: '@amapianointelligence',
    249: '@samusicintelligence',
    250: '@mzansimusicdaily',
    252: '@mzansisounds',
    254: '@samusicrepost',
    255: '@mzansimusicrepost',
    256: '@amapianorepost',
    257: '@hiphopreposts_sa',
    258: '@samusicspotlight',
    260: '@amapianospotlight',
    261: '@hiphopspotlightsa',
    265: '@hiphopbuzzsa',
    268: '@amapianozone',
    269: '@hiphopzonesa',
    272: '@amapianoconnect',
    273: '@hiphopconnectsa',
    274: '@samusicnetwork',
    276: '@amapianonetwork',
    277: '@hiphopnetworksa',
    278: '@samusicblog_',
    279: '@mzansimusicblog',
    280: '@amapianoblog_',
    281: '@hiphopblogsa',
    282: '@samusicdigest',
    283: '@mzansidigest',
    284: '@amapianodigest',
    286: '@samusicfeed',
    288: '@amapianofeed',
    289: '@hiphopfeedsa',
    290: '@samusicpost',
    292: '@amapianopost',
    293: '@hiphoppostsa',
    294: '@samusicwire',
    295: '@mzansiwire',
    296: '@amapianowire',
    297: '@hiphopwiresa',
    298: '@samusicsource',
    299: '@mzansisource',
    300: '@amapianosource',
};

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

let restored = 0;
for (const entry of data) {
    if (originalHandles[entry.id] && entry.instagram !== originalHandles[entry.id]) {
        console.log(`[${entry.id}] ${entry.person}: ${entry.instagram} -> ${originalHandles[entry.id]} (restored)`);
        entry.instagram = originalHandles[entry.id];
        restored++;
    }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

console.log(`\nRestored ${restored} handles to original values`);

// Final count
const first300 = data.slice(0, 300);
const withPics = first300.filter(x => x.profilePic && x.profilePic.startsWith('http'));
console.log(`First 300 with pics: ${withPics.length}/300`);
