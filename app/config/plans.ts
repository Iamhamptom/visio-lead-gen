import { SubscriptionTier } from '../types';

export interface PlanLimits {
    maxProfiles: number;
    canExport: boolean;
    aiTier: 'instant' | 'business' | 'enterprise';
    maxTeamMembers: number;
    maxSearchesPerDay: number;
    deepThinkingEnabled: boolean;
    smartScrapeEnabled: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
    artist: {
        maxProfiles: 1,
        canExport: false,
        aiTier: 'instant',
        maxTeamMembers: 1,
        maxSearchesPerDay: 10,
        deepThinkingEnabled: false,
        smartScrapeEnabled: false,
    },
    starter: {
        maxProfiles: 1,
        canExport: false,
        aiTier: 'instant',
        maxTeamMembers: 1,
        maxSearchesPerDay: 20,
        deepThinkingEnabled: false,
        smartScrapeEnabled: true,
    },
    artiste: {
        maxProfiles: 2,
        canExport: false,
        aiTier: 'instant',
        maxTeamMembers: 1,
        maxSearchesPerDay: 25,
        deepThinkingEnabled: false,
        smartScrapeEnabled: true,
    },
    starter_label: {
        maxProfiles: 3,
        canExport: true,
        aiTier: 'business',
        maxTeamMembers: 2,
        maxSearchesPerDay: 50,
        deepThinkingEnabled: false,
        smartScrapeEnabled: true,
    },
    label: {
        maxProfiles: 5,
        canExport: true,
        aiTier: 'business',
        maxTeamMembers: 3,
        maxSearchesPerDay: 100,
        deepThinkingEnabled: false,
        smartScrapeEnabled: true,
    },
    agency: {
        maxProfiles: Infinity,
        canExport: true,
        aiTier: 'enterprise',
        maxTeamMembers: 10,
        maxSearchesPerDay: Infinity,
        deepThinkingEnabled: true,
        smartScrapeEnabled: true,
    },
    enterprise: {
        maxProfiles: Infinity,
        canExport: true,
        aiTier: 'enterprise',
        maxTeamMembers: Infinity,
        maxSearchesPerDay: Infinity,
        deepThinkingEnabled: true,
        smartScrapeEnabled: true,
    }
};
