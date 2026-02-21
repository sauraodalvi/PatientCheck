import express from 'express';
import multer from 'multer';
import { parseDocument, extractText } from '../utils/parser';
import { generateRefinement } from '../utils/gemini';
import { generateDocx } from '../utils/exporter';
import fs from 'fs';

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });


// POST /api/upload — parse DOC1 claim chart → returns// POST /api/upload — handle multi-file uploads
router.post('/upload', upload.array('files'), async (req: any, res) => {
    const files = req.files as Express.Multer.File[];
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;

    if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
        const doc1 = files[0];
        const elements = await parseDocument(doc1.buffer, doc1.mimetype, customApiKey);

        const formattedElements = elements.map((e: any, idx: number) => ({
            id: e.id || String(idx + 1),
            element: e.element || '',
            evidence: e.evidence || '',
            reasoning: e.reasoning || '',
            confidence: 100,
            flags: [],
            versions: [],
            chatHistory: []
        }));

        res.status(200).json({ message: 'Chart parsed successfully', elements: formattedElements });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing file' });
    }
});

// POST /api/upload-context — extract raw text from a reference doc (DOC2/3/4/5)
router.post('/upload-context', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const fileBuffer = Buffer.from(req.file.buffer);
        const text = await extractText(fileBuffer, req.file.mimetype);

        res.status(200).json({
            message: 'Reference doc extracted successfully',
            doc: { name: req.file.originalname, text }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing reference document' });
    }
});

// POST /api/refine — stateless AI refinement with full doc context
router.post('/refine', async (req, res) => {
    const { elementId, element, evidence, reasoning, query, contextDocs, chatHistory, apiKey } = req.body;
    const customApiKey = (req.headers['x-gemini-api-key'] as string) || apiKey;

    if (!elementId || !query) {
        return res.status(400).json({ message: 'elementId and query are required' });
    }

    try {
        const context = `Claim Element Text: ${element}\nCurrent Evidence: ${evidence || '(none)'}\nCurrent Reasoning: ${reasoning || '(none)'}`;
        const refinement = await generateRefinement(elementId, context, query, contextDocs || [], chatHistory || [], customApiKey);

        res.json({
            message: 'Refinement complete',
            refinedReasoning: refinement.refinedReasoning || '',
            refinedEvidence: refinement.refinedEvidence || '',
            confidence: refinement.confidence ?? 100,
            flags: refinement.flags || [],
            explanation: refinement.explanation || '',
            proposedChange: refinement.proposedChange ?? false,
            noChangeNeeded: refinement.noChangeNeeded ?? false
        });
    } catch (error) {
        console.error('Refinement error:', error);
        res.status(500).json({ message: 'Error refining element' });
    }
});

// POST /api/export — generate DOCX from client-provided chart data
router.post('/export', async (req, res) => {
    const { title, elements } = req.body;
    if (!title || !elements) return res.status(400).json({ message: 'title and elements are required' });

    try {
        const buffer = await generateDocx(title, elements);
        const safeTitle = title.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\- ]/g, '_');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
        res.send(buffer);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Error exporting document' });
    }
});

// POST /api/test-inject — returns hardcoded DOC1 elements for QA testing (bypasses Gemini parsing)
router.post('/test-inject', async (req, res) => {
    const elements = [
        {
            id: '1.a',
            element: 'A temperature measurement system comprising a digital sensor array configured to detect ambient temperature with accuracy of ±0.1°C or better.',
            evidence: 'NexaTherm TechSpec v4.2 §3.1: "The NexaTherm Pro incorporates a 16-element MEMS thermopile array (Model NXT-T16) providing ambient temperature accuracy of ±0.05°C across -10°C to +50°C operating range."',
            reasoning: "NexaTherm's 16-element MEMS thermopile array directly satisfies the \"digital sensor array\" limitation. The documented ±0.05°C accuracy exceeds the claimed ±0.1°C threshold. Literal infringement clearly established under plain-meaning construction.",
            confidence: 95, flags: [], versions: [], chatHistory: []
        },
        {
            id: '1.b',
            element: 'A wireless communication module implementing IEEE 802.15.4 protocol for mesh network topology support with unicast and multicast addressing.',
            evidence: 'API Reference v3.0 §7.3: "Radio: IEEE 802.15.4-2015 compliant 2.4GHz transceiver (EFR32MG21 SoC). Supports Thread mesh networking protocol. Maximum mesh depth: 16 nodes. Unicast and multicast addressing supported per RFC 4944."',
            reasoning: 'NexaTherm has wireless. This probably meets the claim element for wireless communication since the product connects wirelessly. The IEEE standard requirement may be satisfied.',
            confidence: 55, flags: ['Reasoning uses hedging language ("probably meets", "may be satisfied") — needs technical rewrite'], versions: [], chatHistory: []
        },
        {
            id: '1.c',
            element: 'A machine learning inference engine trained on historical occupancy data and user behavioural patterns to predict and pre-adjust temperature setpoints.',
            evidence: 'NexaTherm.com marketing page: "Smart AI technology personalizes your comfort. The NexaTherm learns your schedule and adjusts automatically for the perfect temperature every time."',
            reasoning: "NexaTherm's smart technology appears to use AI that learns patterns, which may satisfy the machine learning limitation of the claim. The product adjusts automatically suggesting some form of prediction.",
            confidence: 25, flags: ['Evidence is marketing copy only — no technical specification', 'Reasoning uses hedging language — needs technical evidence'], versions: [], chatHistory: []
        },
        {
            id: '1.d',
            element: 'A humidity sensor configured to measure relative humidity with accuracy of ±2% RH or better across a range of 10% to 90% relative humidity.',
            evidence: '',
            reasoning: '',
            confidence: 0, flags: ['No evidence mapped — element is unsupported'], versions: [], chatHistory: []
        },
        {
            id: '1.e',
            element: 'An occupancy detection module comprising a passive infrared sensor with a detection range of at least 5 meters and a field of view of at least 90 degrees.',
            evidence: '[CONFLICTING SOURCES] Source A (TechSpec v4.2 §5.1): PIR range = 8 meters, 120° FOV | Source B (Datasheet v2.0 §5.1): PIR range = 3 meters, 90° FOV',
            reasoning: 'Evidence conflict prevents definitive reasoning. If 8m range applies (Source A): literal infringement established — exceeds ≥5m threshold. If 3m range applies (Source B): infringement NOT established.',
            confidence: 40, flags: ['Conflicting evidence — two sources give different PIR range values. Must resolve before mapping.'], versions: [], chatHistory: []
        }
    ];
    res.json({ message: 'Test elements injected', elements });
});

// POST /api/upload-context-data — accept pre-extracted text directly (for QA testing)
// Body: { name: string, text: string }
router.post('/upload-context-data', async (req, res) => {
    const { name, text } = req.body;
    if (!name || !text) return res.status(400).json({ message: 'name and text are required' });
    res.json({ message: 'Context doc received', doc: { name, text } });
});

export default router;

