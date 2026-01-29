import { NextRequest, NextResponse } from 'next/server';
import Exa from 'exa-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const exa = new Exa(process.env.EXA_API_KEY || '');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
    try {
        const { artistName, genre } = await request.json();

        if (!artistName) {
            return NextResponse.json({ error: 'Artist name is required' }, { status: 400 });
        }

        // Search for artist mentions using Exa
        const searchQuery = `"${artistName}" ${genre || ''} artist musician music`;

        const searchResults = await exa.searchAndContents(searchQuery, {
            type: 'neural',
            numResults: 10,
            text: { maxCharacters: 500 },
            useAutoprompt: true,
        });

        if (!searchResults.results || searchResults.results.length === 0) {
            return NextResponse.json({
                summary: `No significant online presence found for "${artistName}". This could be an opportunity to build your brand from scratch with a strong, consistent identity.`,
                sources: [],
            });
        }

        // Prepare context for AI analysis
        const sourcesContext = searchResults.results.map((r, i) =>
            `Source ${i + 1}: ${r.title}\nURL: ${r.url}\nContent: ${r.text || 'N/A'}`
        ).join('\n\n');

        // Use Gemini to analyze and summarize
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = `You are a music industry brand analyst. Analyze the following search results about the artist "${artistName}" (${genre || 'unknown genre'}).

Provide a concise brand analysis covering:
1. **Online Presence**: Where are they being mentioned? (blogs, playlists, social media, press)
2. **Brand Perception**: What's the general sentiment? How are they being described?
3. **Opportunities**: What gaps or opportunities exist for brand growth?
4. **Threats**: Any negative coverage or competition to be aware of?

Keep your response under 300 words. Be direct and actionable.

Search Results:
${sourcesContext}`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text();

        return NextResponse.json({
            summary,
            sources: searchResults.results.map(r => ({ title: r.title, url: r.url })),
        });

    } catch (error) {
        console.error('Artist research error:', error);
        return NextResponse.json({
            summary: 'Research encountered an error. Please check your API keys and try again.',
            error: String(error),
        }, { status: 500 });
    }
}
