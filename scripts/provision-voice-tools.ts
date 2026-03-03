/**
 * Provision Voice Tools — One-time Setup Script
 *
 * Creates 5 webhook tools in the ElevenLabs workspace and attaches them
 * to the V-Prai agent. Run once after deploying the webhook routes.
 *
 * Usage:
 *   npx tsx scripts/provision-voice-tools.ts
 *
 * Required env vars:
 *   ELEVENLABS_API_KEY — ElevenLabs API key
 *   ELEVENLABS_WEBHOOK_SECRET — Shared secret for webhook auth (will be set as header)
 *   ELEVENLABS_AGENT_ID — (optional) V-Prai agent ID to update; if not set, searches for "V-Prai"
 *
 * Optional env var:
 *   VERCEL_PROJECT_URL — Base URL for webhooks (default: https://prai.visioai.co)
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import 'dotenv/config';

const BASE_URL = process.env.VERCEL_PROJECT_URL || 'https://prai.visioai.co';

function getClient(): ElevenLabsClient {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        console.error('ELEVENLABS_API_KEY is required');
        process.exit(1);
    }
    return new ElevenLabsClient({ apiKey });
}

// Tool definitions — each maps to an API route under /api/voice-tools/
type ParamDef = { description: string } | { dynamicVariable: string };

interface ToolDef {
    name: string;
    description: string;
    url: string;
    responseTimeoutSecs: number;
    params: Record<string, ParamDef>;
    required: string[];
}

const TOOL_DEFINITIONS: ToolDef[] = [
    {
        name: 'think_deeply',
        description: 'Use this tool when the user asks a complex question that requires deep reasoning, strategy, campaign planning, or expert analysis. Say "Let me think about that" before calling this tool.',
        url: `${BASE_URL}/api/voice-tools/think`,
        responseTimeoutSecs: 30,
        params: {
            question: { description: 'The complex question or topic to reason about deeply' },
            artist_name: { dynamicVariable: 'artist_name' },
            artist_genre: { dynamicVariable: 'artist_genre' },
            artist_location: { dynamicVariable: 'artist_location' },
        },
        required: ['question'],
    },
    {
        name: 'search_web',
        description: 'Use this tool when the user asks about current events, news, trends, live data, or anything that requires up-to-date information. Say "Let me look that up" before calling.',
        url: `${BASE_URL}/api/voice-tools/search`,
        responseTimeoutSecs: 15,
        params: {
            query: { description: 'The search query — what to look up on the web' },
            artist_location: { dynamicVariable: 'artist_location' },
        },
        required: ['query'],
    },
    {
        name: 'find_contacts',
        description: 'Use this tool when the user asks to find curators, journalists, bloggers, DJs, influencers, or any type of music industry contact. Say "Let me search for those" before calling.',
        url: `${BASE_URL}/api/voice-tools/find-contacts`,
        responseTimeoutSecs: 15,
        params: {
            query: { description: 'Description of contacts to find, e.g. "afrobeats playlist curators" or "music journalists in UK"' },
            artist_location: { dynamicVariable: 'artist_location' },
        },
        required: ['query'],
    },
    {
        name: 'recall_knowledge',
        description: 'Use this tool to pull proven strategies, past learnings, and domain expertise from the knowledge base. Use silently to inform your responses — no need to announce it.',
        url: `${BASE_URL}/api/voice-tools/knowledge`,
        responseTimeoutSecs: 15,
        params: {
            topic: { description: 'The topic or question to look up in the knowledge base' },
            artist_genre: { dynamicVariable: 'artist_genre' },
            artist_location: { dynamicVariable: 'artist_location' },
        },
        required: ['topic'],
    },
    {
        name: 'save_insight',
        description: 'Use this tool when the user shares important information, preferences, or insights worth remembering for future conversations. Confirm with "Got it, I\'ll remember that."',
        url: `${BASE_URL}/api/voice-tools/learn`,
        responseTimeoutSecs: 10,
        params: {
            insight: { description: 'The information or insight to remember' },
            category: { description: 'Category: general, genre_specific, platform, outreach, campaign, or market' },
        },
        required: ['insight'],
    },
];

/**
 * Build the requestBodySchema for a tool from its param definitions.
 */
function buildRequestBodySchema(params: Record<string, ParamDef>, required: string[]) {
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
        if ('description' in value) {
            // LLM-provided parameter
            properties[key] = { type: 'string' as const, description: value.description };
        } else {
            // Dynamic variable (injected from session context)
            properties[key] = { type: 'string' as const, dynamicVariable: value.dynamicVariable };
        }
    }
    return {
        type: 'object' as const,
        properties,
        required,
    };
}

async function main() {
    const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('ELEVENLABS_WEBHOOK_SECRET is required. Generate one:');
        console.error('  openssl rand -hex 32');
        process.exit(1);
    }

    const client = getClient();
    const createdToolIds: string[] = [];

    console.log(`\nProvisioning ${TOOL_DEFINITIONS.length} voice tools...`);
    console.log(`Webhook base URL: ${BASE_URL}\n`);

    // Check for existing tools to avoid duplicates
    let existingTools: Record<string, string> = {};
    try {
        const listResponse = await client.conversationalAi.tools.list({ pageSize: 50 });
        for (const tool of (listResponse as any).tools || []) {
            existingTools[tool.name] = tool.tool_id || tool.toolId;
        }
    } catch (err) {
        console.warn('Could not list existing tools, will create all fresh:', err);
    }

    for (const def of TOOL_DEFINITIONS) {
        // Skip if already exists
        if (existingTools[def.name]) {
            console.log(`  [skip] ${def.name} — already exists (${existingTools[def.name]})`);
            createdToolIds.push(existingTools[def.name]);
            continue;
        }

        try {
            const response = await client.conversationalAi.tools.create({
                toolConfig: {
                    type: 'webhook',
                    name: def.name,
                    description: def.description,
                    responseTimeoutSecs: def.responseTimeoutSecs,
                    forcePreToolSpeech: true,
                    apiSchema: {
                        url: def.url,
                        method: 'POST',
                        requestHeaders: {
                            'x-elevenlabs-secret': webhookSecret,
                        },
                        requestBodySchema: buildRequestBodySchema(def.params, def.required),
                    },
                },
            });

            const toolId = (response as any).tool_id || (response as any).toolId;
            console.log(`  [created] ${def.name} → ${toolId}`);
            createdToolIds.push(toolId);
        } catch (err) {
            console.error(`  [error] Failed to create ${def.name}:`, err);
        }
    }

    console.log(`\n--- Results ---`);
    console.log(`Created/found ${createdToolIds.length} tools.`);

    if (createdToolIds.length > 0) {
        const toolIdsStr = createdToolIds.join(',');
        console.log(`\nSet this env var on Vercel:`);
        console.log(`  ELEVENLABS_VOICE_TOOL_IDS=${toolIdsStr}\n`);

        // Try to update the agent with the tool IDs
        const agentId = process.env.ELEVENLABS_AGENT_ID;
        if (agentId) {
            console.log(`Updating agent ${agentId} with tool IDs...`);
            try {
                await client.conversationalAi.agents.update(agentId, {
                    conversationConfig: {
                        agent: {
                            prompt: {
                                toolIds: createdToolIds,
                            },
                        },
                    },
                });
                console.log('Agent updated successfully with voice tools.');
            } catch (err) {
                console.error('Failed to update agent:', err);
                console.log('You can manually add the tool IDs in the ElevenLabs dashboard.');
            }
        } else {
            console.log('No ELEVENLABS_AGENT_ID set — set the env var and re-run, or add tools manually in the ElevenLabs dashboard.');
        }
    }

    console.log('\nDone.');
}

main().catch((err) => {
    console.error('Provisioning failed:', err);
    process.exit(1);
});
