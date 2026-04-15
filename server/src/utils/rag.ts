import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

export interface Chunk {
    text: string;
    source: string;
    section: string;
}

export interface RetrievedChunk extends Chunk {
    score: number;
}

export interface VectorIndex {
    chunks: Chunk[];
    embeddings: number[][];
}

// In-memory store for session-based indexes
const indexStore = new Map<string, VectorIndex>();

const getGenAI = (apiKey?: string) => {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "") {
        throw new Error("No Gemini API key provided. Please configure it in the Mission Control center (Settings).");
    }
    return new GoogleGenerativeAI(key);
};

/**
 * Section-aware text chunking.
 * Prioritizes splitting on symbols like §, Claim, Article, etc.
 */
export function chunkText(text: string, source: string): Chunk[] {
    // Normalizing whitespace
    const cleanText = text.replace(/\s+/g, ' ').trim();

    // Split by common legal/technical section markers
    // Matches: § 1.1, Claim 5, Article 12, etc.
    const sectionRegex = /(§|Claim|Article|Section)\s*(\d+[a-z.]*)/gi;

    let chunks: Chunk[] = [];
    let lastIndex = 0;
    let currentSection = "Introduction";

    let match;
    while ((match = sectionRegex.exec(cleanText)) !== null) {
        // If we found a section, take the text since last section
        if (match.index > lastIndex) {
            const chunkText = cleanText.substring(lastIndex, match.index).trim();
            if (chunkText.length > 100) { // skip tiny fragments
                chunks.push(...subChunk(chunkText, source, currentSection));
            }
        }

        currentSection = `${match[1]} ${match[2]}`;
        lastIndex = match.index;
    }

    // Add the final section
    const finalChunk = cleanText.substring(lastIndex).trim();
    if (finalChunk.length > 50) {
        chunks.push(...subChunk(finalChunk, source, currentSection));
    }

    // Fallback if no sections were detected at all
    if (chunks.length === 0 && cleanText.length > 0) {
        chunks = subChunk(cleanText, source, "General");
    }

    return chunks;
}

/**
 * Splits a section into smaller chunks if it exceeds word count.
 */
function subChunk(text: string, source: string, section: string, maxWords = 400): Chunk[] {
    const words = text.split(' ');
    if (words.length <= maxWords + 50) { // allowance
        return [{ text, source, section }];
    }

    const chunks: Chunk[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
        const subText = words.slice(i, i + maxWords).join(' ');
        chunks.push({ text: subText, source, section: `${section} (cont.)` });
    }
    return chunks;
}

/**
 * LLM call to rewrite/optimize the query for legal search.
 */
export async function optimizeQuery(query: string, apiKey?: string): Promise<string> {
    try {
        const genAI = getGenAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `Rewrite the following patent claim element into a precise technical search query optimized for document retrieval. 
Focus on specific technical components, ranges, and structures. Remove hedging language.
        
Claim Element: "${query}"

Return ONLY the optimized search query string.`;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Query optimization failed:", error);
        return query; // Fallback to raw query
    }
}

/**
 * Generates embeddings for an array of strings.
 * Batches calls to avoid API limit (100 items per request).
 * This function preserves 1:1 mapping between input texts and output embeddings.
 */
export async function embedText(texts: string[], apiKey?: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'): Promise<number[][]> {
    if (texts.length === 0) return [];

    const genAI = getGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const BATCH_SIZE = 100;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        console.log(`[RAG] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length} items)`);

        let retries = 0;
        const MAX_RETRIES = 3;
        let success = false;

        while (retries < MAX_RETRIES && !success) {
            try {
                const result = await model.batchEmbedContents({
                    requests: batch.map(text => ({
                        content: { role: 'user', parts: [{ text }] },
                        taskType: taskType as any
                    }))
                });

                if (!result || !result.embeddings) {
                    throw new Error("Invalid response from Gemini embedding API: missing embeddings array.");
                }

                console.log(`[RAG] Received ${result.embeddings.length} embeddings for batch`);
                allEmbeddings.push(...result.embeddings.map(e => e.values));
                success = true;
            } catch (err: any) {
                retries++;
                const isRateLimit = err.message?.includes('429') || err.details?.includes('429');

                if (isRateLimit && retries < MAX_RETRIES) {
                    const delay = Math.pow(2, retries) * 1000;
                    console.warn(`[RAG] Rate limit hit. Retrying batch in ${delay}ms (Attempt ${retries}/${MAX_RETRIES})...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`[RAG] Error in embedding batch starting at index ${i}:`, err);
                    const enhancedError = new Error(err.message || 'Gemini Embedding Error');
                    (enhancedError as any).details = err.response?.data?.error || err.message;
                    (enhancedError as any).status = err.response?.status || (err.message?.includes('API key') ? 401 : 500);
                    throw enhancedError;
                }
            }
        }
    }

    return allEmbeddings;
}

/**
 * Builds and stores an in-memory vector index.
 */
export async function buildIndex(sessionId: string, chunks: Chunk[], apiKey?: string): Promise<number> {
    // Filter out truly empty chunks before processing to ensure clean indexing
    const validChunks = chunks.filter(c => c.text.trim().length > 0);
    if (validChunks.length === 0) return 0;

    console.log(`Building index for session ${sessionId} with ${validChunks.length} chunks`);

    const texts = validChunks.map(c => c.text);
    const embeddings = await embedText(texts, apiKey);

    // Safety check: Ensure mappings are 1:1
    if (embeddings.length !== validChunks.length) {
        throw new Error(`Critical Indexing Mismatch: Received ${embeddings.length} embeddings for ${validChunks.length} chunks.`);
    }

    indexStore.set(sessionId, { chunks: validChunks, embeddings });
    return validChunks.length;
}

/**
 * Retrieves top-K chunks using cosine similarity.
 */
export async function retrieveTopK(
    sessionId: string,
    query: string,
    apiKey?: string,
    k = 5,
    threshold = 0.45
): Promise<{ chunks: RetrievedChunk[], topScore: number, noEvidenceFound: boolean, lowScoreReason: string }> {
    const index = indexStore.get(sessionId);
    if (!index) {
        return { chunks: [], topScore: 0, noEvidenceFound: true, lowScoreReason: "Document search not available (missing index). Using existing evidence." };
    }

    const { chunks, embeddings } = index;

    const optimizedQuery = await optimizeQuery(query, apiKey);
    const queryEmbeddingResults = await embedText([optimizedQuery], apiKey, 'RETRIEVAL_QUERY');
    const queryEmbedding = queryEmbeddingResults[0];

    const similarities = embeddings.map((emb, i) => ({
        index: i,
        score: cosineSimilarity(queryEmbedding, emb)
    }));

    // Log for auditability
    const topScoresForLog = [...similarities].sort((a, b) => b.score - a.score).slice(0, 3).map(c => c.score);
    console.log({
        query: query.substring(0, 50) + "...",
        optimizedQuery,
        topScores: topScoresForLog
    });

    // Filter and Sort
    const filtered = similarities
        .filter(s => s.score >= 0.1) // Keep trace of even weak ones for logging, but threshold controls "No Evidence"
        .sort((a, b) => b.score - a.score);

    const topScore = filtered.length > 0 ? filtered[0].score : 0;
    const noEvidenceFound = topScore < threshold;
    const topKIndices = filtered.slice(0, k);

    const finalChunks: RetrievedChunk[] = topKIndices.map(item => ({
        ...chunks[item.index],
        score: item.score
    }));

    let lowScoreReason = "";
    if (noEvidenceFound) {
        // Heuristic: Check for obvious keyword/numeric gaps
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
        const allDocText = chunks.map(c => c.text.toLowerCase()).join(' ');
        const missingTerms = queryTerms.filter(t => !allDocText.includes(t));

        const queryNumbers = query.match(/\d+(\.\d+)?/g) || [];
        const docNumbers = (allDocText.match(/\d+(\.\d+)?/g) || []) as string[];
        const missingNumbers = queryNumbers.filter(n => !docNumbers.includes(n));

        if (missingNumbers.length > 0) {
            lowScoreReason = `No direct match for values: ${missingNumbers.join(', ')}`;
        } else if (missingTerms.length > 0) {
            lowScoreReason = `Documents do not mention: ${missingTerms.slice(0, 2).join(', ')}`;
        } else {
            lowScoreReason = "Technical language does not align with requirement.";
        }
    }

    // Token Capping (approximated: 1 token ~= 4 chars)
    let totalChars = 0;
    const cappedChunks: RetrievedChunk[] = [];
    const charLimit = 4000; // ~1000 tokens

    for (const chunk of finalChunks) {
        if (totalChars + chunk.text.length > charLimit) {
            if (cappedChunks.length === 0) { // At least one truncated chunk if first is too big
                cappedChunks.push({ ...chunk, text: chunk.text.substring(0, charLimit) + "..." });
            }
            break;
        }
        cappedChunks.push(chunk);
        totalChars += chunk.text.length;
    }

    return {
        chunks: cappedChunks,
        topScore,
        noEvidenceFound,
        lowScoreReason
    };
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function clearIndex(sessionId: string) {
    indexStore.delete(sessionId);
}
