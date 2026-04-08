import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

// Helper to get Gemini client with appropriate error handling
const getGenAI = (apiKey?: string) => {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("No Gemini API key provided. Please configure it in the Mission Control center.");
  }
  return new GoogleGenerativeAI(key);
};

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
  customApiKey?: string,
  systemPrompt?: string
) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build reference documents section
  const docsSection = contextDocs.length > 0
    ? contextDocs.map(doc =>
      `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`
    ).join('\n')
    : '(No reference documents uploaded. Do NOT fabricate any technical specifications.)';

  // Build prior conversation section
  const historySection = chatHistory.map(t => `${t.role === 'user' ? 'Analyst' : 'AI'}: ${t.content}`).join('\n');

  const finalSystemPrompt = systemPrompt || `
You are an expert patent litigation analyst assistant. Your role is to help strengthen patent infringement claim charts.

STRICT RULES — violating any of these is a critical error:
1. NEVER fabricate, invent, or assume any technical specifications not explicitly stated in the provided reference documents.
2. NEVER use hedging language in legal reasoning: forbidden words are "probably", "likely", "may", "might", "appears to", "suggests", "could", "seems".
3. If asked to find evidence but no relevant document is uploaded, say clearly "I cannot find this in the provided documents" and explain what document type is needed. Do NOT invent evidence.
4. Always cite specific section numbers (e.g., "§3.1") when referencing document content.
5. If asked to add a new claim element without being given the exact patent claim language, ask for it first.
`;

  const prompt = `
${finalSystemPrompt}

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

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;

      let text = "";
      try {
        text = response.text();
      } catch (e: any) {
        console.error("Gemini safety block or empty response:", {
          message: e.message,
          feedback: response.promptFeedback,
          candidates: response.candidates?.map((c: any) => ({
            finishReason: c.finishReason,
            safetyRatings: c.safetyRatings
          }))
        });
        throw new Error(`AI response blocked or failed: ${e.message}`);
      }

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      // Attempt to extract JSON from markdown or plain text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError: any) {
          console.error("JSON Parse Error on Gemini response:", parseError.message, "Text:", text);
          throw new Error(`Failed to parse AI JSON response: ${parseError.message}`);
        }
      }

      console.error("No JSON found in Gemini response. Text:", text);
      throw new Error("Failed to extract JSON from AI response");

    } catch (error: any) {
      attempt++;
      const is503 = error.message?.includes('503') || error.status === 503;
      const is429 = error.message?.includes('429') || error.status === 429;

      if ((is503 || is429) && attempt < maxRetries) {
        const delay = attempt * 3000; // 3s, 6s, 9s
        console.warn(`Gemini API ${is429 ? 'Rate Limit (429)' : 'High Demand (503)'} on attempt ${attempt}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error("Gemini AI Error in generateRefinement:", {
        message: error.message,
        stack: error.stack,
        elementId,
        attempt
      });
      throw error;
    }
  }
}

/**
 * runBatchAudit
 * Audits multiple claim elements in a single API call to reduce rate limit issues.
 */
export async function runBatchAudit(
  elements: { id: string, element: string, evidence: string, reasoning: string }[],
  contextDocs: ContextDoc[] = [],
  customApiKey?: string
) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const docsSection = contextDocs.length > 0
    ? contextDocs.map(doc =>
      `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`
    ).join('\n')
    : '(No reference documents uploaded. Do NOT fabricate any technical specifications.)';

  const targetElementsText = elements.map(e => (
    `--- ELEMENT ID: ${e.id} ---\nClaim Element: ${e.element}\nEvidence: ${e.evidence}\nReasoning: ${e.reasoning}\n`
  )).join('\n');

  const auditPrompt = `
You are a Senior Litigation Attorney and AI Quality Auditor. Your job is to audit multiple AI-generated claim chart mappings for legal defensibility.

--- UPLOADED REFERENCE DOCUMENTS ---
${docsSection}

--- TARGET CLAIM MAPPINGS TO AUDIT ---
${targetElementsText}

--- AUDIT CRITERIA ---
1. CITATION ACCURACY: Does the reasoning cite specific § sections? Is the evidence actually in the docs?
2. HEDGING DETECTOR: Are there words like "likely", "appears", "seems"? (Legally weak)
3. TECHNICAL PRECISION: Does it use industry-standard terms or vague generalizations?

Respond with a JSON object containing an array of audit results. Each object in the array must include the "elementId".
Format:
{
  "results": [
    {
      "elementId": "string",
      "ldsScore": <number 0-100>,
      "verdict": "string — PASS, WARNING, or CRITICAL",
      "auditNotes": "string — specific feedback",
      "hedgingDetected": <boolean>,
      "missingCitations": <boolean>
    },
    ...
  ]
}
`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(auditPrompt);
      const response = await result.response;

      let text = "";
      try {
        text = response.text();
      } catch (e: any) {
        console.error("Batch Audit safety block:", {
          message: e.message,
          feedback: response.promptFeedback,
          candidates: response.candidates?.map((c: any) => ({
            finishReason: c.finishReason,
            safetyRatings: c.safetyRatings
          }))
        });
        throw new Error(`AI batch response blocked: ${e.message}`);
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError: any) {
          console.error("Batch Audit JSON Parse Error:", parseError.message, "Text:", text);
          throw new Error(`Failed to parse batch audit JSON: ${parseError.message}`);
        }
      }
      throw new Error("Failed to extract valid JSON from batch audit response");

    } catch (error: any) {
      attempt++;
      const isWaitable = error.message?.includes('503') || error.status === 503 || error.message?.includes('429') || error.status === 429;
      if (isWaitable && attempt < maxRetries) {
        const delay = attempt * 4000;
        console.warn(`Batch Audit API ${error.status || 'Error'} on attempt ${attempt}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      console.error('Batch Audit Final Error:', error);
      throw error;
    }
  }
}

/**
 * AI Audit (LLM-as-a-Judge)
 * Evaluates the reasoning and evidence of a claim element against legal standards.
 */
export async function runAudit(
  element: string,
  evidence: string,
  reasoning: string,
  contextDocs: ContextDoc[] = [],
  customApiKey?: string
) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const docsSection = contextDocs.length > 0
    ? contextDocs.map(doc =>
      `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`
    ).join('\n')
    : '(No reference documents uploaded. Do NOT fabricate any technical specifications.)';

  const auditPrompt = `
You are a Senior Litigation Attorney and AI Quality Auditor. Your job is to audit an AI-generated claim chart mapping for legal defensibility.

--- TARGET CLAIM MAPPING ---
Claim Element: ${element}
Evidence: ${evidence}
Reasoning: ${reasoning}

--- UPLOADED REFERENCE DOCUMENTS ---
${docsSection}

--- AUDIT CRITERIA ---
1. CITATION ACCURACY: Does the reasoning cite specific § sections? Is the evidence actually in the docs?
2. HEDGING DETECTOR: Are there words like "likely", "appears", "seems"? (Legally weak)
3. TECHNICAL PRECISION: Does it use industry-standard terms or vague generalizations?

Respond with a JSON object:
{
  "ldsScore": <number 0-100>,
  "verdict": "string — PASS, WARNING, or CRITICAL",
  "auditNotes": "string — specific feedback on what is weak or strong",
  "hedgingDetected": <boolean>,
  "missingCitations": <boolean>
}
`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(auditPrompt);
      const response = await result.response;

      let text = "";
      try {
        text = response.text();
      } catch (e: any) {
        console.error("Audit AI safety block or empty response:", {
          message: e.message,
          feedback: response.promptFeedback,
          candidates: response.candidates?.map((c: any) => ({
            finishReason: c.finishReason,
            safetyRatings: c.safetyRatings
          }))
        });
        throw new Error(`AI audit response blocked or failed: ${e.message}`);
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError: any) {
          console.error("Audit JSON Parse Error on Gemini response:", parseError.message, "Text:", text);
          throw new Error(`Failed to parse AI audit JSON: ${parseError.message}`);
        }
      }
      throw new Error("Failed to extract valid JSON from audit response");
    } catch (error: any) {
      attempt++;
      const is503 = error.message?.includes('503') || error.status === 503;
      const is429 = error.message?.includes('429') || error.status === 429;

      if ((is503 || is429) && attempt < maxRetries) {
        const delay = attempt * 3000;
        console.warn(`Audit Gemini API ${is429 ? 'Rate Limit (429)' : 'High Demand (503)'} on attempt ${attempt}. Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      console.error('Audit AI Error:', {
        message: error.message,
        attempt,
        element: element.substring(0, 50)
      });

      return {
        ldsScore: 0,
        verdict: 'ERROR',
        auditNotes: `AI audit failed: ${error.message}${is429 ? ' (Rate Limit reached)' : ''}. Please try again in a few seconds.`
      };
    }
  }
  return { ldsScore: 0, verdict: 'ERROR', auditNotes: 'Failed to run AI audit after multiple retries.' };
}
