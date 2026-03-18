import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Pre-built campaign templates for common booking scenarios
const BOOKING_TEMPLATES = [
    {
        id: 'uk-tour',
        title: 'UK Tour — Full Venue & Promoter Sweep',
        description: 'Find every dancehall/afrobeats venue, promoter, and events company across the UK. Covers London, Manchester, Birmingham, Bristol, Leeds, and more.',
        targetRegions: ['UK', 'London', 'Manchester', 'Birmingham', 'Bristol', 'Leeds', 'Nottingham', 'Liverpool'],
        targetTypes: ['venue', 'promoter', 'agency', 'club', 'events_company'],
        icon: '🇬🇧',
        estimatedContacts: '80-150',
        category: 'International Tour'
    },
    {
        id: 'sa-circuit',
        title: 'South Africa Club Circuit',
        description: 'Every club, venue, and promoter across SA\'s major cities. Johannesburg, Cape Town, Durban, Pretoria, and emerging scenes.',
        targetRegions: ['South Africa', 'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Soweto', 'Port Elizabeth'],
        targetTypes: ['venue', 'promoter', 'club', 'events_company', 'festival'],
        icon: '🇿🇦',
        estimatedContacts: '60-120',
        category: 'Regional Tour'
    },
    {
        id: 'west-africa',
        title: 'West Africa — Lagos, Accra & Abuja',
        description: 'Tap into West Africa\'s booming nightlife. Premium venues, festival promoters, and booking agencies across Nigeria and Ghana.',
        targetRegions: ['Nigeria', 'Lagos', 'Abuja', 'Ghana', 'Accra'],
        targetTypes: ['venue', 'promoter', 'agency', 'club', 'festival', 'events_company'],
        icon: '🌍',
        estimatedContacts: '50-100',
        category: 'International Tour'
    },
    {
        id: 'east-africa',
        title: 'East Africa — Nairobi, Dar es Salaam & Kampala',
        description: 'Kenya, Tanzania, and Uganda\'s fastest-growing music scenes. Clubs, festivals, and promoters hungry for international acts.',
        targetRegions: ['Kenya', 'Nairobi', 'Tanzania', 'Dar es Salaam', 'Uganda', 'Kampala'],
        targetTypes: ['venue', 'promoter', 'club', 'festival', 'events_company'],
        icon: '🌍',
        estimatedContacts: '40-80',
        category: 'International Tour'
    },
    {
        id: 'us-east-coast',
        title: 'US East Coast — NYC, DC, Atlanta, Miami',
        description: 'America\'s biggest Caribbean and Afrobeats markets. Venues and promoters who book dancehall, soca, and afrobeats acts.',
        targetRegions: ['USA', 'New York', 'Washington DC', 'Atlanta', 'Miami', 'Philadelphia', 'Boston'],
        targetTypes: ['venue', 'promoter', 'agency', 'club', 'events_company'],
        icon: '🇺🇸',
        estimatedContacts: '100-200',
        category: 'International Tour'
    },
    {
        id: 'caribbean',
        title: 'Caribbean — Jamaica, Trinidad, Barbados',
        description: 'The spiritual home of dancehall and soca. Clubs, festival stages, and promoters across the Caribbean islands.',
        targetRegions: ['Jamaica', 'Kingston', 'Trinidad and Tobago', 'Port of Spain', 'Barbados', 'Bahamas'],
        targetTypes: ['venue', 'promoter', 'festival', 'club', 'events_company'],
        icon: '🏝️',
        estimatedContacts: '40-70',
        category: 'International Tour'
    },
    {
        id: 'europe-afrobeats',
        title: 'Europe Afrobeats Circuit',
        description: 'Amsterdam, Paris, Berlin, and London\'s Afrobeats and dancehall underground. The EU\'s fastest-growing African music market.',
        targetRegions: ['Netherlands', 'Amsterdam', 'France', 'Paris', 'Germany', 'Berlin', 'Belgium', 'Brussels'],
        targetTypes: ['venue', 'promoter', 'agency', 'club', 'festival'],
        icon: '🇪🇺',
        estimatedContacts: '70-130',
        category: 'International Tour'
    },
    {
        id: 'festival-circuit',
        title: 'Global Festival Applications',
        description: 'Apply to the world\'s biggest festivals that book dancehall, afrobeats, and world music. Submission deadlines and booking contacts.',
        targetRegions: ['Global', 'UK', 'Europe', 'Africa', 'Caribbean', 'USA'],
        targetTypes: ['festival'],
        icon: '🎪',
        estimatedContacts: '30-60',
        category: 'Festival'
    },
    {
        id: 'brand-events',
        title: 'Brand & Corporate Events',
        description: 'Red Bull, Bacardi, Spotify, Heineken — brands that sponsor music events and book DJs. Corporate events companies looking for entertainment.',
        targetRegions: ['South Africa', 'UK', 'Global'],
        targetTypes: ['events_company', 'agency'],
        icon: '💼',
        estimatedContacts: '25-50',
        category: 'Brand Partnerships'
    },
    {
        id: 'custom',
        title: 'Custom Campaign',
        description: 'Build your own campaign from scratch. Choose your regions, genres, and target types.',
        targetRegions: [],
        targetTypes: [],
        icon: '✨',
        estimatedContacts: 'You decide',
        category: 'Custom'
    }
];

export async function GET() {
    return NextResponse.json({ templates: BOOKING_TEMPLATES });
}
