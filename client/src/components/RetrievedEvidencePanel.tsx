import React from 'react';
import { Search, FileText, AlertCircle, Quote } from 'lucide-react';
import { RetrievedChunk } from '../api';

interface RetrievedEvidencePanelProps {
    chunks: RetrievedChunk[];
    topScore: number;
    noEvidenceFound: boolean;
    hasChartEvidence: boolean;
    lowScoreReason?: string;
    onSnippetClick?: (text: string) => void;
}

const RetrievedEvidencePanel: React.FC<RetrievedEvidencePanelProps> = ({
    chunks,
    topScore,
    noEvidenceFound,
    hasChartEvidence,
    lowScoreReason,
    onSnippetClick
}) => {
    // If no RAG data AND no chart evidence AND no specific reason, hide
    if (chunks.length === 0 && !noEvidenceFound && !hasChartEvidence) return null;

    const hasNoIndex = lowScoreReason === "Document search not available. Using existing evidence.";
    const isStrongMatch = topScore > 0.6;
    const isWeakMatch = topScore > 0.45 && topScore <= 0.6;

    const getScoreBadgeStyles = () => {
        if (topScore > 0.6) return 'bg-green-50 text-green-700 border-green-100';
        if (topScore > 0.45) return 'bg-blue-50 text-blue-700 border-blue-100';
        return 'bg-orange-50 text-orange-700 border-orange-100';
    };

    const getScoreLabel = () => {
        if (topScore > 0.6) return 'Strong RAG Match';
        if (topScore > 0.45) return 'Partial RAG Match';
        if (hasChartEvidence) return 'No New Evidence Found';
        return 'No Strong Evidence';
    };

    return (
        <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-[#37352f] font-medium text-xs">
                    {chunks.length > 0 ? (
                        <>
                            <Search size={14} className="text-blue-600" />
                            New Document Matches
                        </>
                    ) : (
                        <>
                            <FileText size={14} className="text-[#7a776e]" />
                            Validated via Existing Evidence
                        </>
                    )}
                </div>
                {topScore > 0 && (
                    <div className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${getScoreBadgeStyles()}`}>
                        {getScoreLabel()}: {topScore.toFixed(2)}
                    </div>
                )}
            </div>

            {noEvidenceFound && (
                <div className={`${hasChartEvidence ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'} rounded-lg p-3 flex gap-2`}>
                    <AlertCircle size={14} className={`${hasChartEvidence ? 'text-blue-600' : 'text-orange-600'} shrink-0 mt-0.5`} />
                    <div>
                        <p className={`${hasChartEvidence ? 'text-blue-900' : 'text-orange-900'} text-xs font-medium`}>
                            {hasChartEvidence ? 'RAG Search Result' : 'Insufficient Evidence Found'}
                        </p>
                        <p className={`${hasChartEvidence ? 'text-blue-700' : 'text-orange-700'} text-[10px] mt-0.5`}>
                            {hasNoIndex
                                ? "Knowledge base search not available. Using evidence already stored in your chart."
                                : noEvidenceFound && hasChartEvidence
                                    ? "No additional evidence found via search. Relying on existing chart evidence."
                                    : lowScoreReason || "Could not find supporting evidence in technical documents."
                            }
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                {chunks.map((chunk, idx) => (
                    <div
                        key={idx}
                        onClick={() => onSnippetClick?.(chunk.text)}
                        className="group bg-white border border-[#e1e1e0] rounded-lg p-2.5 transition-all hover:border-[#37352f]/30 hover:shadow-sm cursor-pointer"
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <FileText size={10} className="text-[#7a776e] shrink-0" />
                                <span className="text-[#37352f] text-[10px] font-semibold truncate">
                                    {chunk.source}
                                </span>
                                <span className="text-[#7a776e] text-[10px]">•</span>
                                <span className="text-[#7a776e] text-[10px] italic truncate">
                                    {chunk.section}
                                </span>
                            </div>
                            <div className="text-[9px] text-[#7a776e] font-mono">
                                {(chunk.score * 100).toFixed(0)}%
                            </div>
                        </div>

                        <div className="relative">
                            <Quote size={8} className="absolute -left-1 -top-1 text-[#e1e1e0]" />
                            <p className="text-[#37352f] text-[11px] leading-relaxed line-clamp-3 pl-2 border-l border-[#f2f1ee]">
                                {chunk.text}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RetrievedEvidencePanel;
