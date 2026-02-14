import { LeadList } from '@/app/types';

function csvEscape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export function generateLeadListCSV(list: LeadList): string {
    const lines: string[] = [];

    // Metadata section (# comments — parseable by VisioOutreach/VisioPitch)
    lines.push('# VISIO LEAD EXPORT');
    lines.push(`# Generated: ${new Date().toISOString()}`);
    lines.push(`# Campaign: ${list.title}`);
    lines.push(`# Total Leads: ${list.leads.length}`);

    if (list.brief) {
        lines.push(`# Strategy: ${list.brief.summary}`);
        lines.push(`# Target Audience: ${list.brief.targetAudience}`);
        lines.push(`# Objective: ${list.brief.objective}`);
        lines.push(`# Pitch Angle: ${list.brief.pitchAngle}`);
        lines.push(`# Country: ${list.brief.country || 'N/A'}`);
    }

    lines.push('');

    // CSV header
    lines.push('Name,Title,Company,Email,Phone,Followers,Country,Match Score,Instagram,TikTok,Twitter,LinkedIn,Website,Source');

    // Data rows
    list.leads.forEach(lead => {
        const row = [
            csvEscape(lead.name || ''),
            csvEscape(lead.title || ''),
            csvEscape(lead.company || ''),
            csvEscape(lead.email || ''),
            csvEscape(lead.phone || ''),
            csvEscape(lead.followers || ''),
            csvEscape(lead.country || ''),
            (lead.matchScore || 0).toString(),
            csvEscape(lead.socials?.instagram || ''),
            csvEscape(lead.socials?.tiktok || ''),
            csvEscape(lead.socials?.twitter || ''),
            csvEscape(lead.socials?.linkedin || ''),
            csvEscape(lead.socials?.website || ''),
            csvEscape(lead.source || ''),
        ];
        lines.push(row.join(','));
    });

    return lines.join('\n');
}

export function downloadCSV(csv: string, filename: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
