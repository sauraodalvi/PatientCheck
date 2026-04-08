import React from 'react';
import { Play, X, Info, CircleCheckBig, HelpCircle, AlertCircle } from 'lucide-react';

export type DemoPath = 'overview' | 'case-a' | 'case-b' | 'case-c';

interface DemoSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDemo: (path: DemoPath) => void;
}

const DemoSelectorModal: React.FC<DemoSelectorModalProps> = ({ isOpen, onClose, onSelectDemo }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full border border-[#e1e1e0] overflow-hidden flex flex-col font-sans">
                {/* Header */}
                <div className="p-6 border-b border-[#e1e1e0] flex items-center justify-between bg-[#f7f7f5]">
                    <div>
                        <h2 className="text-xl font-bold text-[#37352f]">Interactive Demo Scenarios</h2>
                        <p className="text-sm text-[#7a776e] mt-1">Select a route to explore how Lumenci AI handles different legal analysis tasks.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#efefed] rounded-full transition-colors"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Demo Overview */}
                    <button
                        onClick={() => onSelectDemo('overview')}
                        className="flex flex-col p-5 rounded-xl border text-left transition-all group relative overflow-hidden text-blue-600 bg-blue-50 border-blue-100"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-white/80 transition-transform text-blue-600">
                                <Info size={20} />
                            </div>
                            <h3 className="font-bold text-sm text-[#37352f]">Demo Overview</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-[#7a776e] mb-4">A complete walk-through of the Acme Corp case study, covering basic features and workflow.</p>
                        <div className="mt-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                            <Play size={12} fill="currentColor" strokeWidth={2} />
                            Start Walkthrough
                        </div>
                    </button>

                    {/* Scenario A */}
                    <button
                        onClick={() => onSelectDemo('case-a')}
                        className="flex flex-col p-5 rounded-xl border text-left transition-all group relative overflow-hidden text-green-600 bg-green-50 border-green-100"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-white/80 transition-transform text-green-600">
                                <CircleCheckBig size={20} />
                            </div>
                            <h3 className="font-bold text-sm text-[#37352f]">Scenario A: Literal Match</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-[#7a776e] mb-4">Learn how Lumenci AI finds exact phrasing and literal matches in massive technical manuals.</p>
                        <div className="mt-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                            <Play size={12} fill="currentColor" strokeWidth={2} />
                            Start Walkthrough
                        </div>
                    </button>

                    {/* Scenario B */}
                    <button
                        onClick={() => onSelectDemo('case-b')}
                        className="flex flex-col p-5 rounded-xl border text-left transition-all group relative overflow-hidden text-yellow-600 bg-yellow-50 border-yellow-100"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-white/80 transition-transform text-yellow-600">
                                <HelpCircle size={20} />
                            </div>
                            <h3 className="font-bold text-sm text-[#37352f]">Scenario B: Strengthening Reasoning</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-[#7a776e] mb-4">See how to fix vague evidence and strengthen reasoning for courtroom-ready charts.</p>
                        <div className="mt-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-yellow-600">
                            <Play size={12} fill="currentColor" strokeWidth={2} />
                            Start Walkthrough
                        </div>
                    </button>

                    {/* Scenario C */}
                    <button
                        onClick={() => onSelectDemo('case-c')}
                        className="flex flex-col p-5 rounded-xl border text-left transition-all group relative overflow-hidden text-orange-600 bg-orange-50 border-orange-100"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-white/80 transition-transform text-orange-600">
                                <AlertCircle size={20} />
                            </div>
                            <h3 className="font-bold text-sm text-[#37352f]">Scenario C: Resolving Conflicts</h3>
                        </div>
                        <p className="text-xs leading-relaxed text-[#7a776e] mb-4">Discover how to handle and flag contradictory citations between different source docs.</p>
                        <div className="mt-auto flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-600">
                            <Play size={12} fill="currentColor" strokeWidth={2} />
                            Start Walkthrough
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[#f7f7f5] border-t border-[#e1e1e0] text-center">
                    <p className="text-[11px] text-[#7a776e]">
                        The walkthrough will guide you through specific UI elements and logical reasoning steps.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DemoSelectorModal;
