import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ClaimElement } from './ClaimTable';

interface ExportWarningModalProps {
    elements: ClaimElement[];
    onExportAnyway: () => void;
    onCancel: () => void;
}

function getIssues(elements: ClaimElement[]): { id: string; issue: string }[] {
    const issues: { id: string; issue: string }[] = [];
    for (const el of elements) {
        if (!el.evidence || el.evidence.trim() === '') {
            issues.push({ id: el.id, issue: 'No evidence mapped — this element has no supporting evidence.' });
        } else if (el.flags && el.flags.length > 0) {
            issues.push({ id: el.id, issue: `Flagged weakness: ${el.flags.join('; ')}` });
        } else if (el.confidence < 50) {
            issues.push({ id: el.id, issue: `Low confidence score (${el.confidence}%).` });
        }
    }
    return issues;
}

const ExportWarningModal: React.FC<ExportWarningModalProps> = ({ elements, onExportAnyway, onCancel }) => {
    const issues = getIssues(elements);

    if (issues.length === 0) {
        // No issues — should not show this modal, but handle gracefully
        onExportAnyway();
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-[#e1e1e0]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-[#e1e1e0]">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-full">
                            <AlertTriangle size={18} className="text-amber-600" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-sm">Export with Warnings</h2>
                            <p className="text-[11px] text-[#7a776e] mt-0.5">
                                {issues.length} element{issues.length > 1 ? 's have' : ' has'} issues that may weaken the claim chart.
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-1 hover:bg-[#efefed] rounded">
                        <X size={16} />
                    </button>
                </div>

                {/* Issues list */}
                <div className="p-5 space-y-3 max-h-64 overflow-y-auto">
                    {issues.map((issue, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                            <span className="font-mono text-xs font-bold text-amber-700 shrink-0 mt-0.5">
                                {issue.id}
                            </span>
                            <p className="text-xs text-amber-800">{issue.issue}</p>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-[#e1e1e0] flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium border border-[#e1e1e0] rounded-lg hover:bg-[#f7f7f5] transition-colors"
                    >
                        Fix Issues First
                    </button>
                    <button
                        onClick={onExportAnyway}
                        className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                        Export Anyway
                    </button>
                </div>
            </div>
        </div>
    );
};

export { getIssues };
export default ExportWarningModal;
