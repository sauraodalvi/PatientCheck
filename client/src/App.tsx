import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Layout, FileText, Upload, MessageSquare, Download, ChevronLeft,
    ChevronRight, X, Loader2, AlertTriangle, Plus, Trash2, BookOpen,
    RotateCcw, Check, Ban, Send, History, RefreshCw
} from 'lucide-react';
import ClaimTable, { ClaimElement, ChatMessage, ElementVersion } from './components/ClaimTable';
import DiffView from './components/DiffView';
import ExportWarningModal, { getIssues } from './components/ExportWarningModal';
import axios from 'axios';
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
}> = ({ msg, onAccept, onReject }) => {
    const isUser = msg.role === 'user';
    return (
        <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap
                ${isUser
                    ? 'bg-[#37352f] text-white rounded-br-sm'
                    : 'bg-[#f2f1ee] text-[#37352f] rounded-bl-sm border border-[#e1e1e0]'}`}>
                {msg.content}
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
// App
// ─────────────────────────────────────────────
const App: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [chatOpen, setChatOpen] = useState(true);
    const [charts, setCharts] = useState<Chart[]>(loadCharts);
    const [activeChartId, setActiveChartId] = useState<string | null>(() => localStorage.getItem('lumenci_active_chart_v2') || loadCharts()[0]?.id || null);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingCtx, setIsUploadingCtx] = useState(false);
    const [isRefining, setIsRefining] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [showExportModal, setShowExportModal] = useState(false);
    const [undoPending, setUndoPending] = useState<{ elementId: string; version: ElementVersion } | null>(null);
    const [bannerDismissed, setBannerDismissed] = useState(() =>
        localStorage.getItem('lumenci_banner_v2') === 'true'
    );
    const [apiKey, setApiKey] = useState(localStorage.getItem('lumenci_gemini_key') || '');
    const [runTour, setRunTour] = useState(false);

    const chartFileRef = useRef<HTMLInputElement>(null);
    const ctxFileRef = useRef<HTMLInputElement>(null);
    const jsonFileRef = useRef<HTMLInputElement>(null);
    const chatBottomRef = useRef<HTMLDivElement>(null);

    const activeChart = charts.find(c => c.id === activeChartId) ?? null;
    const elements = activeChart?.elements ?? [];
    const contextDocs = activeChart?.contextDocs ?? [];
    const selectedElement = elements.find(e => e.id === selectedElementId) ?? null;

    const isDemoChart = activeChart?.title === 'Demo Claim Chart';
    const tourSteps: Step[] = !isDemoChart ? [
        {
            target: 'body',
            content: (
                <div className="text-left">
                    <p className="font-bold mb-1">Welcome! 👋</p>
                    <p>Let's show you how to use this app in 1 minute.</p>
                </div>
            ),
            placement: 'center',
        },
        {
            target: '#api-key-container',
            content: 'Step 1: Put your AI key here so the brain works.',
            placement: 'right',
        },
        {
            target: '#new-chart-btn',
            content: 'Step 2: Upload your first document here.',
            placement: 'right',
        },
        {
            target: '#reference-docs-section',
            content: 'Step 3: Add extra documents here to help the AI find better proof.',
            placement: 'right',
        },
        {
            target: '#main-content',
            content: 'Step 4: Your results show up here. Click a row to talk about it.',
            placement: 'bottom',
        },
        {
            target: '#chat-pane',
            content: 'Step 5: Use this chat to fix errors or find better evidence.',
            placement: 'left',
        },
        {
            target: '#export-options',
            content: 'Step 6: When done, save your work as a file here.',
            placement: 'top',
        },
    ] : [
        {
            target: 'body',
            content: (
                <div className="text-left">
                    <p className="font-bold mb-1">Demo: NexaTherm Thermostat</p>
                    <p>We loaded a sample for you. Let's see how the AI grades the evidence.</p>
                </div>
            ),
            placement: 'center',
        },
        {
            target: '#claim-row-1-a',
            content: (
                <div className="text-left text-xs">
                    <p className="font-bold text-green-600 mb-1">Case 1: The GOOD</p>
                    <p>Row 1.a is green because we found the proof. It matches the claim perfectly!</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#claim-row-1-b',
            content: (
                <div className="text-left text-xs">
                    <p className="font-bold text-yellow-600 mb-1">Case 2: The OKAY</p>
                    <p>Row 1.b is yellow. The AI found something similar but isn't 100% sure yet. We need to check it.</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#claim-row-1-e',
            content: (
                <div className="text-left text-xs">
                    <p className="font-bold text-red-600 mb-1">Case 3: The WEIRD</p>
                    <p>Row 1.e is orange. Two documents say different things! The AI is warning you about a conflict.</p>
                </div>
            ),
            placement: 'bottom',
        },
        {
            target: '#chat-pane',
            content: 'Click row 1.b and type "Double check the wireless protocol" to see the AI fix it!',
            placement: 'left',
        },
    ];

    useEffect(() => { saveCharts(charts); }, [charts]);
    useEffect(() => {
        if (activeChartId) localStorage.setItem('lumenci_active_chart_v2', activeChartId);
    }, [activeChartId]);
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
            const res = await axios.post('/api/upload', formData, {
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
            const res = await axios.post('/api/upload-context', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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

            const res = await axios.post('/api/refine', {
                elementId: selectedElementId,
                element: currentEl.element,
                evidence: currentEl.evidence,
                reasoning: currentEl.reasoning,
                query: trimmed,
                contextDocs: contextDocs,
                chatHistory: priorHistory.slice(0, -1), // exclude the one we just pushed
                apiKey: apiKey
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
            const res = await axios.post('/api/export', {
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

    const handleDemoLoad = async () => {
        setIsUploading(true);
        try {
            // Use the specialized test-inject route for perfect demo data
            const res = await axios.post('/api/test-inject');

            const newChart: Chart = {
                id: `demo_${Date.now()}`,
                title: 'Demo Claim Chart',
                elements: res.data.elements,
                contextDocs: [],
                createdAt: new Date().toISOString()
            };

            setCharts(prev => [newChart, ...prev]);
            setActiveChartId(newChart.id);
            setSelectedElementId(null);
            setRunTour(true);
        } catch (err) {
            console.error('Demo load failed:', err);
            alert('Failed to load demo document.');
        } finally {
            setIsUploading(false);
        }
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
            <Joyride
                steps={tourSteps}
                run={runTour}
                continuous
                showProgress
                showSkipButton
                callback={(data) => {
                    const { status } = data;
                    if (status === 'finished' || status === 'skipped') {
                        setRunTour(false);
                    }
                }}
                styles={{
                    options: {
                        primaryColor: '#37352f',
                        zIndex: 1000,
                    },
                    tooltipContainer: {
                        textAlign: 'left',
                    },
                    buttonBack: {
                        marginRight: 10,
                        fontSize: '12px',
                        color: '#7a776e',
                    },
                    buttonNext: {
                        fontSize: '12px',
                        borderRadius: '4px',
                    },
                    buttonSkip: {
                        fontSize: '12px',
                        color: '#7a776e',
                    },
                }}
            />

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
                        <div className="p-4 flex flex-col h-full overflow-hidden gap-3">
                            {/* Logo */}
                            <div className="flex items-center gap-2 px-2">
                                <div className="bg-[#37352f] text-white p-1.5 rounded"><Layout size={16} /></div>
                                <span className="font-semibold text-sm">Lumenci AI</span>
                            </div>

                            {/* New Chart */}
                            <button id="new-chart-btn" onClick={() => { setActiveChartId(null); setSelectedElementId(null); chartFileRef.current?.click(); }}
                                className="flex items-center gap-2 p-2 bg-[#37352f] text-white rounded text-xs font-medium hover:opacity-90">
                                <Plus size={13} /> New Chart
                            </button>

                            {/* Chart History */}
                            <div>
                                <div className="flex items-center gap-1 px-1 mb-1">
                                    <History size={11} className="text-[#7a776e]" />
                                    <span className="text-[10px] font-semibold text-[#7a776e] uppercase tracking-wider">Charts</span>
                                </div>
                                <nav className="overflow-y-auto max-h-40 space-y-0.5">
                                    {charts.length === 0
                                        ? <p className="px-2 py-2 text-[11px] text-[#b0ada7]">No charts yet.</p>
                                        : charts.map(chart => (
                                            <div key={chart.id} onClick={() => { setActiveChartId(chart.id); setSelectedElementId(null); }}
                                                className={`flex items-center gap-1.5 p-2 rounded cursor-pointer text-xs group
                                                    ${activeChartId === chart.id ? 'bg-[#e8e8e5] font-medium' : 'hover:bg-[#efefed]'}`}>
                                                <FileText size={12} className="shrink-0 text-[#7a776e]" />
                                                <span className="truncate flex-1">{chart.title}</span>
                                                <button onClick={(e) => handleDeleteChart(chart.id, e)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500">
                                                    <Trash2 size={11} />
                                                </button>
                                            </div>
                                        ))}
                                </nav>
                            </div>

                            {/* Context Docs (only when a chart is active) */}
                            <div id="reference-docs-section" className="flex-1 min-h-0 flex flex-col">
                                <div className="flex items-center justify-between px-1 mb-1">
                                    <div className="flex items-center gap-1">
                                        <BookOpen size={11} className="text-[#7a776e]" />
                                        <span className="text-[10px] font-semibold text-[#7a776e] uppercase tracking-wider">Reference Docs</span>
                                    </div>
                                    <button onClick={() => ctxFileRef.current?.click()}
                                        className="text-[10px] text-[#7a776e] hover:text-[#37352f] flex items-center gap-0.5">
                                        {isUploadingCtx ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                                        Add
                                    </button>
                                </div>
                                <nav className="overflow-y-auto space-y-0.5">
                                    {contextDocs.length === 0
                                        ? <p className="px-2 py-1 text-[11px] text-[#b0ada7]">No docs added. AI has no context.</p>
                                        : contextDocs.map(doc => (
                                            <div key={doc.name}
                                                className="flex items-center gap-1.5 p-1.5 rounded text-[11px] group hover:bg-[#efefed]">
                                                <FileText size={11} className="shrink-0 text-blue-500" />
                                                <span className="truncate flex-1 text-[#37352f]">{doc.name}</span>
                                                <button onClick={() => handleRemoveContextDoc(doc.name)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500">
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                </nav>
                            </div>

                            {/* Bottom actions */}
                            <div className="mt-auto pt-4 border-t border-[#e1e1e0] space-y-3">
                                <div id="api-key-container" className="space-y-1">
                                    <label className="text-[10px] font-semibold text-[#7a776e] uppercase tracking-wider px-1">Gemini API Key</label>
                                    <input
                                        id="api-key-input"
                                        type="password"
                                        placeholder="AIzaSy..."
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        className="w-full px-2 py-1.5 border border-[#e1e1e0] rounded text-xs focus:ring-1 focus:ring-[#37352f] outline-none"
                                    />
                                </div>

                                <div id="export-options" className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-[#7a776e] uppercase tracking-wider px-1">Document Actions</label>
                                        <button onClick={() => chartFileRef.current?.click()}
                                            className="w-full flex items-center gap-2 p-2.5 bg-[#37352f] text-white rounded-lg hover:opacity-90 transition-opacity text-xs font-semibold">
                                            <Upload size={14} /> Upload Doc
                                        </button>
                                        <button onClick={handleExportClick}
                                            disabled={!activeChart}
                                            className={`w-full flex items-center gap-2 p-2.5 bg-[#f7f7f5] border border-[#e1e1e0] text-[#37352f] rounded-lg hover:bg-[#efefed] transition-colors text-xs font-semibold
                                                ${!activeChart ? 'opacity-30 cursor-not-allowed border-dashed' : ''}`}>
                                            {isExporting ? <Loader2 size={14} className="animate-spin text-[#7a776e]" /> : <Download size={14} />}
                                            Export DOCX
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-semibold text-[#7a776e] uppercase tracking-wider px-1">Chart Actions</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={handleDownloadState}
                                                disabled={!activeChart}
                                                title="Export current chart state as JSON"
                                                className="flex items-center justify-center gap-1.5 p-2 hover:bg-[#efefed] rounded-lg border border-[#e1e1e0] text-[10px] font-medium transition-colors disabled:opacity-30">
                                                <Download size={12} /> Export Chat
                                            </button>
                                            <button onClick={() => jsonFileRef.current?.click()}
                                                title="Import a previously exported chart JSON"
                                                className="flex items-center justify-center gap-1.5 p-2 hover:bg-[#efefed] rounded-lg border border-[#e1e1e0] text-[10px] font-medium transition-colors">
                                                <Upload size={12} /> Import Chat
                                            </button>
                                        </div>
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
                            <button
                                id="demo-btn"
                                onClick={handleDemoLoad}
                                disabled={isUploading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Demo
                            </button>
                            <button
                                id="walkthrough-btn"
                                onClick={() => setRunTour(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f7f7f5] border border-[#e1e1e0] text-[#37352f] rounded-lg text-xs font-medium hover:bg-[#efefed] transition-colors"
                            >
                                <BookOpen size={14} /> {isDemoChart ? 'Show Demo Tour' : 'How to use'}
                            </button>
                            <button onClick={() => setChatOpen(!chatOpen)}
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
                            <div className="border border-[#e1e1e0] rounded bg-white overflow-hidden">
                                <ClaimTable elements={elements} onSelectElement={el => setSelectedElementId(el.id)} selectedId={selectedElementId} />
                            </div>
                        ) : (
                            <div className="border border-[#e1e1e0] rounded-lg p-10 bg-white flex flex-col items-center justify-center text-center">
                                <div className="bg-[#f7f7f5] p-4 rounded-full mb-4">
                                    {isUploading ? <Loader2 size={32} className="text-[#37352f] animate-spin" /> : <Upload size={32} className="text-[#7a776e]" />}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">
                                    {isUploading ? 'Parsing claim chart...' : 'Upload a claim chart'}
                                </h3>
                                <p className="text-[#7a776e] text-sm mb-6 max-w-sm">
                                    {isUploading ? 'Gemini AI is extracting claim elements into a structured grid.' : 'Upload a PDF or DOCX claim chart. Then add reference docs for AI context.'}
                                </p>
                                <button onClick={() => chartFileRef.current?.click()} disabled={isUploading}
                                    className="bg-[#37352f] text-white px-5 py-2 rounded font-medium text-sm hover:opacity-90 disabled:opacity-50">
                                    {isUploading ? 'Processing...' : 'Browse Files'}
                                </button>
                            </div>
                        )}
                    </main>

                    {/* Hidden inputs */}
                    <input type="file" ref={chartFileRef} onChange={handleChartUpload} className="hidden" accept=".pdf,.docx" />
                    <input type="file" ref={ctxFileRef} onChange={handleContextUpload} className="hidden" accept=".pdf,.docx" />
                    <input type="file" ref={jsonFileRef} onChange={handleUploadState} className="hidden" accept=".json" />

                    {!chatOpen && (
                        <button onClick={() => setChatOpen(true)}
                            className="absolute bottom-6 right-6 bg-[#37352f] text-white p-3 rounded-full shadow-xl hover:scale-105 transition-transform">
                            <MessageSquare size={22} />
                        </button>
                    )}
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
                                    <span className="font-mono text-[10px] bg-[#e1e1e0] px-1.5 py-0.5 rounded">
                                        {selectedElement.id}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
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
                                    className="w-full border border-[#e1e1e0] rounded-lg p-2 pr-9 text-xs focus:outline-none focus:ring-1 focus:ring-[#37352f] resize-none disabled:bg-[#f7f7f5] disabled:cursor-not-allowed"
                                    rows={3}
                                />
                                <button onClick={() => handleRefine()}
                                    disabled={!chatInput.trim() || isRefining}
                                    className="absolute right-2 bottom-2 text-white bg-[#37352f] rounded-md p-1.5 hover:opacity-90 disabled:opacity-30">
                                    {isRefining ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Warning Modal */}
            {showExportModal && activeChart && (
                <ExportWarningModal
                    elements={elements}
                    onExportAnyway={doExport}
                    onCancel={() => setShowExportModal(false)}
                />
            )}
        </div>
    );
};

export default App;
