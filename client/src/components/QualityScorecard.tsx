import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, Activity, FileText, Search, X, Loader2, RotateCw, AlertTriangle } from 'lucide-react';
import { ClaimElement } from './ClaimTable';

interface QualityScorecardProps {
    isOpen: boolean;
    onClose: () => void;
    elements: ClaimElement[];
    onRunAudit: (elementId: string) => void;
    onAuditStale: () => void;
    onAuditAll: () => void;
    isAuditing: string | null;
}

const QualityScorecard: React.FC<QualityScorecardProps> = ({
    isOpen, onClose, elements, onRunAudit, onAuditStale, onAuditAll, isAuditing
}) => {
    if (!isOpen) return null;

    const totalElements = elements.length;
    const auditedElements = elements.filter(el => el.audit).length;

    // Check for stale elements
    const staleElements = elements.filter(el =>
        el.audit && el.reasoning !== el.audit.lastAuditedReasoning
    );
    const hasStale = staleElements.length > 0;

    const avgScore = totalElements > 0
        ? Math.round(elements.reduce((acc, el) => acc + (el.audit?.ldsScore || 0), 0) / (auditedElements || 1))
        : 0;

    const criticalIssues = elements.filter(el => el.audit?.verdict === 'CRITICAL').length;
    const hedgingIssues = elements.filter(el => el.audit?.hedgingDetected).length;

    return (
        <div className="fixed inset-0 bg-[#37352f]/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-[#e1e1e0]">
                {/* Header */}
                <div className="p-6 border-b border-[#f0f0ef] bg-[#fcfcfb] shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-[#37352f] rounded-lg text-white border border-[#37352f]">
                                    <Activity size={18} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-xl font-bold text-[#37352f] tracking-tight">AI Quality Scorecard</h2>
                            </div>
                            <p className="text-xs text-[#7a776e] font-medium ml-[42px]">Auditor-grade analysis of reasoning quality and citation accuracy.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-[#efefed] rounded-full transition-all text-[#7a776e] hover:text-[#37352f]">
                            <X size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white custom-scrollbar">
                    {/* Global Metrics Cards */}
                    <div className="flex items-center justify-between border-b border-[#f0f0ef] pb-6">
                        <div className="text-[10px] font-bold text-[#b0ada7] uppercase tracking-wider flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            Live Health Metrics
                        </div>
                        <div className="flex gap-4">
                            <div className="text-left px-5 py-3 bg-[#fcfcfb] rounded-xl border border-[#e1e1e0] min-w-[150px]">
                                <div className="text-[10px] uppercase font-bold text-[#7a776e] tracking-wider mb-1.5 opacity-60">Health Score</div>
                                <div className={`text-2xl font-bold ${avgScore > 80 ? 'text-green-600' : avgScore > 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {avgScore}%
                                </div>
                            </div>
                            <div className="text-left px-5 py-3 bg-[#fcfcfb] rounded-xl border border-[#e1e1e0] min-w-[150px]">
                                <div className="text-[10px] uppercase font-bold text-[#7a776e] tracking-wider mb-1.5 opacity-60">Critical Risks</div>
                                <div className={`text-2xl font-bold ${criticalIssues > 0 ? 'text-red-600' : 'text-[#37352f]'}`}>{criticalIssues}</div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-[#fcfcfb] rounded-xl border border-[#e1e1e0] flex items-center gap-3 transition-all">
                            <div className="p-2 bg-white rounded-lg text-[#37352f] border border-[#e1e1e0]"><FileText size={16} /></div>
                            <div>
                                <div className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider mb-0.5">Citation Coverage</div>
                                <div className="text-sm font-bold text-[#37352f]">{auditedElements}/{totalElements} Audited</div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#fcfcfb] rounded-xl border border-[#e1e1e0] flex items-center gap-3 transition-all">
                            <div className="p-2 bg-white rounded-lg text-[#37352f] border border-[#e1e1e0]"><Search size={16} /></div>
                            <div>
                                <div className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider mb-0.5">Hedging Detection</div>
                                <div className="text-sm font-bold text-[#37352f]">{hedgingIssues} instances</div>
                            </div>
                        </div>
                        <div className="p-4 bg-[#fcfcfb] rounded-xl border border-[#e1e1e0] flex items-center gap-3 transition-all">
                            <div className="p-2 bg-white rounded-lg text-[#37352f] border border-[#e1e1e0]"><ShieldCheck size={16} /></div>
                            <div>
                                <div className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider mb-0.5">Legal Standards</div>
                                <div className="text-sm font-bold text-[#37352f]">Attorney-Grade</div>
                            </div>
                        </div>
                    </div>

                    {/* Worklist Section */}
                    <div className="flex items-center justify-between mt-8 mb-4">
                        <h3 className="text-[10px] font-bold text-[#b0ada7] uppercase tracking-wider flex items-center gap-2">
                            Audit Queue
                            {hasStale && (
                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-tight animate-pulse">
                                    ACTION REQUIRED
                                </span>
                            )}
                        </h3>
                        <div className="flex gap-2">
                            {hasStale && (
                                <button
                                    onClick={onAuditStale}
                                    disabled={!!isAuditing}
                                    className="flex items-center gap-2 text-[10px] font-bold text-[#37352f] hover:bg-[#f2f1ee] px-3 py-1.5 rounded-lg border border-[#e1e1e0] transition-all disabled:opacity-50"
                                >
                                    {isAuditing ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
                                    RE-AUDIT STALE
                                </button>
                            )}
                            <button
                                onClick={onAuditAll}
                                disabled={!!isAuditing || totalElements === 0}
                                className="flex items-center gap-2 text-[10px] font-bold text-white bg-[#37352f] hover:opacity-90 px-3 py-1.5 rounded-lg border border-[#37352f] transition-all disabled:opacity-50"
                            >
                                {isAuditing ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                                AUDIT ALL
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {elements.map(el => {
                            const isStale = el.audit && el.reasoning !== el.audit.lastAuditedReasoning;
                            const isCritical = el.audit?.verdict === 'CRITICAL';
                            const score = el.audit?.ldsScore ?? 0;

                            return (
                                <div
                                    key={el.id}
                                    className={`group relative flex flex-col gap-4 p-4 rounded-xl border transition-all duration-300
                                            ${isCritical ? 'bg-[#fffafb] border-red-100' :
                                            isStale ? 'bg-[#fffdfa] border-amber-100' :
                                                'bg-white border-[#f0f0ef] hover:border-[#37352f]/20'}`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1 min-w-0">
                                            <div className="shrink-0 pt-1">
                                                {el.audit ? (
                                                    el.audit.verdict === 'PASS' ? <ShieldCheck size={18} className="text-green-500" strokeWidth={2.5} /> :
                                                        el.audit.verdict === 'WARNING' ? <ShieldAlert size={18} className="text-amber-500" strokeWidth={2.5} /> :
                                                            <ShieldX size={18} className="text-red-500" strokeWidth={2.5} />
                                                ) : (
                                                    <div className="w-[18px] h-[18px] border-2 border-dashed border-[#d1d0cc] rounded-full" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2.5 mb-1">
                                                    <span className="font-bold text-[13px] text-[#37352f] w-8">Element {el.id}</span>
                                                    {isStale && (
                                                        <span className="inline-flex items-center gap-1 text-[8px] font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full uppercase tracking-tight">
                                                            <RotateCw size={8} /> Needs Refresh
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-[#7a776e] line-clamp-2 font-medium">
                                                    {el.reasoning || "Pending initial findings..."}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => onRunAudit(el.id)}
                                            disabled={!!isAuditing}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider shrink-0
                                                    ${isAuditing === el.id ? 'bg-[#37352f] text-white opacity-90' :
                                                    el.audit ? 'bg-white text-[#37352f] border border-[#e1e1e0] hover:border-[#37352f]' :
                                                        'bg-[#37352f] text-white hover:opacity-90'}
                                                    disabled:opacity-50 active:scale-[0.98] min-w-[100px]`}
                                        >
                                            {isAuditing === el.id ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <Loader2 size={10} className="animate-spin" />
                                                    ...
                                                </div>
                                            ) : el.audit ? (
                                                'RE-AUDIT'
                                            ) : (
                                                'RUN AUDIT'
                                            )}
                                        </button>
                                    </div>

                                    {/* Per-element health metrics */}
                                    <div className="flex items-center gap-6 pl-[34px] pt-3 border-t border-[#f0f0ef]">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-[#b0ada7] uppercase tracking-wider">Health Score</span>
                                            <span className={`text-xs font-bold ${score > 80 ? 'text-green-600' : score > 50 ? 'text-amber-600' : score > 0 ? 'text-red-600' : 'text-[#b0ada7]'}`}>
                                                {el.audit ? `${score}%` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-[#b0ada7] uppercase tracking-wider">Critical Risks</span>
                                            <span className={`text-xs font-bold ${isCritical ? 'text-red-600' : 'text-[#37352f]'}`}>
                                                {isCritical ? '1' : '0'}
                                            </span>
                                        </div>
                                        {el.audit?.hedgingDetected && (
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[8px] font-bold text-amber-600 uppercase tracking-wider">Hedging</span>
                                                <span className="text-[10px] font-bold text-amber-700">DETECTED</span>
                                            </div>
                                        )}
                                        {el.audit?.auditNotes && (
                                            <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                                                <span className="text-[8px] font-bold text-[#b0ada7] uppercase tracking-wider text-right">Audit Findings</span>
                                                <span className="text-[9px] text-[#7a776e] italic truncate text-right">
                                                    "{el.audit.auditNotes}"
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="p-4 bg-[#fcfcfb] border-t border-[#f0f0ef] shrink-0 text-center">
                    <p className="text-[10px] font-bold text-[#b0ada7] uppercase tracking-wider">
                        Audits are powered by Gemini 1.5 Pro • LDS Reasoning Engine v4.2
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QualityScorecard;
