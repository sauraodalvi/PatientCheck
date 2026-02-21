import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Decode multipart/form-data manually from a base64-encoded body
function parseMultipartBuffer(body, boundary) {
    const delimiter = `--${boundary}`;
    const parts = body.split(delimiter).filter(p => p && p !== '--\r\n' && p !== '--');
    const files = [];
    for (const part of parts) {
        const [headers, ...rest] = part.split('\r\n\r\n');
        if (!headers || !rest.length) continue;
        const content = rest.join('\r\n\r\n').replace(/\r\n$/, '');
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
        if (filenameMatch) {
            files.push({
                fieldname: nameMatch?.[1] || 'file',
                originalname: filenameMatch[1],
                mimetype: mimeMatch?.[1]?.trim() || 'application/octet-stream',
                buffer: Buffer.from(content, 'binary'),
            });
        }
    }
    return files;
}

async function extractText(fileBuffer, mimeType) {
    const mime = mimeType.toLowerCase();
    try {
        if (mime.includes('pdf')) {
            // Dynamically import pdf-parse (CJS module)
            const pdfParse = (await import('pdf-parse')).default;
            const data = await pdfParse(fileBuffer);
            return data.text;
        } else {
            const data = await mammoth.extractRawText({ buffer: fileBuffer });
            return data.value;
        }
    } catch (err) {
        const data = await mammoth.extractRawText({ buffer: fileBuffer });
        return data.value;
    }
}

export const handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: CORS_HEADERS, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Method not allowed' }) };
    }

    try {
        const contentType = event.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);
        if (!boundaryMatch) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'No multipart boundary found' }) };

        const boundary = boundaryMatch[1].trim();
        const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary');
        const files = parseMultipartBuffer(bodyBuffer.toString('binary'), boundary);

        if (!files.length) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'No files uploaded' }) };

        const customApiKey = event.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY || '';
        const doc1 = files[0];
        const text = await extractText(doc1.buffer, doc1.mimetype);

        if (!text || text.trim().length < 20) {
            return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Could not extract text from document' }) };
        }

        const genAI = new GoogleGenerativeAI(customApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

        const result = await model.generateContent(prompt);
        const aiText = result.response.text().trim();

        let elements = [];
        if (aiText.startsWith('[')) { try { elements = JSON.parse(aiText); } catch (_) { } }
        if (!elements.length) {
            const match = aiText.match(/\[[\s\S]*?\]/s);
            if (match) { try { elements = JSON.parse(match[0]); } catch (_) { } }
        }

        const formattedElements = elements.map((e, idx) => ({
            id: e.id || String(idx + 1),
            element: e.element || '',
            evidence: e.evidence || '',
            reasoning: e.reasoning || '',
            confidence: 100,
            flags: [],
            versions: [],
            chatHistory: []
        }));

        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Chart parsed successfully', elements: formattedElements }),
        };
    } catch (error) {
        console.error('Upload error:', error);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Error processing file', error: String(error) }) };
    }
};
