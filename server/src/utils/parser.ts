// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore — pdf-parse is CJS, esModuleInterop handles runtime correctly
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();


const defaultGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const defaultModel = defaultGenAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/** Extract raw text from a PDF or DOCX buffer (no AI structuring). */
export async function extractText(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const mime = mimeType.toLowerCase();
    if (mime.includes('pdf')) {
        // @ts-ignore — pdf-parse CJS call works correctly at runtime
        const data = await pdfParse(fileBuffer);
        return data.text;
    } else if (mime.includes('word') || mime.includes('docx') || mime.includes('officedocument') || mime.includes('octet-stream')) {
        const data = await mammoth.extractRawText({ buffer: fileBuffer });
        return data.value;
    }
    // Fallback: try both
    try {
        const data = await mammoth.extractRawText({ buffer: fileBuffer });
        if (data.value && data.value.length > 50) return data.value;
    } catch (_) { }
    throw new Error(`Unsupported file type: ${mimeType}`);
}

/** Parse a claim chart document into structured elements using Gemini. */
export async function parseDocument(fileBuffer: Buffer, mimeType: string, customApiKey?: string) {
    let model = defaultModel;
    if (customApiKey) {
        const customAI = new GoogleGenerativeAI(customApiKey);
        model = customAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }

    let text: string;
    try {
        text = await extractText(fileBuffer, mimeType);
    } catch (e) {
        console.error("Text extraction failed:", e);
        return [];
    }

    if (!text || text.trim().length < 20) {
        console.error("Extracted text too short:", text?.length);
        return [];
    }

    console.log("Extracted text length:", text.length, "| Preview:", text.substring(0, 200));

    const prompt = `You are a patent data extraction assistant. Extract claim elements from the following claim chart text and return ONLY a valid JSON array.

Text to parse:
"""
${text.substring(0, 12000)}
"""

Return a JSON array exactly like this (no markdown, no explanation, just the array):
[{"id":"1.a","element":"<claim text>","evidence":"<evidence text>","reasoning":"<reasoning text>"},...]

Rules:
- Include ALL elements you find (1.a, 1.b, 1.c, 1.d, 1.e etc)
- If evidence says [NO EVIDENCE MAPPED] or similar, use empty string ""
- If reasoning says [NO REASONING] or similar, use empty string ""
- If evidence shows CONFLICTING SOURCES, include both sources in the evidence field
- Return ONLY the JSON array, starting with [ and ending with ]`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text().trim();

        console.log("Gemini raw response (first 500):", aiText.substring(0, 500));

        // Try to extract JSON array using multiple strategies
        // Strategy 1: Direct parse if it starts with [
        if (aiText.startsWith('[')) {
            try { return JSON.parse(aiText); } catch (_) { }
        }

        // Strategy 2: Find JSON array in the response
        const jsonMatch = aiText.match(/\[[\s\S]*?\]/s);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch (_) { }
        }

        // Strategy 3: Strip markdown fences
        const stripped = aiText.replace(/```json\n?|```\n?/g, '').trim();
        if (stripped.startsWith('[')) {
            try { return JSON.parse(stripped); } catch (_) { }
        }

        // Strategy 4: Find largest [...] block
        const matches = [...aiText.matchAll(/\[[\s\S]*\]/g)];
        if (matches.length > 0) {
            const longest = matches.sort((a, b) => b[0].length - a[0].length)[0][0];
            try { return JSON.parse(longest); } catch (_) { }
        }

        console.error("Could not parse Gemini response as JSON array. Response:", aiText.substring(0, 300));
        return [];
    } catch (error) {
        console.error("Gemini API Error:", error);
        return [];
    }
}
