import React from 'react';

interface DiffViewProps {
    oldText: string;
    newText: string;
    label?: string;
}

type DiffOp = { type: 'same' | 'added' | 'removed'; text: string };

function computeWordDiff(oldText: string, newText: string): DiffOp[] {
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);

    // Simple LCS-based word diff
    const m = oldWords.length;
    const n = newWords.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            if (oldWords[i] === newWords[j]) {
                dp[i][j] = 1 + dp[i + 1][j + 1];
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    const ops: DiffOp[] = [];
    let i = 0, j = 0;
    while (i < m || j < n) {
        if (i < m && j < n && oldWords[i] === newWords[j]) {
            ops.push({ type: 'same', text: oldWords[i] });
            i++; j++;
        } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
            ops.push({ type: 'added', text: newWords[j] });
            j++;
        } else {
            ops.push({ type: 'removed', text: oldWords[i] });
            i++;
        }
    }
    return ops;
}

const DiffView: React.FC<DiffViewProps> = ({ oldText, newText, label }) => {
    const ops = computeWordDiff(oldText || '', newText || '');

    const hasChanges = ops.some(op => op.type !== 'same');

    return (
        <div className="text-xs leading-relaxed">
            {label && (
                <p className="text-[10px] font-bold text-[#7a776e] uppercase tracking-wider mb-2">{label}</p>
            )}
            {!hasChanges ? (
                <p className="text-[#7a776e] italic">No text changes proposed.</p>
            ) : (
                <div className="bg-[#f7f7f5] border border-[#e1e1e0] rounded p-2 whitespace-pre-wrap font-mono">
                    {ops.map((op, i) => {
                        if (op.type === 'same') {
                            return <span key={i}>{op.text}</span>;
                        }
                        if (op.type === 'removed') {
                            return (
                                <span key={i} className="bg-red-100 text-red-700 line-through">
                                    {op.text}
                                </span>
                            );
                        }
                        return (
                            <span key={i} className="bg-green-100 text-green-800">
                                {op.text}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DiffView;
