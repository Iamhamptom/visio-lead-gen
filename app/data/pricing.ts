import { Music, Briefcase, Zap, Rocket } from 'lucide-react';
import { SubscriptionTier } from '../types';

export const TIER_DETAILS: Record<SubscriptionTier, {
    name: string;
    price: string;
    priceValue: number;
    color: string;
    borderColor?: string;
    icon: any;
    features: string[];
    credits: number | 'unlimited';
    maxProfiles: number | 'unlimited';
    maxSearches: number | 'unlimited';
    aiTiers: string[];
    extras: string[];
    recommended?: boolean;
}> = {
    artist: {
        name: 'Artist Base',
        price: 'Free',
        priceValue: 0,
        color: 'bg-white/5',
        icon: Music,
        features: ['1 Artist Profile', '20 Credits/mo', 'Instant AI', '10 Searches/day'],
        credits: 20,
        maxProfiles: 1,
        maxSearches: 10,
        aiTiers: ['Instant'],
        extras: ['Basic Search']
    },
    starter: {
        name: 'Starter',
        price: 'R199',
        priceValue: 199,
        color: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        icon: Music,
        features: ['1 Artist Profile', '50 Credits/mo', 'Instant + Standard AI', '20 Searches/day', 'Smart Scrape'],
        credits: 50,
        maxProfiles: 1,
        maxSearches: 20,
        aiTiers: ['Instant', 'Standard'],
        extras: ['Smart Scrape', 'Basic Support']
    },
    artiste: {
        name: 'Artiste',
        price: 'R570',
        priceValue: 570,
        color: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20',
        icon: Music,
        features: ['2 Artist Profiles', '100 Credits/mo', 'Instant + Standard AI', '25 Searches/day', 'Smart Scrape'],
        credits: 100,
        maxProfiles: 2,
        maxSearches: 25,
        aiTiers: ['Instant', 'Standard'],
        extras: ['Smart Scrape', 'Email Support']
    },
    starter_label: {
        name: 'Starter Label',
        price: 'R950',
        priceValue: 950,
        color: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
        icon: Briefcase,
        features: ['3 Artist Profiles', '250 Credits/mo', 'Business AI', '50 Searches/day', 'CSV Export', 'Smart Scrape'],
        credits: 250,
        maxProfiles: 3,
        maxSearches: 50,
        aiTiers: ['Instant', 'Standard', 'Business'],
        extras: ['CSV Export', 'Smart Scrape', 'Priority Support', '2 Team Members'],
        recommended: true
    },
    label: {
        name: 'Label Pro',
        price: 'R1,799',
        priceValue: 1799,
        color: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        icon: Briefcase,
        features: ['5 Artist Profiles', '500 Credits/mo', 'Business AI', '100 Searches/day', 'CSV Export', 'Smart Scrape'],
        credits: 500,
        maxProfiles: 5,
        maxSearches: 100,
        aiTiers: ['Instant', 'Standard', 'Business', 'Enterprise'],
        extras: ['CSV Export', 'Smart Scrape', 'Dedicated Support', '3 Team Members']
    },
    agency: {
        name: 'Agency Elite',
        price: 'R4,499',
        priceValue: 4499,
        color: 'bg-visio-accent/10',
        borderColor: 'border-visio-accent/30',
        icon: Zap,
        features: ['Unlimited Artists', '2,000 Credits/mo', 'Enterprise AI', 'Unlimited Searches', 'Deep Thinking', 'White-label'],
        credits: 2000,
        maxProfiles: 'unlimited',
        maxSearches: 'unlimited',
        aiTiers: ['Instant', 'Standard', 'Business', 'Enterprise'],
        extras: ['Deep Thinking', 'CSV Export', 'Smart Scrape', 'White-label', '10 Team Members']
    },
    enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        priceValue: 0,
        color: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        icon: Rocket,
        features: ['Unlimited Artists', 'Unlimited Credits', 'Enterprise AI', 'Unlimited Searches', 'API Access', 'SLA Guarantee'],
        credits: 'unlimited',
        maxProfiles: 'unlimited',
        maxSearches: 'unlimited',
        aiTiers: ['Instant', 'Standard', 'Business', 'Enterprise'],
        extras: ['API Access', 'Custom Integrations', 'SLA Guarantee', 'Deep Thinking', 'Unlimited Team']
    }
};
