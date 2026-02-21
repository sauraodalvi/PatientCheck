import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';

export interface ElementVersion {
    reasoning: string;
    evidence: string;
    confidence: number;
    flags: string[];
    timestamp: string;
    note: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    proposedChange?: {
        oldReasoning: string;
        newReasoning: string;
        oldEvidence: string;
        newEvidence: string;
    };
    status?: 'pending' | 'accepted' | 'rejected';
}

export interface ClaimElement {
    id: string;
    element: string;
    evidence: string;
    reasoning: string;
    confidence: number;
    flags: string[];
    versions: ElementVersion[];
    chatHistory: ChatMessage[];
}

interface ClaimTableProps {
    elements: ClaimElement[];
    onSelectElement: (element: ClaimElement) => void;
    selectedId: string | null;
}

const ClaimTable: React.FC<ClaimTableProps> = ({ elements, onSelectElement, selectedId }) => {
    return (
        <div className="w-full border-t border-l border-[#e1e1e0] bg-white text-sm">
            {/* Header */}
            <div className="flex bg-[#f7f7f5] font-medium text-[#7a776e] text-xs">
                <div className="w-[90px] p-2 border-r border-b border-[#e1e1e0]">ID</div>
                <div className="flex-1 p-2 border-r border-b border-[#e1e1e0]">Claim Element</div>
                <div className="flex-1 p-2 border-r border-b border-[#e1e1e0]">Evidence</div>
                <div className="flex-1 p-2 border-b border-[#e1e1e0]">Reasoning</div>
            </div>

            {elements.map((el) => {
                const missingEvidence = !el.evidence || el.evidence.trim() === '';
                const hasFlags = el.flags && el.flags.length > 0;
                const isLowConf = el.confidence < 50;

                return (
                    <div
                        key={el.id}
                        id={`claim-row-${el.id.replace(/\./g, '-')}`}
                        onClick={() => onSelectElement(el)}
                        className={`flex hover:bg-[#f2f1ee] cursor-pointer group ${selectedId === el.id ? 'bg-[#f2f1ee] ring-1 ring-inset ring-[#c9c8c4]' : ''}`}
                    >
                        {/* ID cell */}
                        <div className="w-[90px] p-2 border-r border-b border-[#e1e1e0] font-mono text-xs flex items-start gap-1.5 pt-2.5">
                            {hasFlags ? (
                                <AlertCircle size={12} className="text-red-500 mt-0.5 shrink-0" />
                            ) : missingEvidence ? (
                                <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                            ) : (
                                <div className="w-3 shrink-0" />
                            )}
                            <div>
                                <div className="font-semibold">{el.id}</div>
                                {el.versions && el.versions.length > 0 && (
                                    <div className="text-[9px] text-[#7a776e] mt-0.5">v{el.versions.length + 1}</div>
                                )}
                            </div>
                        </div>

                        {/* Element text */}
                        <div className="flex-1 p-2 border-r border-b border-[#e1e1e0] whitespace-pre-wrap text-xs">
                            {el.element}
                        </div>

                        {/* Evidence */}
                        <div className="flex-1 p-2 border-r border-b border-[#e1e1e0] whitespace-pre-wrap text-xs">
                            {missingEvidence ? (
                                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                                    <AlertTriangle size={11} />
                                    MISSING
                                </span>
                            ) : (
                                <span className="italic text-[#7a776e]">{el.evidence}</span>
                            )}
                        </div>

                        {/* Reasoning + confidence */}
                        <div className="flex-1 p-2 border-b border-[#e1e1e0] whitespace-pre-wrap text-xs relative">
                            {el.reasoning || <span className="text-[#d1d0cc]">No reasoning...</span>}

                            {el.confidence < 100 && (
                                <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-semibold
                                    ${isLowConf ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {el.confidence}%
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Add Row placeholder */}
            <div className="p-2 border-b border-[#e1e1e0] text-[#d1d0cc] hover:text-[#7a776e] cursor-pointer hover:bg-[#f7f7f5] text-xs">
                + New Element
            </div>
        </div>
    );
};

export default ClaimTable;
