import { SubscriptionTier } from '../types';

export interface PlanLimits {
    maxProfiles: number;
    canExport: boolean;
    aiTier: 'instant' | 'business' | 'enterprise';
    maxTeamMembers: number;
    maxSearchesPerDay: number;
}

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
    artist: {
        maxProfiles: 1,
        canExport: false,
        aiTier: 'instant',
        maxTeamMembers: 1,
        maxSearchesPerDay: 10
    },
    starter: {
        maxProfiles: 1,
        canExport: false,
        aiTier: 'instant',
        maxTeamMembers: 1,
        maxSearchesPerDay: 20
    },
    artiste: {
        maxProfiles: 2,
        canExport: false,
        aiTier: 'instant',
        maxTeamMembers: 1,
        maxSearchesPerDay: 25
    },
    starter_label: {
        maxProfiles: 3,
        canExport: true,
        aiTier: 'business',
        maxTeamMembers: 2,
        maxSearchesPerDay: 50
    },
    label: {
        maxProfiles: 5,
        canExport: true,
        aiTier: 'business',
        maxTeamMembers: 3,
        maxSearchesPerDay: 100
    },
    agency: {
        maxProfiles: Infinity,
        canExport: true,
        aiTier: 'enterprise',
        maxTeamMembers: 10,
        maxSearchesPerDay: Infinity
    },
    enterprise: {
        maxProfiles: Infinity,
        canExport: true,
        aiTier: 'enterprise',
        maxTeamMembers: Infinity,
        maxSearchesPerDay: Infinity
    }
};
