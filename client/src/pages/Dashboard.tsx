import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Layout, FileText, Upload, MessageSquare, Download, ChevronLeft,
    ChevronRight, X, Loader2, AlertTriangle, Plus, Trash2, BookOpen,
    RotateCcw, Check, Ban, Send, History, RefreshCw, BarChart3, ShieldCheck, Play, Info
} from 'lucide-react';
import ClaimTable, { ClaimElement, ChatMessage, ElementVersion } from '../components/ClaimTable';
import DiffView from '../components/DiffView';
import ExportWarningModal, { getIssues } from '../components/ExportWarningModal';
import QualityScorecard from '../components/QualityScorecard';
import AddReferenceModal from '../components/AddReferenceModal';
import DemoSelectorModal, { DemoPath } from '../components/DemoSelectorModal';
import api from '../api';
import Joyride, { Step } from 'react-joyride';

const STORAGE_KEY = 'lumenci_charts_v2';

interface ContextDoc { name: string; text: string; }

interface Chart {
    id: string;
    title: string;
    elements: ClaimElement[];
    contextDocs: ContextDoc[];
    createdAt: string;
}

function loadCharts(): Chart[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveCharts(charts: Chart[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
}

interface PendingRefinement {
    elementId: string;
    oldReasoning: string;
    newReasoning: string;
    oldEvidence: string;
    newEvidence: string;
    confidence: number;
    flags: string[];
}

// ─────────────────────────────────────────────
// Chat Message Renderer
// ─────────────────────────────────────────────
const ChatBubble: React.FC<{
    msg: ChatMessage;
    onAccept?: () => void;
    onReject?: () => void;
    onFeedback?: (type: 'good' | 'bad') => void;
}> = ({ msg, onAccept, onReject, onFeedback }) => {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`group relative max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap
                ${isUser
                    ? 'bg-[#37352f] text-white rounded-br-sm'
                    : 'bg-[#f2f1ee] text-[#37352f] rounded-bl-sm border border-[#e1e1e0]'}`}>
                {msg.content}

                {/* Micro-feedback UI */}
                {!isUser && onFeedback && !msg.proposedChange && (
                    <div className="absolute -right-12 top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onFeedback('good')}
                            className={`p-1 rounded hover:bg-green-50 text-[#7a776e] hover:text-green-600 ${msg.feedback === 'good' ? 'text-green-600 bg-green-50' : ''}`}>
                            <Check size={10} />
                        </button>
                        <button onClick={() => onFeedback('bad')}
                            className={`p-1 rounded hover:bg-red-50 text-[#7a776e] hover:text-red-600 ${msg.feedback === 'bad' ? 'text-red-600 bg-red-50' : ''}`}>
                            <X size={10} />
                        </button>
                    </div>
                )}
            </div>

            {/* Diff view for proposed changes */}
            {msg.proposedChange && (
                <div className="w-full space-y-2">
                    {(msg.proposedChange.oldReasoning !== msg.proposedChange.newReasoning) && (
                        <div className="border border-[#e1e1e0] rounded-lg p-3 bg-white">
                            <DiffView
                                label="Reasoning change"
                                oldText={msg.proposedChange.oldReasoning}
                                newText={msg.proposedChange.newReasoning}
                            />
                        </div>
                    )}
                    {(msg.proposedChange.oldEvidence !== msg.proposedChange.newEvidence) && (
                        <div className="border border-[#e1e1e0] rounded-lg p-3 bg-white">
                            <DiffView
                                label="Evidence change"
                                oldText={msg.proposedChange.oldEvidence}
                                newText={msg.proposedChange.newEvidence}
                            />
                        </div>
                    )}

                    {msg.status === 'pending' && onAccept && onReject && (
                        <div className="flex gap-2">
                            <button
                                onClick={onAccept}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                            >
                                <Check size={12} /> Accept
                            </button>
                            <button
                                onClick={onReject}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e1e1e0] text-[#7a776e] rounded-lg text-xs font-medium hover:bg-[#f7f7f5] transition-colors"
                            >
                                <Ban size={12} /> Reject
                            </button>
                        </div>
                    )}

                    {msg.status === 'accepted' && (
                        <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                            <Check size={10} /> Applied
                        </span>
                    )}
                    {msg.status === 'rejected' && (
                        <span className="text-[10px] text-[#7a776e] font-medium flex items-center gap-1">
                            <Ban size={10} /> Rejected
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
const Dashboard: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(true);
    const [charts, setCharts] = useState<Chart[]>(loadCharts);
    const [activeChartId, setActiveChartId] = useState<string | null>(() => localStorage.getItem('lumenci_active_chart_v2') || loadCharts()[0]?.id || null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingCtx, setIsUploadingCtx] = useState(false);
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);
    const [undoPending, setUndoPending] = useState<{ elementId: string; version: ElementVersion } | null>(null);
    const [bannerDismissed, setBannerDismissed] = useState(() =>
        localStorage.getItem('lumenci_banner_v2') === 'true'
    );
    const [apiKey, setApiKey] = useState(localStorage.getItem('lumenci_gemini_key') || '');
    const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem('lumenci_system_prompt') || '');
    const [urlInput, setUrlInput] = useState('');
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);
    const [isQualityViewOpen, setIsQualityViewOpen] = useState(false);
    const [isAddRefModalOpen, setIsAddRefModalOpen] = useState(false);
    const [auditingId, setAuditingId] = useState<string | null>(null);
    const [runTour, setRunTour] = useState(false);
    const [demoPath, setDemoPath] = useState<DemoPath | null>(null);
    const [showDemoSelector, setShowDemoSelector] = useState(false);
    const [isValidatingKey, setIsValidatingKey] = useState(false);
    const [keyValidationStatus, setKeyValidationStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const chartFileRef = useRef<HTMLInputElement>(null);
    const ctxFileRef = useRef<HTMLInputElement>(null);
    const jsonFileRef = useRef<HTMLInputElement>(null);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const activeChart = charts.find(c => c.id === activeChartId) ?? null;
    const elements = activeChart?.elements ?? [];
    const contextDocs = activeChart?.contextDocs ?? [];
    const selectedElement = elements.find(e => e.id === selectedElementId) ?? null;

    useEffect(() => {
        localStorage.setItem('lumenci_gemini_key', apiKey);
        if (keyValidationStatus !== 'idle') setKeyValidationStatus('idle');
    }, [apiKey]);

    const handleValidateKey = async () => {
        if (!apiKey.trim()) return;
        setIsValidatingKey(true);
        setKeyValidationStatus('idle');
        try {
            // We'll use a lightweight call to check validity
            await api.get('/api/health', { headers: { 'x-gemini-api-key': apiKey } });
            setKeyValidationStatus('success');
        } catch (err) {
            setKeyValidationStatus('error');
        } finally {
            setIsValidatingKey(false);
        }
    };

    const isDemoChart = activeChart?.title === 'Demo Claim Chart';

    const getTourSteps = (): Step[] => {
        if (!isDemoChart) {
            return [
                {
                    target: 'body',
                    content: (
                        <div className="text-left py-1">
                            <p className="font-bold mb-1">Standard Workflow 🛠️</p>
                            <p className="text-xs">Learn how to refine any claim chart from scratch.</p>
                        </div>
                    ),
                    placement: 'center',
                },
                { target: '#api-key-container', content: '1. Secure AI access.', placement: 'right' },
                { target: '#new-chart-btn', content: '2. Upload your draft.', placement: 'right' },
                { target: '#reference-docs-section', content: '3. Add technical proof docs.', placement: 'right' },
                { target: '#main-content', content: '4. View structured element grid.', placement: 'bottom' },
                { target: '#chat-pane', content: '5. Refine specific cells via AI chat.', placement: 'left' },
                { target: '#export-options', content: '6. Export to PDF/Word.', placement: 'top' },
            ];
        }

        switch (demoPath) {
            case 'case-a':
                return [
                    {
                        target: 'body',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold text-green-600 mb-1">Scenario A: The Literal Match</p>
                                <p>Analysts often miss exact phrasing in 500-page manuals. Lumenci finds them in milliseconds.</p>
                            </div>
                        ),
                        placement: 'center',
                    },
                    {
                        target: '#claim-row-1-a',
                        content: 'This element requires WiFi capability. AI scanned the "Acme Product Page" and found the exact matching spec.',
                        placement: 'bottom'
                    },
                    {
                        target: '#reference-docs-section',
                        content: 'Check the Reference Docs sidebar to see the source URL the AI used.',
                        placement: 'right'
                    }
                ];
            case 'case-b':
                return [
                    {
                        target: 'body',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold text-yellow-600 mb-1">Scenario B: Strengthening Weak Reasoning</p>
                                <p>Sometimes "AI Logic" is too vague for a courtroom. Here is how we fix it.</p>
                            </div>
                        ),
                        placement: 'center',
                    },
                    {
                        target: '#claim-row-1-b',
                        content: 'The evidence for "Motion Sensing" is here, but the reasoning is light. Click this row.',
                        placement: 'bottom'
                    },
                    {
                        target: '#chat-pane',
                        content: 'Action: Type "Expand reasoning using technical details" in the chat to see a high-precision rewrite.',
                        placement: 'left'
                    }
                ];
            case 'case-c':
                return [
                    {
                        target: 'body',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold text-orange-600 mb-1">Scenario C: Resolving Conflicts</p>
                                <p>When two documents disagree, the human analyst must make the final call.</p>
                            </div>
                        ),
                        placement: 'center',
                    },
                    {
                        target: '#claim-row-1-e',
                        content: 'Hardware specs say "ML enabled", but Marketing says "No AI". We flag this as a conflict.',
                        placement: 'bottom'
                    },
                    {
                        target: '#quality-dashboard-btn',
                        content: 'The Quality Audit will flag this row as "High Risk" due to contradictory citations.',
                        placement: 'bottom'
                    }
                ];
            default:
                return [
                    {
                        target: 'body',
                        content: (
                            <div className="text-left">
                                <p className="font-bold mb-1 italic">Welcome to the Lumenci AI Experience! 🚀</p>
                                <p className="text-xs leading-relaxed">This overview will walk you through the mission control center for your patent claim analysis. See how we turn complex technical docs into courtroom-ready charts.</p>
                            </div>
                        ),
                        placement: 'center',
                    },
                    {
                        target: '#new-chart-btn',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">1. Start Fresh</p>
                                <p>Begin a new analysis by clicking "Analyze New Claim" to upload your claim draft. AI will automatically extract and structure each element.</p>
                            </div>
                        ),
                        placement: 'right'
                    },
                    {
                        target: 'nav.overflow-y-auto.max-h-40', // Charts history
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">2. Project History</p>
                                <p>Seamlessly switch between multiple claim charts. All your work is saved locally in your browser for instant retrieval.</p>
                            </div>
                        ),
                        placement: 'right'
                    },
                    {
                        target: '#reference-docs-section',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">3. The Knowledge Base</p>
                                <p>Upload technical manuals, datasheets, or source URLs here. This becomes the "source of truth" the AI uses to find evidence.</p>
                            </div>
                        ),
                        placement: 'right'
                    },
                    {
                        target: '#system-prompt-container',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">4. Custom AI Guidance</p>
                                <p>Fine-tune how the AI thinks. Provide specific legal instructions or domain expertise to sharpen the analysis.</p>
                            </div>
                        ),
                        placement: 'right'
                    },
                    {
                        target: '#api-key-container',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">5. Secure AI Integration</p>
                                <p>Your data stays secure with direct Gemini API integration. Just drop your key here to activate the engine.</p>
                            </div>
                        ),
                        placement: 'right'
                    },
                    {
                        target: '#export-options',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">6. One-Click Deliverables</p>
                                <p>Export your refined charts directly to professional DOCX format, or save the full state to share with teammates.</p>
                            </div>
                        ),
                        placement: 'right'
                    },
                    {
                        target: '#main-content',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">7. Structured Evidence Grid</p>
                                <p>This is where the magic happens. A bird's-eye view of every claim element, matched evidence, and logical reasoning.</p>
                            </div>
                        ),
                        placement: 'bottom'
                    },
                    {
                        target: '#chat-pane',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">8. Interactive AI Refinement</p>
                                <p>Not happy with a logic step? Chat directly with the AI to find better proof or strengthen the language in real-time.</p>
                            </div>
                        ),
                        placement: 'left'
                    },
                    {
                        target: '#quality-dashboard-btn',
                        content: (
                            <div className="text-left text-xs">
                                <p className="font-bold mb-1">Ready for the Deep Dive?</p>
                                <p>Audit the entire chart at once to spot technical conflicts or weak points before they become liabilities.</p>
                            </div>
                        ),
                        placement: 'bottom'
                    }
                ];
        }
    };

    useEffect(() => { saveCharts(charts); }, [charts]);
    useEffect(() => {
        if (activeChartId) localStorage.setItem('lumenci_active_chart_v2', activeChartId);
    }, [activeChartId]);

    useEffect(() => {
        localStorage.setItem('lumenci_system_prompt', systemPrompt);
    }, [systemPrompt]);

    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [selectedElement?.chatHistory?.length]);

    // ── Helpers ──
    const updateChart = useCallback((chartId: string, updater: (c: Chart) => Chart) => {
        setCharts(prev => prev.map(c => c.id === chartId ? updater(c) : c));
    }, []);

    const updateElement = useCallback((chartId: string, elementId: string, updater: (el: ClaimElement) => ClaimElement) => {
        updateChart(chartId, c => ({
            ...c,
            elements: c.elements.map(el => el.id === elementId ? updater(el) : el)
        }));
    }, [updateChart]);

    const pushChatMessage = useCallback((chartId: string, elementId: string, msg: ChatMessage) => {
        updateElement(chartId, elementId, el => ({
            ...el,
            chatHistory: [...(el.chatHistory || []), msg]
        }));
    }, [updateElement]);

    const updateChatMessage = useCallback((chartId: string, elementId: string, msgIndex: number, patch: Partial<ChatMessage>) => {
        updateElement(chartId, elementId, el => ({
            ...el,
            chatHistory: el.chatHistory.map((m, i) => i === msgIndex ? { ...m, ...patch } : m)
        }));
    }, [updateElement]);

    // ── Export Chart State (JSON) ──
    const handleDownloadState = () => {
        const data = JSON.stringify(charts, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lumenci_state_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    // ── Import Chart State (JSON) ──
    const handleUploadState = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    setCharts(imported);
                    if (imported.length > 0) setActiveChartId(imported[0].id);
                    alert('State imported successfully.');
                }
            } catch {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
        if (jsonFileRef.current) jsonFileRef.current.value = '';
    };

    // ── Upload chart file ──
    const handleChartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('files', file); // Use 'files' consistent with server array upload
        if (apiKey) formData.append('apiKey', apiKey);

        try {
            const res = await api.post('/api/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'X-Gemini-API-Key': apiKey || ''
                }
            });
            const newChart: Chart = {
                id: `chart_${Date.now()}`,
                title: file.name.replace(/\.[^/.]+$/, ''),
                elements: res.data.elements,
                contextDocs: [],
                createdAt: new Date().toISOString()
            };
            setCharts(prev => [newChart, ...prev]);
            setActiveChartId(newChart.id);
            setSelectedElementId(null);
        } catch {
            alert('Failed to parse document. Please check it is a valid PDF or DOCX.');
        } finally {
            setIsUploading(false);
            if (chartFileRef.current) chartFileRef.current.value = '';
        }
    };

    // ── Upload reference/context doc ──
    const handleContextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeChartId) return;
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploadingCtx(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/api/upload-context', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            updateChart(activeChartId, c => ({
                ...c,
                contextDocs: [...c.contextDocs.filter(d => d.name !== res.data.doc.name), res.data.doc]
            }));
        } catch {
            alert('Failed to upload reference document.');
        } finally {
            setIsUploadingCtx(false);
            if (ctxFileRef.current) ctxFileRef.current.value = '';
        }
    };

    // ── Fetch content from URL ──
    const handleUrlSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeChartId || !urlInput.trim() || isFetchingUrl) return;

        setIsFetchingUrl(true);
        try {
            const res = await api.post('/api/fetch-url', { url: urlInput });
            updateChart(activeChartId, c => ({
                ...c,
                contextDocs: [...c.contextDocs.filter(d => d.name !== res.data.doc.name), res.data.doc]
            }));
            setUrlInput('');
        } catch (err: any) {
            alert(`Failed to fetch URL: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsFetchingUrl(false);
        }
    };

    // ── Deep AI Audit (LLM-as-a-Judge) ──
    const handleRunAudit = async (elementId: string) => {
        if (!activeChartId || auditingId) return;
        const el = activeChart?.elements.find(e => e.id === elementId);
        if (!el) return;

        setAuditingId(elementId);
        try {
            const res = await api.post('/api/audit', {
                element: el.element,
                evidence: el.evidence,
                reasoning: el.reasoning,
                contextDocs: activeChart?.contextDocs,
                apiKey
            }, {
                headers: { 'X-Gemini-API-Key': apiKey || '' }
            });

            updateElement(activeChartId, elementId, el => ({
                ...el,
                audit: { ...res.data.audit, lastAuditedReasoning: el.reasoning }
            }));
        } catch (err: any) {
            alert(`Audit failed: ${err.message}`);
        } finally {
            setAuditingId(null);
        }
    };

    const handleAuditStale = async () => {
        if (!elements || auditingId) return;
        const staleElements = elements.filter(el =>
            el.audit && el.reasoning !== el.audit.lastAuditedReasoning
        );
        for (const el of staleElements) {
            await handleRunAudit(el.id);
        }
    };

    const handleAuditAll = async () => {
        if (!activeChartId || elements.length === 0 || auditingId) return;

        setAuditingId('ALL'); // SPECIAL ID for all
        try {
            const res = await api.post('/api/audit-batch', {
                elements: elements.map(el => ({
                    id: el.id,
                    element: el.element,
                    evidence: el.evidence,
                    reasoning: el.reasoning
                })),
                contextDocs: activeChart?.contextDocs,
                apiKey
            }, {
                headers: { 'X-Gemini-API-Key': apiKey || '' }
            });

            if (res.data.results && Array.isArray(res.data.results)) {
                // Update elements in batch
                setCharts(prev => prev.map(c => {
                    if (c.id !== activeChartId) return c;
                    return {
                        ...c,
                        elements: c.elements.map(el => {
                            const auditResult = res.data.results.find((r: any) => r.elementId === el.id);
                            if (!auditResult) return el;
                            return {
                                ...el,
                                audit: { ...auditResult, lastAuditedReasoning: el.reasoning }
                            };
                        })
                    };
                }));
            }
        } catch (err: any) {
            console.error('Batch audit failed:', err);
            alert(`Batch audit failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setAuditingId(null);
        }
    };

    // ── AI Refine ──
    const handleRefine = async (overrideInput?: string) => {
        const trimmed = (overrideInput || chatInput).trim();
        if (!trimmed || !activeChartId) return;

        // SC-7 guard: no element selected → ask for context
        if (!selectedElementId) {
            const guardMsg: ChatMessage = {
                role: 'assistant',
                content:
                    'To add or modify a claim element, I need two things:\n\n' +
                    '1. Which element do you want to work on? Click a row in the table to select it.\n' +
                    '2. If you want to add a new element, please provide the exact patent claim language first — I cannot draft claim language independently.\n\n' +
                    'Once you select an element, I can refine its reasoning or evidence based on your uploaded reference documents.'
            };
            // Push to a "global" chat — we'll abuse element 0 or show inline
            // For now just set a temporary state message
            setChatInput('');
            alert(guardMsg.content); // simple fallback for no-element case
            return;
        }

        if (!selectedElement) return;
        const userMsg: ChatMessage = { role: 'user', content: trimmed };
        pushChatMessage(activeChartId, selectedElementId, userMsg);
        setChatInput('');
        setIsRefining(true);

        try {
            // Get the current element from state (might have changed)
            const currentEl = charts.find(c => c.id === activeChartId)?.elements.find(e => e.id === selectedElementId);
            if (!currentEl) return;

            const priorHistory = (currentEl.chatHistory || []).map(m => ({
                role: m.role,
                content: m.content
            }));

            const res = await api.post('/api/refine', {
                elementId: selectedElementId,
                element: currentEl.element,
                evidence: currentEl.evidence,
                reasoning: currentEl.reasoning,
                query: trimmed,
                contextDocs: contextDocs,
                chatHistory: priorHistory.slice(0, -1), // exclude the one we just pushed
                apiKey: apiKey,
                systemPrompt: systemPrompt
            }, {
                headers: { 'X-Gemini-API-Key': apiKey || '' }
            });

            const { refinedReasoning, refinedEvidence, confidence, flags, explanation, proposedChange, noChangeNeeded } = res.data;

            // Check for undo request
            const versionMatch = trimmed.match(/restore version v?(\d+)/i);
            const isUndoRequest = /\bundo\b|\brevert\b|\broll.?back\b/i.test(trimmed) || !!versionMatch;

            if (isUndoRequest && currentEl.versions && currentEl.versions.length > 0) {
                let targetIdx = currentEl.versions.length - 1;
                if (versionMatch) {
                    const requested = parseInt(versionMatch[1]) - 1;
                    if (requested >= 0 && requested < currentEl.versions.length) {
                        targetIdx = requested;
                    }
                }
                const targetVersion = currentEl.versions[targetIdx];
                const assistantMsg: ChatMessage = {
                    role: 'assistant',
                    content: `Here is what the rollback to version v${targetIdx + 1} (${new Date(targetVersion.timestamp).toLocaleTimeString()}) would change:`,
                    proposedChange: {
                        oldReasoning: currentEl.reasoning,
                        newReasoning: targetVersion.reasoning,
                        oldEvidence: currentEl.evidence,
                        newEvidence: targetVersion.evidence
                    },
                    status: 'pending'
                };
                pushChatMessage(activeChartId, selectedElementId, assistantMsg);
            } else if (noChangeNeeded) {
                const assistantMsg: ChatMessage = {
                    role: 'assistant',
                    content: explanation || 'This element is well-supported. No changes are needed.'
                };
                pushChatMessage(activeChartId, selectedElementId, assistantMsg);
            } else if (proposedChange && (refinedReasoning || refinedEvidence)) {
                const assistantMsg: ChatMessage = {
                    role: 'assistant',
                    content: explanation || 'Here is my proposed refinement:',
                    proposedChange: {
                        oldReasoning: currentEl.reasoning,
                        newReasoning: refinedReasoning || currentEl.reasoning,
                        oldEvidence: currentEl.evidence,
                        newEvidence: refinedEvidence || currentEl.evidence
                    },
                    status: 'pending'
                };
                pushChatMessage(activeChartId, selectedElementId, assistantMsg);

                // Temporarily store pending info for accept/reject
                // We use the message index to track — no extra state needed
            } else {
                // AI gave an explanation without proposing a change (e.g., SC-3, SC-4 Phase 1)
                const assistantMsg: ChatMessage = {
                    role: 'assistant',
                    content: explanation || 'Analysis complete.'
                };
                // If confidence/flags changed even without a proposed text change, update the element
                if (flags.length > 0 || confidence < currentEl.confidence) {
                    updateElement(activeChartId, selectedElementId, el => ({
                        ...el,
                        confidence: Math.min(el.confidence, confidence),
                        flags: [...new Set([...el.flags, ...flags])]
                    }));
                }
                pushChatMessage(activeChartId, selectedElementId, assistantMsg);
            }
        } catch (err) {
            const errMsg: ChatMessage = { role: 'assistant', content: 'AI refinement failed. Please try again.' };
            pushChatMessage(activeChartId!, selectedElementId!, errMsg);
        } finally {
            setIsRefining(false);
        }
    };

    // ── Accept proposed change from chat ──
    const handleAcceptChange = (chartId: string, elementId: string, msgIndex: number, proposal: NonNullable<ChatMessage['proposedChange']>, isUndo = false) => {
        const chart = charts.find(c => c.id === chartId);
        const el = chart?.elements.find(e => e.id === elementId);
        if (!el) return;

        // Save current as a version
        const version: ElementVersion = {
            reasoning: el.reasoning,
            evidence: el.evidence,
            confidence: el.confidence,
            flags: el.flags,
            timestamp: new Date().toISOString(),
            note: isUndo ? 'Before rollback' : 'Before refinement'
        };

        updateElement(chartId, elementId, e => ({
            ...e,
            reasoning: proposal.newReasoning || e.reasoning,
            evidence: proposal.newEvidence || e.evidence,
            versions: [...e.versions, version],
            chatHistory: e.chatHistory.map((m, i) => i === msgIndex ? { ...m, status: 'accepted' as const } : m)
        }));

        setSelectedElementId(elementId); // keep selected
        setUndoPending(null);
    };

    // ── Reject proposed change ──
    const handleRejectChange = (chartId: string, elementId: string, msgIndex: number) => {
        updateChatMessage(chartId, elementId, msgIndex, { status: 'rejected' });
        setUndoPending(null);
    };

    // ── Handle AI response feedback ──
    const handleFeedback = (elementId: string, msgIndex: number, type: 'good' | 'bad') => {
        updateChatMessage(activeChartId!, elementId, msgIndex, { feedback: type });
    };

    // ── Export ──
    const handleExportClick = () => {
        if (!activeChart) return;
        const issues = getIssues(elements);
        if (issues.length > 0) {
            setShowExportModal(true);
        } else {
            doExport();
        }
    };

    const doExport = async () => {
        if (!activeChart) return;
        setShowExportModal(false);
        setIsExporting(true);
        try {
            console.log('Starting DOCX export for:', activeChart.title);
            const res = await api.post('/api/export', {
                title: activeChart.title,
                elements: activeChart.elements
            }, {
                responseType: 'blob',
                timeout: 30000 // 30s timeout
            });

            // Robust download trigger
            const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;

            // Format filename safely
            const safeFileName = `${activeChart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;
            link.setAttribute('download', safeFileName);

            // Required for some browser safety policies
            document.body.appendChild(link);
            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log('DOCX export completed & link cleaned up');
            }, 100);

        } catch (err) {
            console.error('Export failed:', err);
            alert('Export failed. Please check your connection and try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const handleDemoLoad = async (selectedPath: DemoPath = 'overview', shouldRunTour = true) => {
        setIsDemoLoading(true);
        try {
            // Realistic demo data based on User Request
            const demoElements: ClaimElement[] = [
                {
                    id: '1.a',
                    element: 'A temperature control device with a wireless communication module.',
                    evidence: 'Acme Thermostat product page states: "WiFi-enabled smart thermostat connects to your home network"',
                    reasoning: "The Acme device has WiFi capability which satisfies the wireless communication module requirement.",
                    confidence: 98, flags: [], versions: [], chatHistory: []
                },
                {
                    id: '1.b',
                    element: 'A motion sensor for detecting occupancy.',
                    evidence: 'Acme technical specifications document shows: "Built-in motion sensor detects when people are home"',
                    reasoning: "Motion sensor explicitly mentioned in specs directly maps to the claim element for occupancy detection.",
                    confidence: 95, flags: [], versions: [], chatHistory: []
                },
                {
                    id: '1.e',
                    element: 'Conflict Management logic for multi-state inputs.',
                    evidence: 'Acme technical docs say "Conflict Resolution V1.2", but marketing says "Automatic Sync".',
                    reasoning: "The technical documentation and marketing materials use different terminology which suggests potential conflict in logic implementation.",
                    confidence: 45, flags: ['Potential documentation conflict detected'], versions: [], chatHistory: []
                }
            ];

            const demoChart: Chart = {
                id: 'demo-chart',
                title: 'Demo Claim Chart',
                elements: demoElements,
                contextDocs: [
                    { name: 'Acme_Thermostat_Specs.pdf', text: 'Acme Thermostat supports 2.4GHz WiFi and has a PIR sensor for motion detection.' }
                ],
                createdAt: new Date().toISOString()
            };

            setCharts(prev => {
                const filtered = prev.filter(c => c.id !== 'demo-chart');
                return [demoChart, ...filtered];
            });
            setActiveChartId('demo-chart');
            setSelectedElementId(null);
            setDemoPath(selectedPath);
            setShowDemoSelector(false);
            if (shouldRunTour) {
                setTimeout(() => setRunTour(true), 500);
            }
        } catch (err) {
            console.error('Demo load failed:', err);
            alert('Failed to load demo.');
        } finally {
            setIsDemoLoading(false);
        }
    };

    const handleAddNewElement = () => {
        if (!activeChartId) return;
        const newIdNum = elements.length + 1;
        const newElement: ClaimElement = {
            id: `${newIdNum}`,
            element: 'Double click to edit claim element...',
            evidence: '',
            reasoning: '',
            confidence: 100,
            flags: [],
            versions: [],
            chatHistory: []
        };

        updateChart(activeChartId, c => ({
            ...c,
            elements: [...c.elements, newElement]
        }));
        setSelectedElementId(newElement.id);
    };

    const handleDeleteChart = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updated = charts.filter(c => c.id !== id);
        setCharts(updated);
        if (activeChartId === id) {
            setActiveChartId(updated[0]?.id ?? null);
            setSelectedElementId(null);
        }
    };

    const handleRemoveContextDoc = (name: string) => {
        if (!activeChartId) return;
        updateChart(activeChartId, c => ({ ...c, contextDocs: c.contextDocs.filter(d => d.name !== name) }));
    };

    // ─────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────
    return (
        <div className="flex h-screen w-full bg-white overflow-hidden text-[#37352f] flex-col">

            {/* Storage banner */}
            {!bannerDismissed && (
                <div className="flex items-center gap-3 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs shrink-0">
                    <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                    <span>
                        <strong>Data is stored in this browser only.</strong> Clearing browser data will delete your charts.
                        Export important work as DOCX.
                    </span>
                    <button onClick={() => { setBannerDismissed(true); localStorage.setItem('lumenci_banner_v2', 'true'); }}
                        className="ml-auto p-1 hover:bg-amber-100 rounded"><X size={13} /></button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden">
                {/* ── Sidebar ── */}
                <div className={`${sidebarOpen ? 'w-64' : 'w-12'} bg-[#f7f7f5] border-r border-[#e1e1e0] transition-all duration-300 flex flex-col relative shrink-0`}>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="absolute -right-3 top-4 bg-white border border-[#e1e1e0] rounded-full p-1 hover:bg-[#efefed] z-10">
                        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {sidebarOpen && (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Header: Logo & New Chart */}
                            <div className="p-4 border-b border-[#e1e1e0] bg-white space-y-3 shrink-0">
                                <div className="flex items-center gap-2 px-1">
                                    <div className="w-6 h-6 bg-[#37352f] rounded flex items-center justify-center">
                                        <Layout size={14} className="text-white" />
                                    </div>
                                    <span className="font-bold text-sm tracking-tight text-[#37352f]">Lumenci AI</span>
                                </div>
                                <button
                                    id="new-chart-btn"
                                    onClick={() => { setActiveChartId(null); setSelectedElementId(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-[#e1e1e0] text-[#37352f] rounded-lg hover:bg-[#efefed] transition-all text-xs font-semibold shadow-sm group"
                                >
                                    <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300" />
                                    New Chart
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
                                {/* Section: Charts */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-2">
                                        <label className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider">Project Charts</label>
                                        <span className="text-[9px] text-[#b0ada7] font-medium bg-[#efefed] px-1.5 rounded-full">{charts.length}</span>
                                    </div>
                                    <nav className="space-y-1 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                                        {charts.length === 0 ? (
                                            <div className="px-3 py-4 text-[11px] text-[#b0ada7] border border-dashed border-[#e1e1e0] rounded-xl text-center bg-white/50">
                                                No charts started.
                                            </div>
                                        ) : (
                                            charts.map(chart => (
                                                <div
                                                    key={chart.id}
                                                    onClick={() => {
                                                        setActiveChartId(chart.id);
                                                        setSelectedElementId(null);
                                                    }}
                                                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-[11px] cursor-pointer group transition-all duration-200 border
                                                        ${activeChartId === chart.id
                                                            ? 'bg-white text-[#37352f] font-semibold shadow-sm border-[#e1e1e0]'
                                                            : 'text-[#7a776e] hover:bg-[#efefed]/80 hover:text-[#37352f] border-transparent'}`}
                                                >
                                                    <div className={`p-1 rounded-md ${activeChartId === chart.id ? 'bg-[#37352f]/5 text-[#37352f]' : 'bg-transparent text-[#b0ada7]'}`}>
                                                        <FileText size={13} />
                                                    </div>
                                                    <span className="truncate flex-1">{chart.title}</span>
                                                    {activeChartId === chart.id && (
                                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setCharts(prev => prev.filter(c => c.id !== chart.id)); if (activeChartId === chart.id) setActiveChartId(null); }}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 hover:text-red-500 rounded-md transition-all"
                                                        title="Delete chart"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </nav>
                                </div>

                                {/* Section: Reference Docs */}
                                <div id="reference-docs-section" className="space-y-3 pt-4 border-t border-[#e1e1e0]/60">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                                                <BookOpen size={13} />
                                            </div>
                                            <span className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider">Reference Case</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            {isDemoChart && (
                                                <button onClick={() => handleDemoLoad('overview', false)}
                                                    className="p-1 text-[#7a776e] hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                                    title="Reset demo data">
                                                    <RotateCcw size={12} />
                                                </button>
                                            )}
                                            <button onClick={() => setIsAddRefModalOpen(true)}
                                                className="p-1 text-[#7a776e] hover:text-green-600 hover:bg-green-50 rounded-md transition-all"
                                                title="Add reference document">
                                                {isUploadingCtx ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* URL Input Form - More subtle */}
                                    <form onSubmit={handleUrlSubmit} className="px-2">
                                        <div className="relative group/url">
                                            <input
                                                type="url"
                                                placeholder="Fetch evidence from URL..."
                                                value={urlInput}
                                                onChange={e => setUrlInput(e.target.value)}
                                                className="w-full pl-2.5 pr-8 py-2 border border-[#e1e1e0] rounded-xl text-[10px] focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none bg-white transition-all group-hover/url:border-[#d1d1cf]"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!urlInput.trim() || isFetchingUrl}
                                                className="absolute right-1 text-blue-500 hover:text-blue-700 disabled:opacity-30 transition-colors bg-blue-50 p-1.5 rounded-lg"
                                                style={{ top: '50%', transform: 'translateY(-50%)' }}
                                            >
                                                {isFetchingUrl ? <Loader2 size={12} className="animate-spin" /> : <Send size={11} />}
                                            </button>
                                        </div>
                                    </form>

                                    <nav className="overflow-y-auto space-y-1 max-h-[160px] pr-1 custom-scrollbar px-1">
                                        {contextDocs.length === 0
                                            ? (
                                                <div className="px-4 py-3 text-[10px] text-[#b0ada7] text-center leading-relaxed bg-[#fcfcfb] rounded-xl border border-[#efefed]">
                                                    Add support evidence to <br /> strengthen AI reasoning.
                                                </div>
                                            )
                                            : contextDocs.map(doc => (
                                                <div key={doc.name}
                                                    className="flex items-center gap-2.5 p-2 rounded-xl text-[11px] group hover:bg-white border border-transparent hover:border-[#e1e1e0] hover:shadow-sm transition-all duration-200">
                                                    <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                                                        <FileText size={12} />
                                                    </div>
                                                    <span className="truncate flex-1 text-[#37352f] font-medium">{doc.name}</span>
                                                    <button onClick={() => handleRemoveContextDoc(doc.name)}
                                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-[#b0ada7] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                    </nav>
                                </div>
                            </div>

                            {/* Bottom actions refined */}
                            <div className="mt-auto p-4 bg-white border-t border-[#e1e1e0] space-y-5 rounded-t-xl shadow-[0_-4px_12px_rgba(0,0,0,0.01)] shrink-0 relative z-20">
                                <div id="system-prompt-container" className="space-y-1.5 relative group">
                                    <div className="flex items-center gap-1.5 px-1">
                                        <label className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider">System Instructions</label>
                                        <div className="group/tip relative translate-y-[-1px]">
                                            <Info size={11} className="text-[#b0ada7] hover:text-[#37352f] cursor-help transition-colors" />
                                            <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-[#37352f] text-white text-[10px] rounded-xl opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity z-[100] shadow-2xl leading-relaxed border border-white/10 backdrop-blur-md">
                                                <div className="font-bold mb-1 opacity-60 uppercase text-[8px] tracking-widest text-blue-300">AI Personality Settings</div>
                                                In the sidebar, you can tell the AI how to think.
                                                <div className="mt-2 space-y-2 border-t border-white/10 pt-2">
                                                    <div>
                                                        <span className="text-blue-300 font-bold">Patent Attorney?</span><br />
                                                        Type: <span className="opacity-80 italic">"Be very formal and look for literal infringement."</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-amber-300 font-bold">Electrical Engineer?</span><br />
                                                        Type: <span className="opacity-80 italic">"Focus only on hardware specs and circuit details."</span>
                                                    </div>
                                                </div>
                                                <div className="absolute top-full left-2 border-4 border-transparent border-t-[#37352f]"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <textarea
                                        placeholder="Expert legal analyst..."
                                        value={systemPrompt}
                                        onChange={(e) => setSystemPrompt(e.target.value)}
                                        className="w-full px-2.5 py-2 border border-[#e1e1e0] rounded-lg text-[10px] focus:ring-2 focus:ring-[#37352f]/10 focus:border-[#37352f] outline-none bg-[#fcfcfb] min-h-[70px] resize-none transition-all placeholder:text-[#b0ada7]"
                                    />
                                </div>

                                <form id="api-key-container" className="space-y-1.5" onSubmit={(e) => { e.preventDefault(); handleValidateKey(); }}>
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-1.5">
                                            <label className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider">Gemini API Key</label>
                                            {keyValidationStatus === 'success' && <Check size={10} className="text-green-600" />}
                                            {keyValidationStatus === 'error' && <AlertTriangle size={10} className="text-red-500" />}
                                        </div>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                                            className="text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                            Get Key
                                        </a>
                                    </div>
                                    <div className="relative group flex gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                id="api-key-input"
                                                type="password"
                                                autoComplete="new-password"
                                                placeholder="AIzaSy..."
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                className={`w-full pl-7 pr-2.5 py-2 border rounded-xl text-[10px] focus:ring-2 focus:ring-[#37352f]/10 focus:border-[#37352f] outline-none bg-[#fcfcfb] transition-all
                                                    ${keyValidationStatus === 'success' ? 'border-green-200 bg-green-50/10' :
                                                        keyValidationStatus === 'error' ? 'border-red-200 bg-red-50/10' : 'border-[#e1e1e0]'}`}
                                            />
                                            <ShieldCheck size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors
                                                ${keyValidationStatus === 'success' ? 'text-green-500' :
                                                    keyValidationStatus === 'error' ? 'text-red-500' : 'text-[#b0ada7] group-focus-within:text-[#37352f]'}`} />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleValidateKey}
                                            disabled={!apiKey.trim() || isValidatingKey}
                                            className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border
                                                ${keyValidationStatus === 'success' ? 'bg-green-600 border-green-600 text-white' :
                                                    keyValidationStatus === 'error' ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' :
                                                        'bg-white border-[#e1e1e0] text-[#37352f] hover:bg-[#f7f7f5]'}`}
                                        >
                                            {isValidatingKey ? <Loader2 size={12} className="animate-spin" /> :
                                                keyValidationStatus === 'success' ? 'Verified' : 'Validate'}
                                        </button>
                                    </div>
                                    {keyValidationStatus === 'error' && (
                                        <p className="text-[9px] text-red-500 px-1 font-medium">Invalid key or server unreachable</p>
                                    )}
                                </form>

                                <div id="export-options" className="space-y-3 pt-1">
                                    <label className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider px-1">Project Actions</label>
                                    <div className="space-y-2">
                                        <button onClick={() => chartFileRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 p-2.5 bg-[#37352f] text-white rounded-xl hover:bg-[#2c2a26] transition-all text-xs font-bold active:scale-[0.98]">
                                            <Upload size={14} /> Analyze New Claim
                                        </button>
                                        <button onClick={handleExportClick}
                                            disabled={!activeChart}
                                            className={`w-full flex items-center justify-center gap-2 p-2.5 bg-white border border-[#e1e1e0] text-[#37352f] rounded-xl hover:bg-[#f7f7f5] transition-all text-xs font-bold active:scale-[0.98]
                                                ${!activeChart ? 'opacity-40 cursor-not-allowed border-dashed grayscale' : ''}`}>
                                            {isExporting ? <Loader2 size={14} className="animate-spin text-[#7a776e]" /> : <Download size={14} />}
                                            Export DOCX
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Main ── */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    <header className="h-12 border-b border-[#e1e1e0] flex items-center justify-between px-4 bg-white/80 backdrop-blur-sm z-10 shrink-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-[#7a776e]">
                            <span>Charts</span>
                            <span>/</span>
                            <span className="text-[#37352f]">{activeChart?.title ?? 'New Chart'}</span>
                            {selectedElement && (
                                <>
                                    <span>/</span>
                                    <span className="font-mono text-[#37352f]">{selectedElement.id}</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Original Demo Load Button */}
                            <button
                                id="demo-btn"
                                onClick={() => handleDemoLoad('overview', false)}
                                disabled={isDemoLoading}
                                title="Load sample Acme Corp case study (no tour)"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                                {isDemoLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Sample Data
                            </button>

                            {/* Scenario Walkthrough Selector */}
                            <button
                                onClick={() => { setRunTour(false); setShowDemoSelector(true); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7f7f5] border border-[#e1e1e0] text-[#37352f] rounded-lg text-xs font-bold hover:bg-[#efefed] transition-colors"
                            >
                                <Play size={14} fill="currentColor" /> Interactive Demo
                            </button>

                            <button
                                id="quality-dashboard-btn"
                                onClick={() => setIsQualityViewOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-medium hover:purple-100 transition-colors"
                            >
                                <ShieldCheck size={14} /> Quality Dashboard
                            </button>
                            <button onClick={() => setChatOpen(!chatOpen)}
                                id="chat-toggle"
                                className={`p-1.5 rounded hover:bg-[#efefed] ${chatOpen ? 'text-[#37352f]' : 'text-[#7a776e]'}`}>
                                <MessageSquare size={18} />
                            </button>
                        </div>
                    </header>

                    <main id="main-content" className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold mb-1">{activeChart ? activeChart.title : 'Claim Chart Refinement'}</h1>
                            <p className="text-[#7a776e] text-sm">
                                {activeChart
                                    ? `${elements.length} elements · ${contextDocs.length} reference doc${contextDocs.length !== 1 ? 's' : ''} loaded`
                                    : 'Upload a claim chart to get started.'}
                            </p>
                        </div>

                        {elements.length > 0 ? (
                            <div className="border border-[#e1e1e0] rounded-xl bg-white overflow-hidden">
                                <ClaimTable
                                    elements={elements}
                                    onSelectElement={el => setSelectedElementId(el.id)}
                                    onAddElement={handleAddNewElement}
                                    selectedId={selectedElementId}
                                />
                            </div>
                        ) : (
                            <div className="border border-[#e1e1e0] rounded-lg p-10 bg-white flex flex-col items-center justify-center text-center">
                                <div className="bg-[#f7f7f5] p-4 rounded-full mb-4">
                                    {isUploading ? <Loader2 size={32} className="text-[#37352f] animate-spin" /> : <Upload size={32} className="text-[#7a776e]" />}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">
                                    {isUploading ? 'Analyzing new claim...' : 'Analyze a new claim'}
                                </h3>
                                <p className="text-[#7a776e] text-sm mb-6 max-w-sm">
                                    {isUploading ? 'Gemini AI is extracting claim elements into a structured grid.' : 'Upload a PDF or DOCX patent claim chart to start. (Tip: Check the Test/ folder for sample documents).'}
                                </p>
                                <button onClick={() => chartFileRef.current?.click()} disabled={isUploading}
                                    className="bg-[#37352f] text-white px-5 py-2 rounded font-medium text-sm hover:opacity-90 disabled:opacity-50">
                                    {isUploading ? 'Processing...' : 'Upload Claim PDF/DOCX'}
                                </button>
                            </div>
                        )}
                    </main>

                    <AddReferenceModal
                        isOpen={isAddRefModalOpen}
                        onClose={() => setIsAddRefModalOpen(false)}
                        onUploadFile={async (file) => {
                            // Manual file injection to trigger existing handler
                            handleContextUpload({ target: { files: [file] } } as any);
                        }}
                        onAddUrl={async (url) => {
                            try {
                                const res = await api.post('/api/fetch-url', { url });
                                if (res.data.doc) {
                                    setCharts(prev => prev.map(c => c.id === activeChartId
                                        ? { ...c, contextDocs: [...c.contextDocs, res.data.doc] }
                                        : c
                                    ));
                                }
                            } catch (err) {
                                console.error('URL fetch error:', err);
                                throw err;
                            }
                        }}
                        onAddText={(name, text) => {
                            setCharts(prev => prev.map(c => c.id === activeChartId
                                ? { ...c, contextDocs: [...c.contextDocs, { name, text }] }
                                : c
                            ));
                        }}
                    />
                </div>

                {/* ── Chat Pane ── */}
                {chatOpen && (
                    <div id="chat-pane" className="w-80 border-l border-[#e1e1e0] bg-white flex flex-col h-full z-20 shrink-0">
                        {/* Chat header */}
                        <div className="p-3 border-b border-[#e1e1e0] flex items-center justify-between bg-[#f7f7f5] shrink-0">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={14} />
                                <span className="font-semibold text-xs">Lumenci Chat</span>
                                {selectedElement && (
                                    <span className="font-mono text-[10px] bg-[#e1e1e0] px-1.5 py-0.5 rounded-lg">
                                        {selectedElement.id}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={handleDownloadState}
                                    disabled={!activeChart}
                                    title="Export current chart state as JSON"
                                    className="p-1 hover:bg-[#efefed] rounded text-[#7a776e] hover:text-[#37352f] disabled:opacity-30">
                                    <Download size={14} />
                                </button>
                                <button onClick={() => jsonFileRef.current?.click()}
                                    title="Import a previously exported chart JSON"
                                    className="p-1 hover:bg-[#efefed] rounded text-[#7a776e] hover:text-[#37352f]">
                                    <Upload size={14} />
                                </button>
                                {selectedElement && selectedElement.versions && selectedElement.versions.length > 0 && (
                                    <button
                                        onClick={() => handleRefine('Undo the last change.')}
                                        title="Undo last change"
                                        className="p-1 hover:bg-[#efefed] rounded text-[#7a776e] hover:text-[#37352f]">
                                        <RotateCcw size={13} />
                                    </button>
                                )}
                                <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-[#efefed] rounded">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* Version history strip */}
                        {selectedElement && selectedElement.versions && selectedElement.versions.length > 0 && (
                            <div className="px-3 py-2 border-b border-[#e1e1e0] bg-[#fafaff] shrink-0">
                                <div className="flex items-center gap-1 mb-1">
                                    <History size={10} className="text-[#7a776e]" />
                                    <span className="text-[9px] font-semibold text-[#7a776e] uppercase tracking-wider">
                                        Version history ({selectedElement.versions.length} saved)
                                    </span>
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                                    {selectedElement.versions.map((v, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleRefine(`Restore version v${i + 1}`)}
                                            className="w-full text-left text-[10px] text-[#7a776e] flex gap-2 p-1 hover:bg-[#efefed] rounded group transition-colors">
                                            <span className="text-[#b0ada7] font-mono">v{i + 1}</span>
                                            <span className="flex-1 truncate">{v.note}</span>
                                            <span className="opacity-0 group-hover:opacity-100 text-blue-600 font-medium">Restore</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Confidence + flags strip */}
                        {selectedElement && (
                            <div className="px-3 py-2 border-b border-[#e1e1e0] bg-[#f7f7f5] shrink-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-semibold text-[#7a776e] uppercase tracking-wider">
                                        Element {selectedElement.id}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded
                                        ${selectedElement.confidence >= 80 ? 'bg-green-100 text-green-700'
                                            : selectedElement.confidence >= 50 ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-red-100 text-red-700'}`}>
                                        {selectedElement.confidence}% confidence
                                    </span>
                                </div>
                                <p className="text-[11px] text-[#37352f] line-clamp-2">{selectedElement.element}</p>
                                {selectedElement.flags && selectedElement.flags.length > 0 && (
                                    <div className="mt-1.5 space-y-0.5">
                                        {selectedElement.flags.map((f, i) => (
                                            <div key={i} className="flex items-start gap-1 text-[10px] text-red-600">
                                                <span className="shrink-0">⚑</span><span>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Chat messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {!selectedElement ? (
                                <div className="bg-[#f7f7f5] p-4 rounded-lg text-xs border border-[#e1e1e0] text-center text-[#7a776e]">
                                    Select a claim element in the table to start refining with AI.
                                    {contextDocs.length === 0 && activeChart && (
                                        <p className="mt-2 text-amber-600">
                                            ⚠ No reference docs uploaded — AI will have no external context to cite.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Initial prompt if no history */}
                                    {(!selectedElement.chatHistory || selectedElement.chatHistory.length === 0) && (
                                        <div className="bg-[#37352f] text-white p-3 rounded-xl text-xs">
                                            I'm ready to work on element <strong>{selectedElement.id}</strong>.
                                            {contextDocs.length > 0
                                                ? ` I can reference: ${contextDocs.map(d => d.name).join(', ')}.`
                                                : ' No reference docs uploaded — add some for me to cite specific sections.'}
                                            {' '}What would you like to review or strengthen?
                                        </div>
                                    )}

                                    {/* Chat history */}
                                    {(selectedElement.chatHistory || []).map((msg, idx) => {
                                        const isPending = msg.status === 'pending' && msg.proposedChange;
                                        return (
                                            <ChatBubble
                                                key={idx}
                                                msg={msg}
                                                onAccept={isPending ? () => handleAcceptChange(
                                                    activeChartId!, selectedElementId!, idx, msg.proposedChange!,
                                                    /undo|revert|rollback/i.test(msg.content)
                                                ) : undefined}
                                                onReject={isPending ? () => handleRejectChange(activeChartId!, selectedElementId!, idx) : undefined}
                                                onFeedback={(type) => handleFeedback(selectedElementId!, idx, type)}
                                            />
                                        );
                                    })}

                                    {isRefining && (
                                        <div className="flex items-center gap-2 text-[#7a776e] text-xs">
                                            <Loader2 size={12} className="animate-spin" />
                                            Gemini is thinking...
                                        </div>
                                    )}
                                    <div ref={chatBottomRef} />
                                </>
                            )}
                        </div>

                        {/* Suggestions */}
                        {selectedElement && !isRefining && (
                            <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                                {(() => {
                                    const suggestions: string[] = [];
                                    const hasContext = contextDocs.length > 0;
                                    const isLowConf = selectedElement.confidence < 50;
                                    const hasFlags = selectedElement.flags && selectedElement.flags.length > 0;
                                    const isMissing = !selectedElement.evidence || selectedElement.evidence.trim() === '';

                                    if (isMissing) {
                                        suggestions.push("Search all docs for proof");
                                        suggestions.push("Draft 'missing evidence' note");
                                    } else if (hasFlags && selectedElement.flags.some(f => f.toLowerCase().includes('conflict'))) {
                                        suggestions.push("Analyze the conflict");
                                        suggestions.push("Check latest source");
                                    } else if (isLowConf) {
                                        suggestions.push("Find better evidence");
                                        suggestions.push("Strengthen reasoning");
                                    } else {
                                        suggestions.push("Verify literal match");
                                        suggestions.push("Draft technical summary");
                                    }

                                    if (hasContext && !isMissing) {
                                        suggestions.push(`Cross-ref with ${contextDocs[0].name.split('.')[0]}`);
                                    }

                                    return suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleRefine(s)}
                                            className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ));
                                })()}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-3 border-t border-[#e1e1e0] shrink-0">
                            <div className="relative">
                                <textarea
                                    placeholder={selectedElement
                                        ? `Ask about ${selectedElement.id}... (Enter to send, Shift+Enter for newline)`
                                        : 'Select an element first...'}
                                    disabled={isRefining}
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleRefine();
                                        }
                                    }}
                                    className="w-full border border-[#e1e1e0] rounded-lg p-2.5 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-[#37352f] resize-none disabled:bg-[#f7f7f5] disabled:cursor-not-allowed"
                                    rows={3}
                                />
                                <button onClick={() => handleRefine()}
                                    disabled={!chatInput.trim() || isRefining}
                                    className="absolute right-2.5 bottom-2.5 text-white bg-[#37352f] rounded-md p-1.5 hover:opacity-90 disabled:opacity-30">
                                    {isRefining ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Overlays ── */}
            <QualityScorecard
                isOpen={isQualityViewOpen}
                onClose={() => setIsQualityViewOpen(false)}
                elements={elements}
                onRunAudit={handleRunAudit}
                onAuditStale={handleAuditStale}
                onAuditAll={handleAuditAll}
                isAuditing={auditingId}
            />

            {/* Hidden inputs */}
            <input type="file" ref={chartFileRef} onChange={handleChartUpload} className="hidden" accept=".pdf,.docx" />
            <input type="file" ref={ctxFileRef} onChange={handleContextUpload} className="hidden" accept=".pdf,.docx" />
            <input type="file" ref={jsonFileRef} onChange={handleUploadState} className="hidden" accept=".json" />

            {
                !chatOpen && (
                    <button onClick={() => setChatOpen(true)}
                        className="absolute bottom-6 right-6 bg-[#37352f] text-white p-3 rounded-xl border border-[#37352f] transition-all z-30 active:scale-95">
                        <MessageSquare size={22} />
                    </button>
                )
            }

            {/* Export Warning Modal */}
            {
                showExportModal && activeChart && (
                    <ExportWarningModal
                        elements={elements}
                        onExportAnyway={doExport}
                        onCancel={() => setShowExportModal(false)}
                    />
                )
            }

            <Joyride
                steps={getTourSteps()}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                styles={{
                    options: {
                        primaryColor: '#37352f',
                        zIndex: 1000,
                    },
                }}
                callback={(data) => {
                    const { status } = data;
                    if (status === 'finished' || status === 'skipped') {
                        setRunTour(false);
                        // Return to demo selector after tour
                        if (activeChartId === 'demo-chart') {
                            setShowDemoSelector(true);
                        }
                    }
                }}
            />

            <DemoSelectorModal
                isOpen={showDemoSelector}
                onClose={() => {
                    setShowDemoSelector(false);
                    setRunTour(false);
                }}
                onSelectDemo={(path) => handleDemoLoad(path, true)}
            />
        </div>
    );
};

export default Dashboard;
