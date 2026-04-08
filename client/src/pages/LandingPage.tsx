import Hero from '../components/Hero';
import DashboardPreview from '../components/DashboardPreview';
import SEO from '../components/SEO';

const LandingPage: React.FC = () => {
    return (
        <main className="bg-background">
            <SEO
                title="Lumenci"
                description="Transform patent auditing with cinematic clarity. AI-powered claim charts with high legal defensibility."
            />
            <Hero />

            {/* Section 2: Solutions - The "So What" Method */}
            <section className="py-24 md:py-32 border-t border-white/5 relative z-40 bg-background overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-6xl font-display mb-6">The Antidote to <br /><span className="italic text-accent">Chaotic Evidence.</span></h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
                            Stop describing features. Start architectural verification. Lumenci AI bridges the gap between raw technical data and structured legal proof.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Audit with Total Confidence",
                                benefit: "Detect hedging language (maybe, likely) before your opponents do. Lumenci audits every section for § citation accuracy.",
                                icon: "⚡"
                            },
                            {
                                title: "Context-Isolated Precision",
                                benefit: "Zero hallucinations. Our AI judge only 'sees' the specs you provide, ensuring 100% grounded results for every claim.",
                                icon: "🎯"
                            },
                            {
                                title: "High-Throughput Speed",
                                benefit: "Reduce auditing time by 70%. Batch-process entire claim charts in a single neural pass without the manual grind.",
                                icon: "🚀"
                            }
                        ].map((item, i) => (
                            <div key={i} className="glass p-10 rounded-[2rem] border-white/5 hover:border-accent/20 transition-colors group">
                                <div className="text-4xl mb-6">{item.icon}</div>
                                <h3 className="text-2xl font-display mb-4 text-foreground group-hover:text-accent transition-colors">{item.title}</h3>
                                <p className="text-muted-foreground leading-relaxed italic border-l-2 border-accent/20 pl-4">{item.benefit}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3: Product Demo Showcase */}
            <section id="showcase" className="py-24 bg-muted/10 relative z-40 border-y border-white/5 overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row gap-16 items-center">
                        <div className="md:w-1/2 space-y-8 text-left">
                            <div className="inline-block px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-mono uppercase tracking-widest">Showcase</div>
                            <h2 className="text-5xl font-display italic leading-tight">"Be so good they <br /> can't ignore you."</h2>
                            <p className="text-xl text-muted-foreground leading-relaxed">
                                A high-precision workspace for Patent Infringement Analysis. Watch your draft transform into verified proof in real-time.
                            </p>
                            <ul className="space-y-4 font-mono text-xs text-accent">
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span> INTEGRATED 3-COLUMN STATE MACHINE</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span> LEGAL DEFENSIBILITY SCORE (LDS)</li>
                                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span> DYNAMIC SUGGESTION CHIPS</li>
                            </ul>
                        </div>
                        <div className="md:w-1/2 relative group">
                            <div className="absolute inset-0 bg-accent/30 blur-[120px] rounded-full opacity-20 group-hover:opacity-40 transition-all duration-700"></div>
                            <div className="glass aspect-video rounded-3xl overflow-hidden border-white/10 shadow-2xl flex items-center justify-center p-8 relative z-10 transition-transform duration-700 group-hover:scale-[1.02]">
                                <div className="w-full h-full bg-black/40 rounded-xl border border-white/5 flex flex-col p-4 space-y-4 backdrop-blur-md">
                                    <div className="flex items-center justify-between">
                                        <div className="h-4 w-32 bg-white/10 rounded-full"></div>
                                        <div className="px-2 py-0.5 rounded-md bg-green-500/20 text-green-400 text-[10px] font-mono">READY</div>
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 gap-2">
                                        {[1, 2].map(i => (
                                            <div key={i} className="bg-white/5 border border-white/5 rounded-md p-3 flex flex-col justify-between">
                                                <div className="h-2 w-full bg-white/10 rounded-full"></div>
                                                <div className="flex justify-between mt-2">
                                                    <div className="text-[10px] font-mono text-accent">LDS: 94%</div>
                                                    <div className="h-2 w-12 bg-accent/20 rounded-full"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-10 w-full bg-accent/10 border border-accent/20 rounded-md flex items-center px-4">
                                        <div className="h-2 w-2/3 bg-accent/30 rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: Why Us - Comparison */}
            <section className="py-24 md:py-32 relative z-40 bg-background overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-display text-center mb-24">The Neural Edge.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                            <div className="p-12 bg-white/[0.02] border-r border-white/5 hover:bg-white/[0.03] transition-colors">
                                <h4 className="text-sm font-bold mb-10 text-muted-foreground uppercase tracking-[0.2em] font-mono">Others</h4>
                                <ul className="space-y-6 text-muted-foreground/60 text-sm">
                                    <li className="flex items-start gap-4">✕ Hallucinate section citations</li>
                                    <li className="flex items-start gap-4">✕ Lose state in long conversations</li>
                                    <li className="flex items-start gap-4">✕ Slower manual Spec context entry</li>
                                    <li className="flex items-start gap-4">✕ Generic horizontal chat logic</li>
                                </ul>
                            </div>
                            <div className="p-12 bg-accent/5 hover:bg-accent/[0.07] transition-colors relative">
                                <div className="absolute top-6 right-8 text-[10px] font-bold text-accent uppercase tracking-widest font-mono">Standardized</div>
                                <h4 className="text-sm font-bold mb-10 text-accent uppercase tracking-[0.2em] font-mono">Lumenci Architect</h4>
                                <ul className="space-y-6 text-foreground text-sm">
                                    <li className="flex items-start gap-4 text-accent/80 font-medium italic underline decoration-accent/20 underline-offset-4">✓ Strictly grounded section reasoning</li>
                                    <li className="flex items-start gap-4 text-accent/80 font-medium italic underline decoration-accent/20 underline-offset-4">✓ Deterministic 3-column architecture</li>
                                    <li className="flex items-start gap-4 text-accent/80 font-medium italic underline decoration-accent/20 underline-offset-4">✓ High-throughput URL/PDF grounding</li>
                                    <li className="flex items-start gap-4 text-accent/80 font-medium italic underline decoration-accent/20 underline-offset-4">✓ Legal Defensibility Score (LDS)</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 6: AI for Legal */}
            <section className="py-32 flex flex-col items-center justify-center bg-accent text-white relative z-40 overflow-hidden text-center px-6">
                <div className="absolute inset-0 opacity-30 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_80%)]"></div>
                    <div className="absolute -bottom-1/2 left-0 w-full h-full bg-white blur-[150px] rounded-full opacity-20"></div>
                </div>
                <h2 className="text-6xl md:text-[10rem] font-display font-bold uppercase tracking-tighter leading-none text-white/90 relative z-10">AI for Legal</h2>
            </section>

            {/* Section 7: FAQ */}
            <section className="py-24 md:py-32 relative z-40 bg-background border-t border-white/5">
                <div className="container mx-auto px-6 max-w-4xl">
                    <h2 className="text-5xl font-display mb-20 text-center">Frequently Anticipated <br /><span className="italic text-accent">Objections.</span></h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        {[
                            { q: "Is my technical data secure?", a: "Absolutely. Lumenci uses context-isolated sessions and browser-side persistence for your claim charts. We never train models on your proprietary evidence." },
                            { q: "How accurate is the LDS score?", a: "The Legal Defensibility Score (LDS) is correlated to senior attorney review standards, focusing on citation density and detection of hedging tokens like 'likely' or 'appears'." },
                            { q: "Can I export to professional formats?", a: "Yes. Every refined chart can be exported to industry-standard DOCX or PDF formats in a single click, ready for immediate filing." },
                            { q: "Does it support URL grounding?", a: "Yes. Simply paste a specification URL, and Lumenci instantly fetches and contextualizes the technical documentation for grounded evidence mapping." }
                        ].map((faq, i) => (
                            <div key={i} className="group">
                                <h4 className="text-xl font-medium text-foreground mb-4 group-hover:text-accent transition-colors">{faq.q}</h4>
                                <p className="text-muted-foreground leading-relaxed text-sm">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer-like closer */}
            <section className="py-32 flex flex-col items-center justify-center bg-accent text-white relative z-40 overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2)_0%,transparent_70%)]"></div>
                </div>
                <h2 className="text-5xl md:text-7xl font-display mb-12 text-center relative z-10 px-6">Ready to architect <br /> ironclad evidence?</h2>
                <button className="px-10 py-5 bg-white text-accent rounded-2xl text-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-2xl relative z-10">
                    Get Started Free
                </button>
            </section>
        </main>
    );
};

export default LandingPage;
