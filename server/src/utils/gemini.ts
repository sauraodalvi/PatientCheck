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

export interface RetrievedChunk {
  text: string;
  source: string;
  section: string;
  score: number;
}

export async function generateRefinement(
  elementId: string,
  context: string,
  query: string,
  contextDocs: ContextDoc[] = [],
  chatHistory: ChatTurn[] = [],
  customApiKey?: string,
  systemPrompt?: string,
  retrievedChunks?: RetrievedChunk[],
  topScore: number = 0,
  noEvidenceFound: boolean = false,
  hasChartEvidence: boolean = false
) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Build reference documents section (RAG preferred)
  let docsSection = "";
  if (retrievedChunks && retrievedChunks.length > 0) {
    docsSection = "=== GROUNDED EVIDENCE (RAG) ===\n" +
      retrievedChunks.map(c =>
        `[Document: ${c.source} | Section: ${c.section} | Score: ${c.score.toFixed(2)}]\n"${c.text}"`
      ).join('\n\n');
  } else if (contextDocs.length > 0) {
    docsSection = contextDocs.map(doc =>
      `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`
    ).join('\n');
  } else {
    docsSection = '(No reference documents currently indexed for search. Rely on existing chart evidence if present.)';
  }

  // Grounding Guardrails Injection
  let groundingGuardrail = "";
  if (noEvidenceFound && !hasChartEvidence) {
    groundingGuardrail = `
⚠️ SYSTEM GUARDRAIL — NO EVIDENCE FOUND IN ANY SOURCE:
1. You MUST set "refinedEvidence" to exactly "MISSING: No supporting evidence found in documents."
2. In "refinedReasoning", explain precisely what is missing.
3. Set "confidence" to exactly ${Math.round(topScore * 100)}.
4. Do NOT attempt to infer or suggest specifications.
`;
  } else if (noEvidenceFound && hasChartEvidence) {
    groundingGuardrail = `
ℹ️ RAG Search returned no new matches, but the chart already has evidence.
1. Use the "Current Evidence" provided below.
2. Clearly state that you are using existing evidence because search found no additional matches.
3. Your peak confidence should be capped at 85% since recent document search was inconclusive.
`;
  }

  // Build prior conversation section
  const historySection = chatHistory.map(t => `${t.role === 'user' ? 'Analyst' : 'AI'}: ${t.content}`).join('\n');

  const finalSystemPrompt = systemPrompt || `
You are an expert patent litigation analyst assistant. Your role is to help strengthen patent infringement claim charts.

STRICT RULES — violating any of these is a critical error:
1. NEVER fabricate, invent, or assume any technical specifications not explicitly stated in the provided reference documents.
2. NEVER use hedging language in legal reasoning: forbidden words are "probably", "likely", "may", "might", "appears to", "suggests", "could", "seems".
3. Use ONLY the provided evidence. If the information is missing or insufficient to support the claim, set reasoning to indicate lack of evidence.
4. Always cite specific section numbers (e.g., "§3.1") when referencing document content.
5. CALIBRATED CONFIDENCE: Your confidence must match the retrieval quality.
${groundingGuardrail}
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
  "refinedReasoning": "string — explain what is found or what is missing",
  "refinedEvidence": "string — either the source quote with cite, or 'MISSING'",
  "confidence": ${Math.round(topScore * 100)},
  "flags": ["string — list of weaknesses, e.g. 'Ungrounded Prediction'"],
  "explanation": "string — technical breakdown for the analyst",
  "proposedChange": true,
  "noChangeNeeded": false,
  "isConflictResolved": boolean,
  "sourceArbitrationDetails": "string — explain if you chose one DOC over another due to versions/recency"
}

Note: If multiple documents (e.g. DOC2 vs DOC5) provide conflicting specs, ARBITRATE based on recency or explicit version numbers (e.g. NXT-2000 > NXT-1000). 
If you resolve such a conflict, set "isConflictResolved" to true and justify your choice in "sourceArbitrationDetails".
If the element is already well-evidenced, confirm its strength and set noChangeNeeded = true.
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
          feedback: response.promptFeedback
        });
        throw new Error(`AI response blocked or failed: ${e.message}`);
      }

      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);

          // --- EVIDENCE ARBITRATION CALIBRATION ---
          if (parsed.isConflictResolved) {
            // Apply penalty for resolving ambiguity (80-85% max)
            parsed.confidence = Math.round(parsed.confidence * 0.82);
            if (!parsed.flags) parsed.flags = [];
            parsed.flags.push("Conflict Resolved via Arbitration");
          }

          // Force LDS cap if no evidence found at all
          if (noEvidenceFound && !hasChartEvidence) {
            parsed.refinedEvidence = "MISSING: No supporting evidence found in documents.";
            parsed.confidence = Math.min(parsed.confidence, Math.round(topScore * 100));
          } else if (noEvidenceFound && hasChartEvidence) {
            // High confidence allowed but capped to 90% to reflect "no new validation"
            parsed.confidence = Math.min(parsed.confidence, 90);
            if (!parsed.flags) parsed.flags = [];
            parsed.flags.push("Validated via Existing Evidence");
          }

          return parsed;
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
        const delay = attempt * 3000;
        console.warn(`Gemini API ${is429 ? 'Rate Limit' : 'High Demand'} on attempt ${attempt}. Retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export async function runBatchAudit(
  elements: { id: string, element: string, evidence: string, reasoning: string }[],
  contextDocs: ContextDoc[] = [],
  customApiKey?: string
) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const docsSection = contextDocs.length > 0
    ? contextDocs.map(doc => `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`).join('\n')
    : '(No reference documents uploaded. Do NOT fabricate any technical specifications.)';

  const targetElementsText = elements.map(e => (
    `--- ELEMENT ID: ${e.id} ---\nClaim Element: ${e.element}\nEvidence: ${e.evidence}\nReasoning: ${e.reasoning}\n`
  )).join('\n');

  const auditPrompt = `
You are a Senior Litigation Attorney and AI Quality Auditor. Your job is to audit multiple AI-generated claim chart mappings.

--- UPLOADED REFERENCE DOCUMENTS ---
${docsSection}

--- TARGET CLAIM MAPPINGS TO AUDIT ---
${targetElementsText}

--- AUDIT CRITERIA ---
1. CITATION ACCURACY: Does it cite specific § sections?
2. HEDGING DETECTOR: Are there words like "likely", "appears", "seems"?
3. GROUNDING: If evidence is MISSING, ldsScore MUST be ≤ 30.

Respond with a JSON object:
{
  "results": [
    {
      "elementId": "string",
      "ldsScore": <number 0-100>,
      "verdict": "PASS | WARNING | CRITICAL",
      "auditNotes": "string",
      "hedgingDetected": <boolean>,
      "missingCitations": <boolean>
    }
  ]
}
`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(auditPrompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON in audit response");
    } catch (error: any) {
      attempt++;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }
      throw error;
    }
  }
}

export async function runAudit(
  element: string,
  evidence: string,
  reasoning: string,
  contextDocs: ContextDoc[] = [],
  customApiKey?: string
) {
  const genAI = getGenAI(customApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const docsSection = contextDocs.length > 0
    ? contextDocs.map(doc => `=== DOCUMENT: "${doc.name}" ===\n${doc.text.substring(0, 8000)}\n`).join('\n')
    : '(No reference documents uploaded.)';

  const auditPrompt = `
You are a Senior Litigation Attorney and AI Quality Auditor.
--- TARGET CLAIM MAPPING ---
Claim Element: ${element}
Evidence: ${evidence}
Reasoning: ${reasoning}

--- UPLOADED REFERENCE DOCUMENTS ---
${docsSection}

Respond with a JSON object:
{
  "ldsScore": <number 0-100>,
  "verdict": "PASS | WARNING | CRITICAL",
  "auditNotes": "string",
  "hedgingDetected": <boolean>,
  "missingCitations": <boolean>
}

Note: If evidence is "MISSING", ldsScore MUST be ≤ 30.
`;

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await model.generateContent(auditPrompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (evidence.includes("MISSING") && parsed.ldsScore > 30) {
          parsed.ldsScore = 30;
        }
        return parsed;
      }
      throw new Error("No JSON in audit response");
    } catch (error: any) {
      attempt++;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      return { ldsScore: 0, verdict: 'ERROR', auditNotes: error.message };
    }
  }
}
