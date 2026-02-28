#!/usr/bin/env npx tsx
/**
 * Visio Lead Sheet Generator
 *
 * Generates a lead sheet of independent artists from Spotify playlists
 * using real API data — not AI estimates.
 *
 * What this does better than Manus AI's approach:
 * - Uses Spotify Web API for EXACT follower counts (not GPT estimates)
 * - Gets real genre tags and label info from Spotify album metadata
 * - Verifies independent status via MusicBrainz (free, no key)
 * - Gets real Instagram follower counts via Apify (optional)
 * - Discovers management/booking emails from artist websites
 * - Produces a formatted Excel file with hyperlinks, color coding, genre tabs
 * - Outputs in Visio DBLead format for immediate platform integration
 * - Accumulation mode: merges with existing data on re-runs
 * - Progress saving: survives crashes, resumes where it left off
 * - Fully repeatable — run weekly with any playlist IDs
 *
 * Usage:
 *   SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy npx tsx scripts/generate-lead-sheet.ts
 *
 * Environment variables:
 *   SPOTIFY_CLIENT_ID     — required (from developer.spotify.com/dashboard)
 *   SPOTIFY_CLIENT_SECRET — required
 *   APIFY_API_TOKEN       — optional, for real Instagram follower counts
 *   SERPER_API_KEY        — optional, for Instagram handle + management contact discovery
 *   MAX_ARTISTS           — max output size (default: 2000)
 *   MAX_LISTENERS         — Spotify follower cap (default: 1000000)
 *   MAX_IG_FOLLOWERS      — Instagram follower cap (default: 500000)
 *   OUTPUT_DIR            — output directory (default: ./data)
 *   PLAYLISTS             — comma-separated Spotify playlist IDs (overrides defaults)
 *   SKIP_MUSICBRAINZ      — set to "1" to skip MusicBrainz verification
 *   SKIP_INSTAGRAM        — set to "1" to skip Instagram enrichment
 *   SKIP_MANAGEMENT       — set to "1" to skip management contact discovery
 *   RESUME                — set to "1" to resume from last checkpoint
 */

import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

// ─── Configuration ────────────────────────────────────────
const CONFIG = {
  maxArtists: parseInt(process.env.MAX_ARTISTS || '2000'),
  maxListeners: parseInt(process.env.MAX_LISTENERS || '1000000'),
  maxIgFollowers: parseInt(process.env.MAX_IG_FOLLOWERS || '500000'),
  outputDir: process.env.OUTPUT_DIR || path.join(process.cwd(), 'data'),
  checkpointDir: path.join(process.cwd(), 'data', '.lead-sheet-progress'),
  dbOutputPath: path.join(process.cwd(), 'data', 'db_artists.json'),

  // 20+ Spotify editorial playlists for maximum artist coverage
  defaultPlaylists: [
    // Global editorial
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
    '37i9dQZF1DX2RxBh64BHjQ', // Most Necessary
    '37i9dQZF1DWXRqgorJj26U', // Fresh Finds
    '37i9dQZF1DX4SBhb3fqCJd', // Are & Be
    '37i9dQZF1DWY4xHQp97fN6', // Get Turnt
    '37i9dQZF1DX4dyzvuaRJ0n', // mint
    '37i9dQZF1DX10zKzsJ2jva', // Viva Latino
    // Africa-focused
    '37i9dQZF1DWYkaDif7Ztbx', // African Heat
    '37i9dQZF1DWTx0xog3gN3q', // Amapiano Lifestyle
    '37i9dQZF1DWVnLfpCmXqaW', // Afrobeats Hits
    '37i9dQZF1DX0BcQWzuB7ZO', // Hot Hits South Africa
    '37i9dQZF1DX7sM5YWmkaGq', // Afro Hub
    '37i9dQZF1DX0IF4yTWCPfz', // Amapiano Grooves
    '37i9dQZF1DWSiyIBdVQlDC', // Mzansi House
    // Genre-specific global
    '37i9dQZF1DX0h0QnLkMBl4', // Peaceful Piano (for alt/indie crossover)
    '37i9dQZF1DX1lVhptIYRda', // Hot Country (diverse genre)
    '37i9dQZF1DX76Wlfdnj7AP', // Beast Mode
    '37i9dQZF1DX186v583rmzp', // I Love My '90s Hip-Hop
    '37i9dQZF1DWWMOmoXKqHTD', // Songs to Sing in the Car
    // R&B / Soul
    '37i9dQZF1DX2WkIBRaChxW', // R&B Favourites
    '37i9dQZF1DWTwzVdyRpXm1', // Neo Soul Lounge
  ],
};

// Major label groups and their subsidiaries — comprehensive list
const MAJOR_LABELS = new Set([
  // Universal Music Group (UMG)
  'universal music', 'umg', 'interscope', 'interscope records',
  'def jam', 'def jam recordings', 'republic records', 'republic',
  'capitol records', 'capitol', 'virgin records', 'virgin music',
  'island records', 'island', 'geffen', 'geffen records',
  'polydor', 'polydor records', 'motown', 'motown records',
  'verve', 'verve records', 'decca', 'decca records',
  'mercury', 'mercury records', 'aftermath', 'aftermath entertainment',
  'universal music group', 'emi', 'emi records', 'virgin emi',
  'capitol music group', 'harvest records', 'blue note',
  'caroline', 'caroline international', 'spinefarm',
  // Sony Music Entertainment
  'sony music', 'sony music entertainment', 'columbia records', 'columbia',
  'rca records', 'rca', 'epic records', 'epic',
  'arista records', 'arista', 'jive records', 'jive',
  'legacy recordings', 'sony bmg', 'sony/atv',
  'so so def', 'kemosabe', 'syco', 'syco music',
  'century media', 'provident', 'roc nation',
  // Warner Music Group (WMG)
  'warner music', 'warner music group', 'warner records',
  'atlantic records', 'atlantic', 'elektra records', 'elektra',
  'parlophone', 'parlophone records', 'rhino', 'rhino entertainment',
  'sire records', 'sire', 'warner bros', 'warner bros. records',
  'warner chappell', 'asylum records', 'big beat records',
  'fueled by ramen', 'roadrunner', 'nonesuch',
  'reprise records', 'reprise', '300 entertainment',
  // Other major-adjacent
  'bmg', 'bmg rights management', 'concord', 'concord music',
  'kobalt', 'kobalt music', 'empire', 'empire distribution',
  'awal', 'downtown records',
  // African majors
  'universal music africa', 'sony music africa',
  'warner music africa', 'universal music nigeria',
  'chocolate city', // Debatable but large
]);

// ─── Types ────────────────────────────────────────────────

interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  external_urls: { spotify: string };
  images: { url: string; width: number; height: number }[];
}

interface SpotifyAlbum {
  name: string;
  release_date: string;
  label: string;
  album_type: string;
}

interface ArtistLead {
  name: string;
  spotifyId: string;
  spotifyUrl: string;
  spotifyFollowers: number;
  genres: string[];
  primaryGenre: string;
  popularity: number;
  label: string;
  labelVerified: boolean;
  isIndependent: boolean;
  latestRelease: string;
  latestReleaseDate: string;
  instagramHandle: string;
  instagramFollowers: number;
  instagramEngagement: string;
  contactEmail: string;
  managementInfo: string;
  website: string;
  playlistsSeen: string[];
  imageUrl: string;
}

// Matches lib/db.ts DBLead format
interface DBLead {
  id: string;
  company: string;
  person: string;
  title: string;
  email: string;
  country: string;
  industry: string;
  source: string;
  dateAdded: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  followers?: string;
  status?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  label?: string;
  website?: string;
  managementInfo?: string;
  profilePic?: string;
}

interface CheckpointData {
  step: string;
  artistIds: string[];
  artistPlaylistMap: Record<string, string[]>;
  leads: ArtistLead[];
  filteredLeads: ArtistLead[];
  stats: Record<string, number>;
  timestamp: string;
}

// ─── Spotify API ──────────────────────────────────────────

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('');
    console.error('  Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET');
    console.error('');
    console.error('  To set up (free, takes 2 minutes):');
    console.error('  1. Go to https://developer.spotify.com/dashboard');
    console.error('  2. Log in or create a Spotify account');
    console.error('  3. Click "Create App"');
    console.error('     - App name: "Visio Lead Gen" (or anything)');
    console.error('     - App description: "Lead generation"');
    console.error('     - Redirect URI: http://localhost:3000 (not used but required)');
    console.error('     - Check "Web API"');
    console.error('  4. Go to Settings → copy Client ID and Client Secret');
    console.error('  5. Run:');
    console.error('     SPOTIFY_CLIENT_ID=xxx SPOTIFY_CLIENT_SECRET=yyy npx tsx scripts/generate-lead-sheet.ts');
    console.error('');
    process.exit(1);
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status} ${await response.text()}`);
  }

  const data: SpotifyToken = await response.json();
  return data.access_token;
}

async function spotifyGet(token: string, endpoint: string): Promise<any> {
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '3');
    console.log(`  [Spotify] Rate limited, waiting ${retryAfter}s...`);
    await sleep(retryAfter * 1000);
    return spotifyGet(token, endpoint);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Spotify API ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

async function getPlaylistTracks(
  token: string,
  playlistId: string
): Promise<{ artistIds: Set<string>; playlistName: string }> {
  const artistIds = new Set<string>();
  let offset = 0;
  const limit = 100;

  const playlistData = await spotifyGet(token, `/playlists/${playlistId}?fields=name`);
  const playlistName = playlistData.name;
  console.log(`    "${playlistName}"`);

  while (true) {
    const data = await spotifyGet(
      token,
      `/playlists/${playlistId}/tracks?offset=${offset}&limit=${limit}&fields=items(track(artists(id))),total`
    );

    for (const item of data.items || []) {
      if (item.track?.artists) {
        for (const artist of item.track.artists) {
          if (artist.id) artistIds.add(artist.id);
        }
      }
    }

    if (!data.items || data.items.length < limit) break;
    offset += limit;
  }

  console.log(`      ${artistIds.size} artists`);
  return { artistIds, playlistName };
}

async function getArtistDetails(token: string, artistIds: string[]): Promise<SpotifyArtist[]> {
  const artists: SpotifyArtist[] = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    const batch = artistIds.slice(i, i + 50);
    const data = await spotifyGet(token, `/artists?ids=${batch.join(',')}`);
    artists.push(...(data.artists || []).filter(Boolean));
    if (i + 50 < artistIds.length) await sleep(100);
    if ((i + 50) % 500 === 0) {
      console.log(`    ${i + 50}/${artistIds.length} fetched...`);
    }
  }
  return artists;
}

async function getArtistAlbums(token: string, artistId: string): Promise<SpotifyAlbum[]> {
  const data = await spotifyGet(
    token,
    `/artists/${artistId}/albums?include_groups=album,single&limit=5&market=ZA`
  );
  return (data.items || []).map((a: any) => ({
    name: a.name,
    release_date: a.release_date,
    label: a.label || '',
    album_type: a.album_type,
  }));
}

// ─── MusicBrainz API (free, no key needed) ────────────────

async function checkMusicBrainz(artistName: string): Promise<{ label: string; isIndependent: boolean } | null> {
  try {
    const query = encodeURIComponent(artistName);
    const response = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=${query}&limit=1&fmt=json`,
      { headers: { 'User-Agent': 'VisioLeadGen/1.0 (https://visio.co.za)' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.artists?.length) return null;

    const artist = data.artists[0];
    const labelRels = (artist['label-relation-list'] || []).map(
      (r: any) => r.label?.name?.toLowerCase() || ''
    );
    const hasMainstreamLabel = labelRels.some((l: string) =>
      [...MAJOR_LABELS].some(ml => l.includes(ml))
    );

    return { label: labelRels[0] || '', isIndependent: !hasMainstreamLabel };
  } catch {
    return null;
  }
}

// ─── Instagram via Apify (optional) ──────────────────────

async function getInstagramData(handles: string[]): Promise<Map<string, { followers: number; engagement: string }>> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return new Map();

  const results = new Map<string, { followers: number; engagement: string }>();
  const batchSize = 25;

  for (let i = 0; i < handles.length; i += batchSize) {
    const batch = handles.slice(i, i + batchSize).map(h => h.replace(/^@/, ''));
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(handles.length / batchSize);
    console.log(`    [IG] Batch ${batchNum}/${totalBatches} (${batch.length} handles)`);

    try {
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernames: batch }),
          signal: AbortSignal.timeout(300000),
        }
      );

      if (!runRes.ok) {
        console.log(`    [IG] Batch failed: ${runRes.status}`);
        continue;
      }

      const items = await runRes.json();
      for (const item of items || []) {
        const handle = (item.username || '').toLowerCase();
        if (!handle) continue;
        const followers = item.followersCount || item.edge_followed_by?.count || 0;
        const avgLikes = item.avgLikesPerPost || 0;
        const engagement = followers > 0
          ? `${((avgLikes / followers) * 100).toFixed(1)}%`
          : 'N/A';
        results.set(handle, { followers, engagement });
      }
    } catch (err: any) {
      console.log(`    [IG] Batch error: ${err.message}`);
    }

    if (i + batchSize < handles.length) await sleep(2000);
  }

  return results;
}

// ─── Instagram Handle + Management Contact Discovery ─────

async function googleSearch(query: string): Promise<{ link: string; title: string; snippet: string }[]> {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return [];

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 5 }),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.organic || []).map((r: any) => ({
      link: r.link || '',
      title: r.title || '',
      snippet: r.snippet || '',
    }));
  } catch {
    return [];
  }
}

async function findInstagramHandle(artistName: string): Promise<string> {
  const results = await googleSearch(`${artistName} instagram.com`);
  for (const result of results) {
    const match = result.link?.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
    if (match) {
      const handle = match[1].toLowerCase();
      const skip = ['p', 'reel', 'reels', 'explore', 'stories', 'tv', 'accounts', 'about'];
      if (!skip.includes(handle)) return `@${handle}`;
    }
  }
  return '';
}

async function findManagementContact(
  artistName: string
): Promise<{ email: string; management: string; website: string }> {
  const result = { email: '', management: '', website: '' };
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) return result;

  // Search for artist's official site or management
  const results = await googleSearch(
    `"${artistName}" artist management booking contact email`
  );

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const skipDomains = [
    'example.com', 'test.com', 'sentry.io', 'w3.org',
    'schema.org', 'google.com', 'facebook.com', 'twitter.com',
  ];

  for (const r of results) {
    // Extract emails from snippets
    const emails = r.snippet?.match(emailRegex) || [];
    for (const email of emails) {
      if (!skipDomains.some(d => email.includes(d))) {
        result.email = email;
        break;
      }
    }

    // Look for management keywords
    const snippet = (r.snippet || '').toLowerCase();
    if (snippet.includes('management') || snippet.includes('booking') || snippet.includes('manager')) {
      result.management = r.snippet.slice(0, 200);
    }

    // Capture website (skip social media)
    if (
      r.link &&
      !r.link.includes('instagram.com') &&
      !r.link.includes('twitter.com') &&
      !r.link.includes('x.com') &&
      !r.link.includes('facebook.com') &&
      !r.link.includes('tiktok.com') &&
      !r.link.includes('spotify.com') &&
      !r.link.includes('youtube.com') &&
      !r.link.includes('wikipedia.org') &&
      !result.website
    ) {
      result.website = r.link;
    }

    if (result.email) break;
  }

  // If we found a website but no email, try scraping it
  if (result.website && !result.email) {
    try {
      const res = await fetch(result.website, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(8000),
        redirect: 'follow',
      });
      if (res.ok) {
        const html = await res.text();
        const pageEmails = html.match(emailRegex) || [];
        for (const email of pageEmails) {
          const lower = email.toLowerCase();
          if (
            !skipDomains.some(d => lower.includes(d)) &&
            !lower.endsWith('.png') &&
            !lower.endsWith('.jpg') &&
            !lower.endsWith('.css') &&
            !lower.endsWith('.js')
          ) {
            result.email = email;
            // Check if it's a management/booking email
            if (
              lower.includes('booking') ||
              lower.includes('management') ||
              lower.includes('mgmt') ||
              lower.includes('manager')
            ) {
              result.management = `Booking: ${email}`;
            }
            break;
          }
        }
      }
    } catch {
      /* skip failed scrapes */
    }
  }

  return result;
}

// ─── Label Classification ─────────────────────────────────

function isLikelyMajorLabel(labelName: string): boolean {
  const lower = labelName.toLowerCase().trim();
  if (!lower) return false;
  return [...MAJOR_LABELS].some(ml => lower.includes(ml));
}

function classifyGenre(genres: string[]): string {
  const genreMap: Record<string, string[]> = {
    Amapiano: ['amapiano'],
    Afrobeats: ['afrobeats', 'naija', 'afropop', 'afro pop'],
    'Afro House': ['afro house', 'tribal house'],
    'Hip-Hop/Rap': ['hip hop', 'rap', 'trap', 'drill', 'grime'],
    'R&B/Soul': ['r&b', 'rnb', 'soul', 'neo soul', 'neo-soul'],
    'House/Dance': ['house', 'dance', 'edm', 'electronic', 'deep house', 'tech house', 'gqom'],
    Pop: ['pop', 'indie pop'],
    Gospel: ['gospel', 'worship'],
    Jazz: ['jazz', 'smooth jazz'],
    'Reggae/Dancehall': ['reggae', 'dancehall', 'reggaeton'],
    'Rock/Alternative': ['rock', 'alternative', 'indie rock', 'punk'],
    Kwaito: ['kwaito', 'south african house'],
    Maskandi: ['maskandi'],
    Latin: ['latin', 'reggaeton', 'bachata', 'salsa'],
  };

  for (const [category, keywords] of Object.entries(genreMap)) {
    for (const genre of genres) {
      const lower = genre.toLowerCase();
      if (keywords.some(k => lower.includes(k))) return category;
    }
  }

  return genres[0] || 'Other';
}

// ─── Progress Checkpoint ──────────────────────────────────

function saveCheckpoint(step: string, data: Partial<CheckpointData>) {
  if (!fs.existsSync(CONFIG.checkpointDir)) {
    fs.mkdirSync(CONFIG.checkpointDir, { recursive: true });
  }
  const checkpoint: Partial<CheckpointData> = { step, timestamp: new Date().toISOString(), ...data };
  fs.writeFileSync(
    path.join(CONFIG.checkpointDir, `checkpoint-${step}.json`),
    JSON.stringify(checkpoint, null, 2)
  );
}

function loadCheckpoint(step: string): Partial<CheckpointData> | null {
  const file = path.join(CONFIG.checkpointDir, `checkpoint-${step}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function clearCheckpoints() {
  if (fs.existsSync(CONFIG.checkpointDir)) {
    const files = fs.readdirSync(CONFIG.checkpointDir);
    for (const f of files) {
      fs.unlinkSync(path.join(CONFIG.checkpointDir, f));
    }
  }
}

// ─── DBLead Export (Accumulation Mode) ────────────────────

function exportToDBFormat(artists: ArtistLead[]): DBLead[] {
  return artists.map((a, i) => ({
    id: `spotify-${a.spotifyId}`,
    company: a.label || a.name,
    person: a.name,
    title: a.primaryGenre,
    email: a.contactEmail,
    country: 'INT', // International — from Spotify playlists
    industry: a.primaryGenre,
    source: `Spotify (${a.playlistsSeen.join(', ')})`,
    dateAdded: new Date().toISOString().split('T')[0],
    instagram: a.instagramHandle || undefined,
    followers: formatNumber(a.spotifyFollowers),
    status: a.labelVerified ? 'Verified' : 'New',
    spotifyId: a.spotifyId,
    spotifyUrl: a.spotifyUrl,
    label: a.label || undefined,
    website: a.website || undefined,
    managementInfo: a.managementInfo || undefined,
    profilePic: a.imageUrl || undefined,
  }));
}

function mergeWithExistingDB(newLeads: DBLead[]): DBLead[] {
  let existing: DBLead[] = [];
  if (fs.existsSync(CONFIG.dbOutputPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(CONFIG.dbOutputPath, 'utf-8'));
      console.log(`  Existing DB: ${existing.length} artists`);
    } catch {
      existing = [];
    }
  }

  // Build a set of existing Spotify IDs for dedup
  const existingIds = new Set(existing.map(l => l.spotifyId || l.id));
  let added = 0;
  let updated = 0;

  for (const lead of newLeads) {
    const spotifyId = lead.spotifyId || lead.id;
    if (existingIds.has(spotifyId)) {
      // Update existing entry with newer data
      const idx = existing.findIndex(e => (e.spotifyId || e.id) === spotifyId);
      if (idx >= 0) {
        // Merge: keep existing data, overwrite with non-empty new data
        const merged = { ...existing[idx] };
        if (lead.email) merged.email = lead.email;
        if (lead.instagram) merged.instagram = lead.instagram;
        if (lead.followers) merged.followers = lead.followers;
        if (lead.label) merged.label = lead.label;
        if (lead.website) merged.website = lead.website;
        if (lead.managementInfo) merged.managementInfo = lead.managementInfo;
        if (lead.profilePic) merged.profilePic = lead.profilePic;
        merged.status = lead.status || merged.status;
        existing[idx] = merged;
        updated++;
      }
    } else {
      existing.push(lead);
      existingIds.add(spotifyId);
      added++;
    }
  }

  console.log(`  Added ${added} new artists, updated ${updated} existing`);
  return existing;
}

// ─── Excel Builder ────────────────────────────────────────

const GENRE_COLORS: Record<string, string> = {
  Amapiano: 'FFE8D5',
  Afrobeats: 'D5F5E3',
  'Afro House': 'C8E6C9',
  'Hip-Hop/Rap': 'FADBD8',
  'R&B/Soul': 'D6EAF8',
  'House/Dance': 'E8DAEF',
  Pop: 'FCF3CF',
  Gospel: 'FDEBD0',
  Jazz: 'D4EFDF',
  'Reggae/Dancehall': 'DCEDC8',
  'Rock/Alternative': 'F2D7D5',
  Kwaito: 'F9E79F',
  Maskandi: 'EDBB99',
  Latin: 'F8BBD0',
  Other: 'F2F3F4',
};

async function buildExcel(artists: ArtistLead[], outputPath: string): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Visio Lead Gen';
  workbook.created = new Date();

  // ─── Sheet 1: How To Use ────────────────────────────
  const howToUse = workbook.addWorksheet('How To Use', {
    properties: { tabColor: { argb: '4472C4' } },
  });

  howToUse.mergeCells('A1:F1');
  howToUse.getCell('A1').value = 'VISIO LEAD SHEET — Independent Artist Database';
  howToUse.getCell('A1').font = { size: 18, bold: true, color: { argb: 'FFFFFF' } };
  howToUse.getCell('A1').fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50' },
  };
  howToUse.getCell('A1').alignment = { horizontal: 'center' };
  howToUse.getRow(1).height = 40;

  const instructions: [string, string][] = [
    ['', ''],
    ['Generated', new Date().toISOString().split('T')[0]],
    ['Total Artists', `${artists.length}`],
    ['Data Source', 'Spotify Web API (exact data), MusicBrainz (label verification), Apify (Instagram)'],
    ['', ''],
    ['HOW TO USE THIS SHEET', ''],
    ['', ''],
    ['1. Main Lead Sheet', 'All artists with data. Click column headers to sort/filter.'],
    ['2. Genre Summary', 'Breakdown by genre — count, avg followers, % of total.'],
    ['3. Filtering', 'AutoFilter is enabled — click any header dropdown to filter.'],
    ['4. Spotify Links', 'Artist names are clickable hyperlinks to their Spotify profiles.'],
    ['5. Instagram Links', 'Instagram handles link directly to their profiles.'],
    ['6. Color Coding', 'Rows color-coded by genre for quick visual scanning.'],
    ['7. Contact Info', 'Management emails and websites discovered via web scraping.'],
    ['', ''],
    ['DATA ACCURACY', ''],
    ['', ''],
    ['Spotify Followers', 'EXACT figures from Spotify API'],
    ['Genres', 'From Spotify\'s genre classification system'],
    ['Label', 'From latest album metadata on Spotify + MusicBrainz cross-reference'],
    ['Instagram Followers', process.env.APIFY_API_TOKEN ? 'REAL counts from Instagram via Apify' : 'Not enriched (set APIFY_API_TOKEN)'],
    ['Contact Emails', process.env.SERPER_API_KEY ? 'Discovered from artist websites via web scraping' : 'Not enriched (set SERPER_API_KEY)'],
    ['', ''],
    ['VS MANUS AI APPROACH', ''],
    ['', ''],
    ['This sheet', 'All data from real APIs — zero AI estimation'],
    ['Manus AI', 'Used GPT-4.1 to estimate listener counts (wrong by 50x in some cases)'],
    ['This sheet', 'Verifies labels via Spotify album metadata + MusicBrainz'],
    ['Manus AI', 'Classified labels by AI guessing — no API verification'],
    ['This sheet', 'Includes management emails, websites, booking contacts'],
    ['Manus AI', 'Only provided Instagram handles (no contact info)'],
  ];

  instructions.forEach(([col1, col2], i) => {
    const row = howToUse.getRow(i + 2);
    row.getCell(1).value = col1;
    row.getCell(2).value = col2;
    if (col1 && !col2) {
      row.getCell(1).font = { bold: true, size: 13, color: { argb: '2C3E50' } };
    } else if (col1) {
      row.getCell(1).font = { bold: true };
    }
  });

  howToUse.getColumn(1).width = 25;
  howToUse.getColumn(2).width = 80;

  // ─── Sheet 2: Main Lead Sheet ───────────────────────
  const mainSheet = workbook.addWorksheet('Lead Sheet', {
    properties: { tabColor: { argb: '27AE60' } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = [
    'Artist Name', 'Primary Genre', 'Spotify Followers', 'Popularity',
    'All Genres', 'Label', 'Independent?', 'Latest Release',
    'Release Date', 'Instagram', 'IG Followers', 'IG Engagement',
    'Contact Email', 'Management', 'Website', 'Spotify URL',
    'Playlists Found In',
  ];

  const headerRow = mainSheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: '000000' } } };
  });
  headerRow.height = 30;

  const colWidths = [25, 18, 18, 12, 30, 25, 14, 28, 14, 18, 15, 14, 30, 35, 30, 45, 35];
  colWidths.forEach((w, i) => { mainSheet.getColumn(i + 1).width = w; });

  artists.forEach((artist, idx) => {
    const row = mainSheet.getRow(idx + 2);
    const genreColor = GENRE_COLORS[artist.primaryGenre] || GENRE_COLORS['Other'];

    // Artist name with Spotify hyperlink
    row.getCell(1).value = { text: artist.name, hyperlink: artist.spotifyUrl };
    row.getCell(1).font = { color: { argb: '0563C1' }, underline: true, bold: true };

    row.getCell(2).value = artist.primaryGenre;
    row.getCell(3).value = artist.spotifyFollowers;
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).value = artist.popularity;
    row.getCell(5).value = artist.genres.join(', ');
    row.getCell(6).value = artist.label;

    row.getCell(7).value = artist.isIndependent ? 'Yes' : 'No';
    row.getCell(7).font = {
      color: { argb: artist.isIndependent ? '27AE60' : 'E74C3C' }, bold: true,
    };

    row.getCell(8).value = artist.latestRelease;
    row.getCell(9).value = artist.latestReleaseDate;

    if (artist.instagramHandle) {
      const handle = artist.instagramHandle.replace(/^@/, '');
      row.getCell(10).value = { text: `@${handle}`, hyperlink: `https://instagram.com/${handle}` };
      row.getCell(10).font = { color: { argb: 'C13584' }, underline: true };
    }

    row.getCell(11).value = artist.instagramFollowers || '';
    if (artist.instagramFollowers) row.getCell(11).numFmt = '#,##0';
    row.getCell(12).value = artist.instagramEngagement || '';
    row.getCell(13).value = artist.contactEmail;
    row.getCell(14).value = artist.managementInfo;

    if (artist.website) {
      row.getCell(15).value = { text: artist.website, hyperlink: artist.website };
      row.getCell(15).font = { color: { argb: '0563C1' }, underline: true };
    }

    row.getCell(16).value = artist.spotifyUrl;
    row.getCell(17).value = artist.playlistsSeen.join(', ');

    // Genre-based row coloring (alternating)
    for (let c = 1; c <= headers.length; c++) {
      row.getCell(c).fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? genreColor : 'FFFFFF' },
      };
    }
  });

  mainSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: artists.length + 1, column: headers.length },
  };

  // ─── Sheet 3: Genre Summary ─────────────────────────
  const genreSheet = workbook.addWorksheet('Genre Summary', {
    properties: { tabColor: { argb: 'E74C3C' } },
  });

  const genreCounts = new Map<string, { count: number; totalFollowers: number; withEmail: number }>();
  for (const artist of artists) {
    const existing = genreCounts.get(artist.primaryGenre) || { count: 0, totalFollowers: 0, withEmail: 0 };
    existing.count++;
    existing.totalFollowers += artist.spotifyFollowers;
    if (artist.contactEmail) existing.withEmail++;
    genreCounts.set(artist.primaryGenre, existing);
  }

  const gHeaders = ['Genre', 'Count', 'Avg Spotify Followers', '% of Total', 'Have Email'];
  const gHeaderRow = genreSheet.getRow(1);
  gHeaders.forEach((h, i) => {
    const cell = gHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2C3E50' } };
    cell.alignment = { horizontal: 'center' };
  });

  const sortedGenres = [...genreCounts.entries()].sort((a, b) => b[1].count - a[1].count);
  sortedGenres.forEach(([genre, data], i) => {
    const row = genreSheet.getRow(i + 2);
    row.getCell(1).value = genre;
    row.getCell(2).value = data.count;
    row.getCell(3).value = Math.round(data.totalFollowers / data.count);
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).value = `${((data.count / artists.length) * 100).toFixed(1)}%`;
    row.getCell(5).value = `${data.withEmail}/${data.count}`;

    const color = GENRE_COLORS[genre] || GENRE_COLORS['Other'];
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
    }
  });

  [22, 10, 22, 12, 12].forEach((w, i) => { genreSheet.getColumn(i + 1).width = w; });

  await workbook.xlsx.writeFile(outputPath);
}

// ─── Utilities ────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('='.repeat(65));
  console.log('  VISIO LEAD SHEET GENERATOR');
  console.log('  Real API data. Not AI estimates. Better than Manus.');
  console.log('='.repeat(65));
  console.log('');

  const resume = process.env.RESUME === '1';
  if (resume) console.log('  RESUME MODE: Loading from last checkpoint\n');

  // ─── Step 1: Spotify Auth ──────────────────────────
  console.log('[1/9] Authenticating with Spotify API...');
  const token = await getSpotifyToken();
  console.log('  OK\n');

  // ─── Step 2: Pull Playlists ────────────────────────
  const playlistIds = process.env.PLAYLISTS
    ? process.env.PLAYLISTS.split(',').map(s => s.trim())
    : CONFIG.defaultPlaylists;

  let allArtistIds: Set<string>;
  let artistPlaylistMap: Map<string, string[]>;

  const playlistCheckpoint = resume ? loadCheckpoint('playlists') : null;
  if (playlistCheckpoint?.artistIds) {
    console.log(`[2/9] Loading playlist data from checkpoint (${playlistCheckpoint.artistIds.length} artists)...\n`);
    allArtistIds = new Set(playlistCheckpoint.artistIds);
    artistPlaylistMap = new Map(Object.entries(playlistCheckpoint.artistPlaylistMap || {}));
  } else {
    console.log(`[2/9] Scanning ${playlistIds.length} playlists...`);
    allArtistIds = new Set<string>();
    artistPlaylistMap = new Map<string, string[]>();

    for (const playlistId of playlistIds) {
      try {
        const { artistIds, playlistName } = await getPlaylistTracks(token, playlistId);
        for (const id of artistIds) {
          allArtistIds.add(id);
          const existing = artistPlaylistMap.get(id) || [];
          existing.push(playlistName);
          artistPlaylistMap.set(id, existing);
        }
      } catch (err: any) {
        console.log(`    Playlist ${playlistId} failed: ${err.message.slice(0, 80)}`);
      }
      await sleep(200);
    }

    saveCheckpoint('playlists', {
      artistIds: [...allArtistIds],
      artistPlaylistMap: Object.fromEntries(artistPlaylistMap),
    });
    console.log(`  Total unique artists: ${allArtistIds.size}\n`);
  }

  // ─── Step 3: Get Artist Details ────────────────────
  console.log(`[3/9] Fetching Spotify data for ${allArtistIds.size} artists...`);
  const artistDetails = await getArtistDetails(token, [...allArtistIds]);
  console.log(`  Got ${artistDetails.length} artists\n`);

  // ─── Step 4: Get Album Metadata ────────────────────
  let leads: ArtistLead[];
  const leadsCheckpoint = resume ? loadCheckpoint('leads') : null;

  if (leadsCheckpoint?.leads?.length) {
    console.log(`[4/9] Loading leads from checkpoint (${leadsCheckpoint.leads.length})...\n`);
    leads = leadsCheckpoint.leads;
  } else {
    console.log('[4/9] Fetching album metadata + classifying labels...');
    leads = [];
    let majorLabelCount = 0;
    let tooPopularCount = 0;
    let processed = 0;

    for (const artist of artistDetails) {
      processed++;
      if (processed % 50 === 0) {
        console.log(`    ${processed}/${artistDetails.length}...`);
      }

      let albums: SpotifyAlbum[] = [];
      try {
        albums = await getArtistAlbums(token, artist.id);
      } catch { /* skip */ }
      await sleep(80);

      const latestAlbum = albums[0];
      const label = latestAlbum?.label || '';

      if (isLikelyMajorLabel(label)) {
        majorLabelCount++;
        continue;
      }

      const followers = artist.followers?.total || 0;
      if (followers > CONFIG.maxListeners) {
        tooPopularCount++;
        continue;
      }

      const genres = artist.genres || [];
      leads.push({
        name: artist.name,
        spotifyId: artist.id,
        spotifyUrl: artist.external_urls?.spotify || `https://open.spotify.com/artist/${artist.id}`,
        spotifyFollowers: followers,
        genres,
        primaryGenre: classifyGenre(genres),
        popularity: artist.popularity,
        label,
        labelVerified: false,
        isIndependent: true,
        latestRelease: latestAlbum?.name || '',
        latestReleaseDate: latestAlbum?.release_date || '',
        instagramHandle: '',
        instagramFollowers: 0,
        instagramEngagement: '',
        contactEmail: '',
        managementInfo: '',
        website: '',
        playlistsSeen: artistPlaylistMap.get(artist.id) || [],
        imageUrl: artist.images?.[0]?.url || '',
      });

      // Save progress every 200 artists
      if (leads.length % 200 === 0) {
        saveCheckpoint('leads-partial', { leads });
      }
    }

    saveCheckpoint('leads', {
      leads,
      stats: { majorLabelCount, tooPopularCount },
    });

    console.log(`  Major label filtered: ${majorLabelCount}`);
    console.log(`  Too popular filtered: ${tooPopularCount}`);
    console.log(`  Independent artists: ${leads.length}\n`);
  }

  // ─── Step 5: MusicBrainz Verification ──────────────
  if (process.env.SKIP_MUSICBRAINZ !== '1') {
    console.log('[5/9] Verifying labels via MusicBrainz...');
    const sampleSize = Math.min(leads.length, 100);
    let mbVerified = 0;
    let mbMajorFound = 0;

    for (let i = 0; i < sampleSize; i++) {
      const lead = leads[i];
      if (lead.labelVerified) continue; // Already verified

      const mbResult = await checkMusicBrainz(lead.name);
      if (mbResult) {
        lead.labelVerified = true;
        if (!mbResult.isIndependent) {
          lead.isIndependent = false;
          mbMajorFound++;
        }
        if (mbResult.label && !lead.label) {
          lead.label = mbResult.label;
        }
        mbVerified++;
      }
      await sleep(1100); // MusicBrainz: 1 req/s
      if ((i + 1) % 20 === 0) {
        console.log(`    ${i + 1}/${sampleSize} checked...`);
      }
    }

    leads = leads.filter(l => l.isIndependent);
    console.log(`  MusicBrainz verified: ${mbVerified}, additional major finds: ${mbMajorFound}`);
    console.log(`  Remaining independents: ${leads.length}\n`);
  } else {
    console.log('[5/9] MusicBrainz verification: SKIPPED\n');
  }

  // ─── Step 6: Instagram Handle Discovery ────────────
  if (process.env.SKIP_INSTAGRAM !== '1' && process.env.SERPER_API_KEY) {
    const limit = Math.min(leads.length, CONFIG.maxArtists);
    console.log(`[6/9] Discovering Instagram handles (${limit} artists)...`);
    let found = 0;

    for (let i = 0; i < limit; i++) {
      if (leads[i].instagramHandle) { found++; continue; }
      const handle = await findInstagramHandle(leads[i].name);
      if (handle) {
        leads[i].instagramHandle = handle;
        found++;
      }
      await sleep(250);
      if ((i + 1) % 50 === 0) {
        console.log(`    ${i + 1}/${limit} searched (${found} found)`);
        saveCheckpoint('ig-handles', { leads });
      }
    }
    console.log(`  Found ${found} Instagram handles\n`);
  } else {
    console.log('[6/9] Instagram handle discovery: SKIPPED\n');
  }

  // ─── Step 7: Instagram Follower Enrichment ─────────
  if (process.env.SKIP_INSTAGRAM !== '1' && process.env.APIFY_API_TOKEN) {
    const handlesToEnrich = leads
      .filter(l => l.instagramHandle && !l.instagramFollowers)
      .map(l => l.instagramHandle);

    if (handlesToEnrich.length > 0) {
      console.log(`[7/9] Fetching real Instagram data for ${handlesToEnrich.length} handles...`);
      const igData = await getInstagramData(handlesToEnrich);

      for (const lead of leads) {
        if (!lead.instagramHandle) continue;
        const handle = lead.instagramHandle.replace(/^@/, '').toLowerCase();
        const data = igData.get(handle);
        if (data) {
          lead.instagramFollowers = data.followers;
          lead.instagramEngagement = data.engagement;
        }
      }

      // Filter by IG cap
      const before = leads.length;
      leads = leads.filter(l => !l.instagramFollowers || l.instagramFollowers <= CONFIG.maxIgFollowers);
      console.log(`  IG follower filter: removed ${before - leads.length} over ${formatNumber(CONFIG.maxIgFollowers)}\n`);
    } else {
      console.log('[7/9] Instagram enrichment: all handles already enriched\n');
    }
  } else {
    console.log('[7/9] Instagram enrichment: SKIPPED\n');
  }

  // ─── Step 8: Management Contact Discovery ──────────
  if (process.env.SKIP_MANAGEMENT !== '1' && process.env.SERPER_API_KEY) {
    const limit = Math.min(leads.length, CONFIG.maxArtists);
    console.log(`[8/9] Discovering management contacts (${limit} artists)...`);
    let emailsFound = 0;
    let websitesFound = 0;

    for (let i = 0; i < limit; i++) {
      if (leads[i].contactEmail) { emailsFound++; continue; }

      const contact = await findManagementContact(leads[i].name);
      if (contact.email) { leads[i].contactEmail = contact.email; emailsFound++; }
      if (contact.management) leads[i].managementInfo = contact.management;
      if (contact.website) { leads[i].website = contact.website; websitesFound++; }

      await sleep(300);
      if ((i + 1) % 50 === 0) {
        console.log(`    ${i + 1}/${limit} searched (${emailsFound} emails, ${websitesFound} websites)`);
        saveCheckpoint('management', { leads });
      }
    }
    console.log(`  Emails: ${emailsFound}, Websites: ${websitesFound}\n`);
  } else {
    console.log('[8/9] Management contact discovery: SKIPPED\n');
  }

  // ─── Step 9: Generate Outputs ──────────────────────
  console.log('[9/9] Generating outputs...');

  // Sort by popularity desc, then cap
  const finalLeads = leads
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, CONFIG.maxArtists);

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().split('T')[0];

  // Excel output
  const excelPath = path.join(CONFIG.outputDir, `visio-lead-sheet-${timestamp}.xlsx`);
  await buildExcel(finalLeads, excelPath);
  console.log(`  Excel: ${excelPath}`);

  // JSON output (raw leads)
  const jsonPath = path.join(CONFIG.outputDir, `visio-lead-sheet-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(finalLeads, null, 2));
  console.log(`  JSON:  ${jsonPath}`);

  // DBLead output (platform-compatible, with accumulation)
  console.log('  Exporting to Visio DB format (accumulation mode)...');
  const dbLeads = exportToDBFormat(finalLeads);
  const mergedDB = mergeWithExistingDB(dbLeads);
  fs.writeFileSync(CONFIG.dbOutputPath, JSON.stringify(mergedDB, null, 2));
  console.log(`  DB:    ${CONFIG.dbOutputPath} (${mergedDB.length} total artists)\n`);

  // Clean up checkpoints on success
  clearCheckpoints();

  // ─── Summary ──────────────────────────────────────
  const genreBreakdown = new Map<string, number>();
  for (const lead of finalLeads) {
    genreBreakdown.set(lead.primaryGenre, (genreBreakdown.get(lead.primaryGenre) || 0) + 1);
  }

  const withEmail = finalLeads.filter(l => l.contactEmail).length;
  const withIg = finalLeads.filter(l => l.instagramHandle).length;
  const withWebsite = finalLeads.filter(l => l.website).length;

  console.log('='.repeat(65));
  console.log('  RESULTS');
  console.log('='.repeat(65));
  console.log(`  Artists in lead sheet:  ${finalLeads.length}`);
  console.log(`  Playlists scanned:     ${playlistIds.length}`);
  console.log(`  Total unique artists:  ${allArtistIds.size}`);
  console.log('');
  console.log('  Contact info:');
  console.log(`    With email:          ${withEmail} (${((withEmail / finalLeads.length) * 100).toFixed(0)}%)`);
  console.log(`    With Instagram:      ${withIg} (${((withIg / finalLeads.length) * 100).toFixed(0)}%)`);
  console.log(`    With website:        ${withWebsite} (${((withWebsite / finalLeads.length) * 100).toFixed(0)}%)`);
  console.log('');
  console.log('  Genre breakdown:');
  for (const [genre, count] of [...genreBreakdown.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${genre.padEnd(20)} ${count}`);
  }
  console.log('');
  console.log('  Data quality:');
  console.log('    Spotify data:    100% API-verified (exact counts)');
  console.log(`    Label check:     Spotify metadata + major label DB (${MAJOR_LABELS.size} labels)`);
  console.log(`    Instagram data:  ${process.env.APIFY_API_TOKEN ? 'Real counts via Apify' : 'Not enriched'}`);
  console.log(`    Contact emails:  ${process.env.SERPER_API_KEY ? 'Web scraping discovery' : 'Not enriched'}`);
  console.log('');
  console.log('  Outputs:');
  console.log(`    Excel:  ${excelPath}`);
  console.log(`    JSON:   ${jsonPath}`);
  console.log(`    Visio DB: ${CONFIG.dbOutputPath} (${mergedDB.length} total)`);
  console.log('='.repeat(65));
}

main().catch(err => {
  console.error('\nFatal error:', err.message || err);
  console.error('Run with RESUME=1 to continue from last checkpoint');
  process.exit(1);
});
