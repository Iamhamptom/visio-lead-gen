/**
 * Add realInstagram field for entries where Google found a different IG handle.
 * This preserves the original handle but adds the Google-found one alongside it.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'public', 'data', 'db_ZA.json');

// Google-found real handles (from smart-enrich Phase 1 output)
// Only includes entries where the found handle differs from the original
const realHandles = {
    11: 'musakhawulaproduction',
    50: 'flipmaglondon',
    76: 'blackyouthproject',
    94: 'i_love_amapiano',
    96: 'everythingsamusic',
    98: 'famous_lifeandstyle_sa',
    102: 'sweezyshotit',
    111: 'culturecollecter',
    118: 'sahiphop247',
    121: 'panafricanmusic',
    128: 'sanantoniobarsofficial',
    129: 'amapianosessions.official',
    130: 'hiphopdx',
    154: 'thepianokings',
    157: 'sahiphop247',
    160: 'stundars',
    162: 'baseformusic',
    164: 'krogermusic',
    165: 'gqom_nation1',
    166: 'sa.underground',
    167: 'barhousesa',
    168: 'samsahouse',
    169: 'deephousesa',
    170: 'afrohousecommunity',
    171: 'mzanzibar23',
    172: 'undergroundmzansi',
    173: 'undergroundmzansi',
    174: 'gqomtotheworld',
    175: 'mzansineosoul',
    176: 'kwaito_legends',
    177: 'welovernb.sa',
    178: 'aya_ntanzi',
    179: 'kwaito_legends',
    180: 'gospelconnectsa',
    181: 'jazz.southaustralia',
    182: 'gqommagazine',
    184: 'sa_gospel_productions',
    185: 'mkhma21',
    186: 'roots_sa_reggae',
    187: 'sa_indieauthors_assoc',
    188: 'sametalroofingllc',
    189: 'sa_electronic',
    190: 'mzansi_jazz',
    191: 'roots_sa_reggae',
    194: 'cowboysdancehallsa',
    195: 'jazz.southaustralia',
    196: 'indiecomicssa',
    197: 'soundsbysa',
    198: 'edmsouthafrica',
    199: 'saelectronicss',
    202: 'kasia.music_',
    203: 'durbanmusicfestival',
    204: 'sowetomea',
    207: 'townshiptheband',
    208: 'pretoriamusic',
    210: 'sabeats_family',
    211: 'mzansi.nostalgia',
    212: 'motionhub_experience',
    215: 'mzansigram',
    216: 'hiphophub.tv',
    217: 'theafricanbeats',
    218: 'hubhousesa',
    220: 'piano__hub',
    221: 'soft_life_music',
    222: 'afrobeatscntrl',
    223: 'sa_rappers_daily',
    224: 'africa.music.updates',
    225: 'samusic.tv',
    227: 'rapnation',
    228: 'afbdaily',
    229: 'amapiano_nation_tv',
    230: 'thisisgqom_',
    231: 'everythingsamusic',
    234: 'theofficialsacharts',
    236: 'african_music_trends',
    239: 'electronicnation',
    241: 'jazznationtx',
    242: 'gospel.nation',
    244: 'summer_samusicnews',
    245: 'rnbnationevents',
    246: 'indienation_za',
    247: 'reggaenation',
    248: 'sandybworld',
    249: 'afrobeatsintel',
    250: 'mzansi.spotlight',
    252: 'amapianoworldwide',
    254: 'sa_artist_spotlight',
    255: 'hiphopreposts',
    256: 'mzansi_sounds_',
    257: 'sounds_of_africa',
    260: 'mzwaamusic',
    261: 'sahiphoptv',
    265: 'hiphopbuzztv',
    268: 'amapiano_network',
    269: 'hip_hop_connect',
    272: 'sahiphopmusicblog',
    273: 'samusic.tv',
    274: 'amapianoworldwide',
    276: 'amapianoworldwide',
    277: 'rapspotlights',
    278: 'the.hiphopzone',
    279: 'everythingsamusic',
    280: 'sahiphopmusicblog',
    281: 'sahiphop247',
    282: 'sahiphopmusicblog',
    283: 'samusic.tv',
    284: 'amapianomusicblog',
    286: 'sahiphopreloaded',
    288: 'amapiano.tv',
    289: 'amapiano.tv',
    290: 'amapiano.tv',
    292: 'hiphopwired',
    293: 'amapiano.tv',
    294: 'amapiano.tv',
    295: 'sahiphop247',
    296: 'soundsbysa',
    297: 'samusic.tv',
    298: 'jay_lelo',
    299: 'everythingsamusic',
};

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

let added = 0;
for (const entry of data) {
    if (realHandles[entry.id]) {
        entry.realInstagram = '@' + realHandles[entry.id];
        added++;
    }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

console.log(`Added realInstagram field to ${added} entries`);

// Show a few examples
const examples = data.filter(e => e.realInstagram).slice(0, 5);
examples.forEach(e => {
    console.log(`  [${e.id}] ${e.person}: instagram=${e.instagram}, realInstagram=${e.realInstagram}`);
});

// Final stats
const first300 = data.slice(0, 300);
const withPics = first300.filter(x => x.profilePic && x.profilePic.startsWith('http'));
const withReal = first300.filter(x => x.realInstagram);
console.log(`\nFirst 300: ${withPics.length} with pics, ${withReal.length} with realInstagram`);
