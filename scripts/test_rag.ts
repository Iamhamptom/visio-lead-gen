import { searchKnowledgeBase } from '../lib/rag';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    console.log("Testing RAG Retrieval...");
    const query = "I want to release a song correctly";
    console.log(`Query: "${query}"`);

    const results = await searchKnowledgeBase(query, 3);

    console.log(`Found ${results.length} results.`);
    results.forEach((r, i) => {
        console.log(`\n[${i + 1}] ${r.category} (Similarity: ${r.similarity.toFixed(4)})`);
        console.log(`preview: ${r.content.substring(0, 100)}...`);
    });
}

main();
