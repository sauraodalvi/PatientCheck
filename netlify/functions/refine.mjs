import { GoogleGenerativeAI } from '@google/generative-ai';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Method not allowed' }) };
    }

    try {
        const { elementId, element, evidence, reasoning, query, contextDocs, chatHistory, apiKey } = JSON.parse(event.body || '{}');
        const customApiKey = event.headers['x-gemini-api-key'] || apiKey || process.env.GEMINI_API_KEY;

        if (!elementId || !query) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'elementId and query are required' }) };
        }

        const genAI = new GoogleGenerativeAI(customApiKey || '');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const docsSection = (contextDocs && contextDocs.length > 0)
            ? contextDocs.map(doc => `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`).join('\n')
            : '(No reference documents uploaded. Do NOT fabricate any technical specifications.)';

        const historySection = (chatHistory && chatHistory.length > 0)
            ? chatHistory.map(t => `${t.role === 'user' ? 'Analyst' : 'AI'}: ${t.content}`).join('\n')
            : '';

        const context = `Claim Element Text: ${element}\nCurrent Evidence: ${evidence || '(none)'}\nCurrent Reasoning: ${reasoning || '(none)'}`;

        const prompt = `You are an expert patent litigation analyst assistant. Your role is to help strengthen patent infringement claim charts.

STRICT RULES — violating any of these is a critical error:
1. NEVER fabricate, invent, or assume any technical specifications not explicitly stated in the provided reference documents.
2. NEVER use hedging language in legal reasoning: forbidden words are "probably", "likely", "may", "might", "appears to", "suggests", "could", "seems".
3. If asked to find evidence but no relevant document is uploaded, say clearly "I cannot find this in the provided documents" and explain what document type is needed. Do NOT invent evidence.
4. Always cite specific section numbers (e.g., "§3.1") when referencing document content.
5. If asked to add a new claim element without being given the exact patent claim language, ask for it first.

--- UPLOADED REFERENCE DOCUMENTS ---
${docsSection}

--- CLAIM ELEMENT BEING WORKED ON ---
Element ID: ${elementId}
${context}

${historySection ? `--- PRIOR CONVERSATION ---\n${historySection}\n` : ''}
--- ANALYST REQUEST ---
${query}

Respond with a JSON object in this exact format:
{
  "refinedReasoning": "string — the new/updated reasoning text, or empty string if no change",
  "refinedEvidence": "string — the new/updated evidence text, or empty string if no change",
  "confidence": <number 0-100>,
  "flags": ["string — list of weaknesses or concerns, empty array if none"],
  "explanation": "string — explanation to show analyst in chat, citing specific §sections if referencing docs",
  "proposedChange": <boolean — true if this response includes a rewrite of reasoning or evidence that needs analyst approval>,
  "noChangeNeeded": <boolean — true if the element is already strong and no rewrite is suggested>
}

If the element is already well-evidenced and you are confirming its strength, set noChangeNeeded=true and do not rewrite any text.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Failed to parse AI response');
        const refinement = JSON.parse(jsonMatch[0]);

        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Refinement complete',
                refinedReasoning: refinement.refinedReasoning || '',
                refinedEvidence: refinement.refinedEvidence || '',
                confidence: refinement.confidence ?? 100,
                flags: refinement.flags || [],
                explanation: refinement.explanation || '',
                proposedChange: refinement.proposedChange ?? false,
                noChangeNeeded: refinement.noChangeNeeded ?? false,
            }),
        };
    } catch (error) {
        console.error('Refine error:', error);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'Error refining element', error: String(error) }),
        };
    }
};
