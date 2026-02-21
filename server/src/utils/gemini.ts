import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const defaultModel = defaultGenAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export interface ContextDoc {
  name: string;
  text: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateRefinement(
  elementId: string,
  context: string,
  query: string,
  contextDocs: ContextDoc[] = [],
  chatHistory: ChatTurn[] = [],
  customApiKey?: string
) {
  let model = defaultModel;
  if (customApiKey) {
    const customAI = new GoogleGenerativeAI(customApiKey);
    model = customAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }
  // Build reference documents section
  const docsSection = contextDocs.length > 0
    ? contextDocs.map(doc =>
      `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`
    ).join('\n')
    : '(No reference documents uploaded. Do NOT fabricate any technical specifications.)';

  // Build prior conversation section
  const historySection = chatHistory.length > 0
    ? chatHistory.map(t => `${t.role === 'user' ? 'Analyst' : 'AI'}: ${t.content}`).join('\n')
    : '';

  const prompt = `
You are an expert patent litigation analyst assistant. Your role is to help strengthen patent infringement claim charts.

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

If the element is already well-evidenced and you are confirming its strength, set noChangeNeeded=true and do not rewrite any text.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse AI response");
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
}
