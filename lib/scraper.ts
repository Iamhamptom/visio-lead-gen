// Real web scraper that extracts actual contact data from websites

import * as cheerio from 'cheerio';

interface ExtractedData {
    emails: string[];
    phones: string[];
    socialLinks: {
        linkedin?: string;
        twitter?: string;
        facebook?: string;
    };
    companyInfo: {
        name?: string;
        description?: string;
        address?: string;
    };
    people: Array<{
        name: string;
        title?: string;
        email?: string;
        linkedin?: string;
    }>;
}

// Extract emails from text
function extractEmails(text: string): string[] {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex) || [];
    // Filter out common false positives
    return [...new Set(matches)].filter(email =>
        !email.includes('example.com') &&
        !email.includes('domain.com') &&
        !email.includes('@2x') &&
        !email.includes('.png') &&
        !email.includes('.jpg')
    );
}

// Extract phone numbers
function extractPhones(text: string): string[] {
    const phoneRegex = /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
    const matches = text.match(phoneRegex) || [];
    return [...new Set(matches)].filter(p => p.replace(/\D/g, '').length >= 10);
}

// Extract social media links
function extractSocialLinks(html: string): { linkedin?: string; twitter?: string; facebook?: string } {
    const $ = cheerio.load(html);
    const links: { linkedin?: string; twitter?: string; facebook?: string } = {};

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.includes('linkedin.com')) links.linkedin = href;
        if (href.includes('twitter.com') || href.includes('x.com')) links.twitter = href;
        if (href.includes('facebook.com')) links.facebook = href;
    });

    return links;
}

// Extract people from team/about pages
function extractPeople(html: string): Array<{ name: string; title?: string; email?: string; linkedin?: string }> {
    const $ = cheerio.load(html);
    const people: Array<{ name: string; title?: string; email?: string; linkedin?: string }> = [];

    // Common patterns for team sections
    const teamSelectors = [
        '.team-member', '.team-card', '.member', '.person',
        '[class*="team"]', '[class*="member"]', '[class*="staff"]',
        '.about-team div', '.leadership div'
    ];

    for (const selector of teamSelectors) {
        $(selector).each((_, el) => {
            const $el = $(el);
            const text = $el.text();

            // Look for name patterns (usually larger/bolder text)
            const name = $el.find('h3, h4, h5, .name, [class*="name"]').first().text().trim();
            const title = $el.find('.title, .position, .role, [class*="title"], [class*="position"]').first().text().trim();
            const linkedin = $el.find('a[href*="linkedin"]').attr('href');
            const emails = extractEmails(text);

            if (name && name.length > 2 && name.length < 50) {
                people.push({
                    name,
                    title: title || undefined,
                    email: emails[0],
                    linkedin
                });
            }
        });

        if (people.length > 0) break;
    }

    // Fallback: look for patterns in text
    if (people.length === 0) {
        const text = $('body').text();
        const personPattern = /([A-Z][a-z]+ [A-Z][a-z]+)(?:,?\s*|\s+[-–]\s+)(CEO|Founder|CTO|COO|President|Director|VP|Head|Manager|Partner|Owner)/gi;
        let match;
        while ((match = personPattern.exec(text)) !== null && people.length < 10) {
            people.push({
                name: match[1],
                title: match[2]
            });
        }
    }

    return people.slice(0, 10);
}

// Extract company information
function extractCompanyInfo(html: string, url: string): { name?: string; description?: string; address?: string } {
    const $ = cheerio.load(html);

    // Get company name from various sources
    const name = $('meta[property="og:site_name"]').attr('content') ||
        $('meta[name="application-name"]').attr('content') ||
        $('title').text().split('|')[0].split('-')[0].trim();

    // Get description
    const description = $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content');

    // Try to find address
    const addressPatterns = [
        /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way)[,.\s]+[A-Za-z\s]+,?\s*[A-Z]{2}\s*\d{5}/gi
    ];

    let address: string | undefined;
    const bodyText = $('body').text();
    for (const pattern of addressPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
            address = match[0];
            break;
        }
    }

    return { name, description, address };
}

// Main scrape function
export async function scrapeWebsite(url: string): Promise<ExtractedData> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status}`);
        }

        const html = await response.text();
        const text = cheerio.load(html)('body').text();

        return {
            emails: extractEmails(text + html),
            phones: extractPhones(text),
            socialLinks: extractSocialLinks(html),
            companyInfo: extractCompanyInfo(html, url),
            people: extractPeople(html)
        };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return {
            emails: [],
            phones: [],
            socialLinks: {},
            companyInfo: {},
            people: []
        };
    }
}

// Scrape multiple URLs in parallel
export async function scrapeMultipleUrls(urls: string[]): Promise<Map<string, ExtractedData>> {
    const results = new Map<string, ExtractedData>();

    const promises = urls.slice(0, 10).map(async (url) => {
        const data = await scrapeWebsite(url);
        results.set(url, data);
    });

    await Promise.all(promises);
    return results;
}
