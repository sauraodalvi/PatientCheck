import mammoth from 'mammoth';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
            const pdfParse = (await import('pdf-parse')).default;
            const data = await pdfParse(fileBuffer);
            return data.text;
        } else {
            const data = await mammoth.extractRawText({ buffer: fileBuffer });
            return data.value;
        }
    } catch {
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
        if (!boundaryMatch) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'No boundary' }) };

        const boundary = boundaryMatch[1].trim();
        const bodyBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'binary');
        const files = parseMultipartBuffer(bodyBuffer.toString('binary'), boundary);

        if (!files.length) return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ message: 'No file uploaded' }) };

        const file = files[0];
        const text = await extractText(file.buffer, file.mimetype);

        return {
            statusCode: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Reference doc extracted successfully', doc: { name: file.originalname, text } }),
        };
    } catch (error) {
        console.error('Upload-context error:', error);
        return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Error processing reference document' }) };
    }
};
