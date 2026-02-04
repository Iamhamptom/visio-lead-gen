import { GoogleGenerativeAI } from '@google/generative-ai';
import { createSupabaseAdminClient } from './supabase/server';

// Initialize Gemini for Embeddings
// We use a separate client instantiation to ensure we use the correct model for embeddings
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface KnowledgeChunk {
    id: number;
    content: string;
    category: string;
    source: string;
    similarity: number;
}

/**
 * Generate embeddings for a given text using Gemini Text Embedding 004
 */
export async function embedText(text: string): Promise<number[]> {
    try {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        return embedding.values;
    } catch (error) {
        console.error("Error generating embedding:", error);
        return [];
    }
}

/**
 * Search the Supabase Knowledge Base using Vector Similarity
 */
export async function searchKnowledgeBase(query: string, limit: number = 3): Promise<KnowledgeChunk[]> {
    try {
        const embedding = await embedText(query);
        if (!embedding || embedding.length === 0) return [];

        const supabase = createSupabaseAdminClient();

        // Call the RPC function 'match_knowledge'
        const { data: chunks, error } = await supabase.rpc('match_knowledge', {
            query_embedding: embedding,
            match_threshold: 0.5, // Adjust sensitivity
            match_count: limit
        });

        if (error) {
            console.error("Supabase vector search error:", error);
            return [];
        }

        if (!chunks) return [];

        return chunks.map((chunk: any) => ({
            id: chunk.id,
            content: chunk.content,
            category: chunk.category,
            source: chunk.source_title,
            similarity: chunk.similarity
        }));

    } catch (error) {
        console.error("Knowledge retrieval error:", error);
        return [];
    }
}
