import axios from 'axios';

const baseURL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE_URL || '';

const api = axios.create({
    baseURL,
    timeout: 60000,
});

export interface RetrievedChunk {
    text: string;
    section: string;
    source: string;
    score: number; // 0-1
}

export interface RefinementResponse {
    message: string;
    refinement: {
        refinedReasoning: string;
        refinedEvidence: string;
        confidence: number;
        flags: string[];
        explanation: string;
        proposedChange: boolean;
        noChangeNeeded: boolean;
        isConflictResolved?: boolean;
        sourceArbitrationDetails?: string;
    };
}

export interface AuditResult {
    elementId: string;
    ldsScore: number;
    verdict: 'PASS' | 'WARNING' | 'CRITICAL' | 'ERROR';
    auditNotes: string;
    hedgingDetected: boolean;
    missingCitations: boolean;
}

export interface IndexResponse {
    message: string;
    sessionId: string;
    chunkCount: number;
}

export interface RetrievalResponse {
    chunks: RetrievedChunk[];
    topScore: number;
    noEvidenceFound: boolean;
    lowScoreReason: string;
}

export const parseDocument = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const uploadReferenceDoc = async (files: File | File[]) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
        files.forEach(file => formData.append('files', file));
    } else {
        formData.append('files', files);
    }
    const response = await api.post('/api/upload-context', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const runAudit = async (element: string, evidence: string, reasoning: string, contextDocs: any[], apiKey?: string) => {
    const response = await api.post('/api/audit', { element, evidence, reasoning, contextDocs, apiKey });
    return response.data;
};

export const runBatchAudit = async (elements: any[], contextDocs: any[], apiKey?: string) => {
    const response = await api.post('/api/batch-audit', { elements, contextDocs, apiKey });
    return response.data;
};

export const generateRefinement = async (
    elementId: string,
    element: string,
    evidence: string,
    reasoning: string,
    query: string,
    contextDocs: any[],
    chatHistory: any[],
    apiKey?: string,
    systemPrompt?: string,
    retrievedChunks?: RetrievedChunk[],
    topScore?: number,
    noEvidenceFound?: boolean,
    hasChartEvidence?: boolean
): Promise<RefinementResponse> => {
    const response = await api.post('/api/refine', {
        elementId,
        element,
        evidence,
        reasoning,
        query,
        contextDocs,
        chatHistory,
        apiKey,
        systemPrompt,
        retrievedChunks,
        topScore,
        noEvidenceFound,
        hasChartEvidence
    });
    return response.data;
};

export const exportChart = async (chart: any, elements: any[]) => {
    const response = await api.post('/api/export', { chart, elements }, { responseType: 'blob' });
    return response.data;
};

export const indexDocuments = async (
    docs: { name: string, text: string }[],
    sessionId: string,
    apiKey?: string
): Promise<IndexResponse> => {
    const response = await api.post('/api/index-docs', {
        docs,
        sessionId,
        apiKey
    }, {
        headers: {
            'X-Gemini-API-Key': apiKey || ''
        }
    });
    return response.data;
};

export const retrieveEvidence = async (
    query: string,
    sessionId: string,
    apiKey?: string,
    k = 5,
    threshold = 0.45
): Promise<RetrievalResponse> => {
    const response = await api.post('/api/retrieve', {
        query,
        sessionId,
        apiKey,
        k,
        threshold
    });
    return response.data;
};

export default api;
