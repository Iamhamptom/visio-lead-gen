import { Lead } from "@/app/types";

export async function enrichLead(lead: Lead): Promise<Lead> {
    const apiKey = process.env.APOLLO_API_KEY;
    if (!apiKey) {
        console.warn('APOLLO_API_KEY not configured, returning original lead');
        return lead;
    }

    // Don't enrich if we don't have minimal info
    if (!lead.email && !lead.company) {
        return lead;
    }

    try {
        const response = await fetch('https://api.apollo.io/v1/people/match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey
            },
            body: JSON.stringify({
                email: lead.email,
                organization_name: lead.company,
                first_name: lead.name.split(' ')[0],
                last_name: lead.name.split(' ').slice(1).join(' ')
            })
        });

        if (!response.ok) {
            // Silently fail for enrichment
            return lead;
        }

        const data = await response.json();
        const match = data.person;

        if (!match) return lead;

        // Merge new data
        return {
            ...lead,
            email: match.email || lead.email,
            title: match.title || lead.title,
            company: match.organization?.name || lead.company,
            phone: match.phone_numbers?.[0]?.raw_number || lead.phone,
            socials: {
                ...lead.socials,
                linkedin: match.linkedin_url || lead.socials?.linkedin,
                twitter: match.twitter_url || lead.socials?.twitter,
            },
            imageUrl: match.photo_url || lead.imageUrl
        };

    } catch (error) {
        console.error('Apollo enrichment failed:', error);
        return lead;
    }
}
