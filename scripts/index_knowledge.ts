import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Gemini Client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge');

async function embedText(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        return [];
    }
}

function chunkMarkdown(content: string): { category: string, content: string }[] {
    const chunks: { category: string, content: string }[] = [];
    const lines = content.split('\n');
    let currentCategory = 'General';
    let currentBuffer: string[] = [];

    for (const line of lines) {
        if (line.startsWith('## ')) {
            // Save previous chunk
            if (currentBuffer.length > 0) {
                chunks.push({
                    category: currentCategory,
                    content: currentBuffer.join('\n').trim()
                });
            }
            // Start new chunk
            currentCategory = line.replace('## ', '').trim();
            currentBuffer = [];
        } else {
            currentBuffer.push(line);
        }
    }

    // Save last chunk
    if (currentBuffer.length > 0) {
        chunks.push({
            category: currentCategory,
            content: currentBuffer.join('\n').trim()
        });
    }

    return chunks;
}

async function indexKnowledge() {
    console.log("🚀 Starting Knowledge Indexing...");

    const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md'));

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const content = readFileSync(join(KNOWLEDGE_DIR, file), 'utf-8');
        const chunks = chunkMarkdown(content);

        console.log(`- Found ${chunks.length} chunks.`);

        for (const chunk of chunks) {
            console.log(`  - Embedding chunk: "${chunk.category}"...`);
            const embedding = await embedText(chunk.content);

            if (embedding.length === 0) {
                console.warn(`  ! Failed to embed chunk: ${chunk.category}`);
                continue;
            }

            const { error } = await supabase
                .from('knowledge')
                .upsert({
                    category: chunk.category,
                    content: chunk.content,
                    source_title: file,
                    embedding: embedding
                });
            // For now, simpler to just insert. Wiping table first is safer for re-runs.

            if (error) {
                console.error(`  ! Supabase error:`, error);
            } else {
                console.log(`  - Indexed: ${chunk.category}`);
            }
        }
    }

    console.log("✅ Indexing Complete.");
}

// Helper to clear existing knowledge before re-indexing (Optional but recommended)
async function clearKnowledge() {
    console.log("🧹 Clearing existing knowledge...");
    const { error } = await supabase.from('knowledge').delete().neq('id', 0); // Delete all
    if (error) console.error("Error clearing knowledge:", error);
}

// Main execution
(async () => {
    await clearKnowledge(); // Uncomment to wipe clean before indexing
    await indexKnowledge();
})();
