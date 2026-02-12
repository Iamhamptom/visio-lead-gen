export enum Role {
    USER = 'user',
    AGENT = 'model'
}

export type ViewMode =
    | 'landing'
    | 'auth'
    | 'onboarding'
    | 'overview' // New Dashboard Overview
    | 'dashboard' // Chat Interface
    | 'leads'
    | 'billing'
    | 'reason'
    | 'reach'
    | 'settings'
    | 'help'
    | 'pending';

export type SubscriptionTier = 'artist' | 'starter' | 'artiste' | 'starter_label' | 'label' | 'agency' | 'enterprise';

export interface Subscription {
    tier: SubscriptionTier;
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    currentPeriodEnd: number;
    interval: 'month' | 'year';
    paymentMethod?: {
        token: string;
        brand: string;
        last4: string;
        expiry: string;
    };
}


export interface SocialLinks {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    tiktok?: string;
    youtube?: string;
    website?: string;
    email?: string;
}

export interface IdentityCheckResult {
    title: string;
    link: string;
    snippet?: string;
    source?: string;
}

export interface IdentityCheck {
    confirmed?: boolean;
    lastQueriedName?: string;
    confirmedAt?: number;
    dismissedAt?: number;
    results?: IdentityCheckResult[];
}

export interface Lead {
    id: string; // Changed from number to string to match skin, will adapt parsing
    name: string;
    title: string;
    company?: string;
    email?: string;
    phone?: string;
    matchScore: number;
    socials: SocialLinks;
    imageUrl?: string;
    // Legacy fields from DB might need mapping
    url?: string;
    snippet?: string;
    source?: string;
    followers?: string;
}

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    leads?: Lead[];
    webResults?: WebResult[];
    toolUsed?: ToolId;
    isThinking?: boolean;
    mode?: AgentMode;
}

export interface WebResult {
    title: string;
    url: string;
    snippet?: string;
    source?: string;
    date?: string;
}

export type ToolId =
    | 'none'
    | 'web_search'
    | 'summarize_chat'
    | 'draft_pitch'
    | 'press_release'
    | 'social_pack'
    | 'market_research';

export type AgentMode = 'chat' | 'research';

export interface Campaign {
    id: string;
    name: string;
    client: string;
    status: 'active' | 'draft' | 'completed';
}

export interface Session {
    id: string;
    title: string;
    folderId: string | null; // null = Unfiled/Inbox, string = Campaign ID
    messages: Message[];
    lastUpdated: number;
}

export interface ArtistProfile {
    name: string;
    genre: string;
    description: string;
    socials: SocialLinks;
    identityCheck?: IdentityCheck;
    connectedAccounts: {
        instagram?: boolean;
        twitter?: boolean;
        tiktok?: boolean;
        youtube?: boolean;
        spotify?: boolean;
        appleMusic?: boolean;
    };
    similarArtists: string[];
    milestones: {
        instagramFollowers?: number;
        monthlyListeners?: number;
    };
    location: {
        city: string;
        country: string;
    };
    promotionalFocus: 'Streaming' | 'Live Events' | 'Brand Deals' | 'Press';
    website?: string;
    goals?: ArtistGoals;
    // New fields
    careerHighlights?: string[];
    lifeHighlights?: string[];
    desiredCommunities?: string[];
    referralSource?: string;
}

export interface ArtistGoals {
    primaryGoal: 'grow_streams' | 'get_signed' | 'book_shows' | 'brand_deals' | 'press_coverage';
    keyObjectives: string[]; // Ordered list of specific targets
    targetAudiences: string[]; // Tag-based niches
    targetRegions: string[];
    upcomingRelease?: {
        title: string;
        releaseDate: string;
        type: 'single' | 'ep' | 'album';
    };
    budgetRange: 'low' | 'medium' | 'high';
    timeline: '3_months' | '6_months' | '1_year';
}

export interface MetricPoint {

    date: string;
    value: number;
}

export interface ArtistAnalytics {
    // Aggregated
    totalFollowers: number;
    totalReach: number;
    totalStreams: number;

    // Platform Specific
    instagram: {
        followers: number;
        reach: MetricPoint[];
        posts: { id: string; image: string; likes: number; comments: number }[];
    };
    spotify: {
        monthlyListeners: number;
        streams: MetricPoint[];
        topRegions: { region: string; listeners: number }[];
        playlists: { name: string; followers: number }[];
    };
};


// --- Reason Module Types ---

export interface Target {
    id: string;
    name: string;
    platform: 'instagram' | 'tiktok' | 'youtube' | 'spotify' | 'blog' | 'playlist';
    handle: string;
    avatarUrl: string;
    followers: number;
    engagementRate: number;
    tags: string[];
    matchScore: number; // 0-100
    location?: string;
    email?: string;
}

export interface PitchBrief {
    id: string;
    targetId: string;
    campaignId: string;
    score: number;
    scoreBreakdown: {
        relevance: number;
        reach: number;
        resonance: number;
    };
    reasons: {
        title: string;
        description: string;
        type: 'pro' | 'con' | 'insight';
    }[];
    valueProps: {
        forThem: string[];
        forUs: string[];
        angles: string[];
    };
    copy: {
        emailSubject: string;
        emailBody: string;
        dmShort: string;
    };
    generatedAt: number;
}


// --- Reach Calculator Types ---

export type PlacementType = 'story' | 'feed_post' | 'reel' | 'video' | 'shoutout';

export interface Placement {
    type: PlacementType;
    count: number;
    durationDays?: number; // e.g., for story highlights or pinned posts
}

export interface ReachScenario {
    reach: number;
    impressions: number;
    engagement: number;
    clicks: number;
    cpm: number;
    cpc: number;
    cpe: number;
}

export interface ReachResult {
    id: string;
    targetId: string; // If 'custom', no ID
    inputStats: {
        followers: number;
        avgViews: number;
        engagementRate: number;
    };
    placement: Placement;
    cost: number;
    scenarios: {
        low: ReachScenario;
        base: ReachScenario;
        high: ReachScenario;
    };
    timestamp: number;
}

export interface BatchReachResult {
    id: string;
    totalFollowers: number;
    avgEngagementRate: number;
    pageCount: number;
    placement: Placement;
    totalCost: number;
    scenarios: {
        low: ReachScenario;
        base: ReachScenario;
        high: ReachScenario;
    };
    timestamp: number;
}
