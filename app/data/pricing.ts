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
    recommended?: boolean;
}> = {
    artist: {
        name: 'Artist Base',
        price: 'Free',
        priceValue: 0,
        color: 'bg-white/5',
        icon: Music,
        features: ['1 Artist Profile', 'Basic Search', 'Instant AI']
    },
    starter: {
        name: 'Starter',
        price: 'R199',
        priceValue: 199,
        color: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
        icon: Music,
        features: ['1 Artist Profile', 'Standard AI', 'Basic Support']
    },
    artiste: {
        name: 'Artiste',
        price: 'R570',
        priceValue: 570,
        color: 'bg-teal-500/10',
        borderColor: 'border-teal-500/20',
        icon: Music,
        features: ['2 Artist Profiles', 'Standard AI', 'Email Support']
    },
    starter_label: {
        name: 'Starter Label',
        price: 'R950',
        priceValue: 950,
        color: 'bg-cyan-500/10',
        borderColor: 'border-cyan-500/20',
        icon: Briefcase,
        features: ['3 Artist Profiles', 'Business AI', 'Priority Support'],
        recommended: true
    },
    label: {
        name: 'Label Pro',
        price: 'R1,799',
        priceValue: 1799,
        color: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        icon: Briefcase,
        features: ['5 Artist Profiles', 'Advanced AI', 'Dedicated Support']
    },
    agency: {
        name: 'Agency Elite',
        price: 'R4,499',
        priceValue: 4499,
        color: 'bg-visio-accent/10',
        borderColor: 'border-visio-accent/30',
        icon: Zap,
        features: ['Unlimited Artists', 'Enterprise AI', 'White-label']
    },
    enterprise: {
        name: 'Enterprise',
        price: 'Custom',
        priceValue: 0,
        color: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        icon: Rocket,
        features: ['API Access', 'Custom Integrations', 'SLA Guarantee']
    }
};
