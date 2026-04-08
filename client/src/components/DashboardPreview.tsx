import React, { useEffect, useState } from 'react';
import { gsap } from 'gsap';

const DashboardPreview: React.FC = () => {
    const [score, setScore] = useState(0);

    useEffect(() => {
        // Animate the score counter
        const obj = { value: 0 };
        gsap.to(obj, {
            value: 94,
            duration: 2.5,
            ease: "power2.out",
            onUpdate: () => setScore(Math.floor(obj.value)),
            scrollTrigger: {
                trigger: "#dashboard-preview",
                start: "top 70%",
            }
        });
    }, []);

    return (
        <div id="dashboard-preview" className="w-full h-full flex flex-col p-8 bg-white/5 backdrop-blur-3xl">
            {/* Header Mockup */}
            <div className="flex justify-between items-center mb-12">
                <div className="space-y-1">
                    <h3 className="text-2xl font-display text-foreground font-bold">Project Overview</h3>
                    <p className="text-muted-foreground text-xs font-mono">ID: PC-2026-ALPHA</p>
                </div>
                <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-accent/20"></div>
                    <div className="w-8 h-8 rounded-full bg-primary/20"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Score Card */}
                <div className="glass p-6 rounded-2xl border-white/20 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">Legal Defensibility</span>
                    <div className="text-6xl font-display font-bold text-accent mb-2">
                        {score}<span className="text-2xl opacity-50">%</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-1000" style={{ width: `${score}%` }}></div>
                    </div>
                </div>

                {/* Chart Card */}
                <div className="md:col-span-2 glass p-6 rounded-2xl border-white/20 relative overflow-hidden">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 block">Audit Velocity</span>

                    {/* SVG Chart Placeholder */}
                    <svg viewBox="0 0 400 100" className="w-full h-24 overflow-visible">
                        <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0 80 Q 50 20, 100 60 T 200 40 T 300 80 T 400 30"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-accent"
                        />
                        <path
                            d="M0 80 Q 50 20, 100 60 T 200 40 T 300 80 T 400 30 V 100 H 0 Z"
                            fill="url(#chartGradient)"
                        />
                        {/* Data Points */}
                        {[0, 100, 200, 300, 400].map((x, i) => (
                            <circle key={i} cx={x} cy={80 - Math.random() * 50} r="2" className="fill-accent animate-pulse" />
                        ))}
                    </svg>
                </div>
            </div>

            {/* List Mockup */}
            <div className="glass rounded-xl border-white/20 overflow-hidden flex-1">
                <table className="w-full text-left text-xs">
                    <thead className="bg-foreground/5 font-mono text-muted-foreground uppercase tracking-widest">
                        <tr>
                            <th className="p-3">Claim Element</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3 text-right">Confidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-foreground/5">
                        {[
                            { name: "Wireless Module Context", status: "Verified", conf: "98%" },
                            { name: "Occupancy Detection Logic", status: "Conflict", conf: "42%" },
                            { name: "Thermal Feedback Loop", status: "Drafting", conf: "65%" }
                        ].map((row, i) => (
                            <tr key={i}>
                                <td className="p-3 font-medium">{row.name}</td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full ${row.status === 'Verified' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right font-mono text-muted-foreground">{row.conf}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DashboardPreview;
