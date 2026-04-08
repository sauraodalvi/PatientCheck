import React from 'react';
import { Github, Twitter, Linkedin, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const AboutCreator: React.FC = () => {
    return (
        <main className="min-h-screen bg-background flex flex-col items-center p-6 pt-32 relative overflow-hidden">
            <SEO
                title="Saurao Dalvi | AI Product Manager"
                description="AI Product Manager • Builder of Fast, MVP-Specific, Useful Things"
            />
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent blur-[150px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary blur-[150px] rounded-full"></div>
            </div>

            <div className="w-full max-w-3xl relative z-10 space-y-12">
                <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-mono text-xs uppercase tracking-widest">Back to Lumenci</span>
                </Link>

                <div className="glass p-8 md:p-16 rounded-[3rem] border-white/10 space-y-12 bg-white/[0.02]">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-5xl md:text-7xl font-display leading-tight italic">Saurao Dalvi</h1>
                            <p className="text-xl md:text-2xl text-accent font-medium leading-relaxed">
                                AI Product Manager • Builder of Fast, MVP-Specific, Useful Things
                            </p>
                        </div>

                        <div className="h-px w-24 bg-accent/30"></div>

                        <div className="space-y-8 text-lg text-muted-foreground leading-relaxed font-body">
                            <section className="space-y-4">
                                <h2 className="text-2xl font-display text-foreground italic">The Builder Behind the Vision</h2>
                                <p>
                                    I’m Saurao — a practical, curiosity-driven AI Product Manager who specializes in taking complex problems and distilling them into high-impact, modular solutions. I don’t just build products; I build systems that simplify lives, typically moving from "what if?" to a working MVP in record time.
                                </p>
                                <p>
                                    My philosophy is simple: <span className="text-foreground font-medium">"Clarity over jargon. Thoughtful design over unnecessary complexity."</span> I believe the best products represent a seamless bridge between cutting-edge technology and intuitive human experience. If a product doesn't feel like a natural extension of the user's intent, there's still work to do.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-2xl font-display text-foreground italic">Defining My Impact</h2>
                                <p>With experience spanning HealthTech, EdTech, and Security Compliance, I’ve mastered the art of balancing rapid experimentation with production-grade reliability. My approach is grounded in:</p>
                                <ul className="space-y-3 list-none pl-0">
                                    <li className="flex gap-3"><span className="text-accent">→</span> <strong>Rapid MVP Prototyping</strong> — Deploying useful features using AI-assisted builders and manual craft.</li>
                                    <li className="flex gap-3"><span className="text-accent">→</span> <strong>B2B Automation</strong> — Streamlining enterprise workflows to reduce friction and operational overhead.</li>
                                    <li className="flex gap-3"><span className="text-accent">→</span> <strong>User-Centric Growth</strong> — Leveraging deep research to identify and solve the "Aha!" moment for any product.</li>
                                    <li className="flex gap-3"><span className="text-accent">→</span> <strong>AI-Forward Workflows</strong> — Integrating Generative AI to rethink how we work and build today.</li>
                                </ul>
                                <a href="#" className="inline-block text-accent hover:underline decoration-accent/30 underline-offset-4 font-medium transition-all group">
                                    View Full Resume <span className="inline-block group-hover:translate-x-1 transition-transform">→</span>
                                </a>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-2xl font-display text-foreground italic">Strategic Product Philosophy</h2>
                                <p>
                                    I build for cognitive ease. In an era of information overload, the most valuable thing a product can offer is a reduction in the user's mental load.
                                </p>
                                <p>
                                    My goal is to create products that feel <span className="text-foreground font-medium">"brain-friendly"</span>—no filler, no friction, just pure utility wrapped in a premium experience.
                                </p>
                            </section>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs uppercase tracking-[0.2em] font-mono text-accent mb-4">Things I Build With</h4>
                                <div className="flex flex-wrap gap-2 text-sm">
                                    {['Cursor', 'Gemini', 'v0.dev', 'Antigravity', 'Lovable', 'AI Playgrounds'].map(tool => (
                                        <span key={tool} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">{tool}</span>
                                    ))}
                                    <span className="text-muted-foreground/50 italic ml-2">…and whatever helps me build faster.</span>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-xs uppercase tracking-[0.2em] font-mono text-accent mb-4">Offline</h4>
                                <p className="text-sm text-muted-foreground">Badminton, table tennis, long walks, simple conversations, new ideas.</p>
                            </div>
                        </div>

                        <div className="space-y-6 bg-accent/5 p-8 rounded-3xl border border-accent/10">
                            <h4 className="text-xs uppercase tracking-[0.2em] font-mono text-accent mb-2">Let’s Connect</h4>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Found my work interesting? Have an idea? Just want to say hi? I always reply.
                            </p>
                            <div className="flex flex-col gap-4">
                                <a
                                    href="https://www.linkedin.com/in/saurao-dalvi/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-6 py-3 bg-accent text-white rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all font-bold text-center justify-center shadow-lg shadow-accent/20"
                                >
                                    <Linkedin size={20} />
                                    Say Hi on LinkedIn
                                </a>
                                <div className="flex gap-4 justify-center">
                                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Github size={18} /></a>
                                    <a href="#" className="text-muted-foreground hover:text-foreground transition-colors"><Twitter size={18} /></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center opacity-40">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.3em]">
                        © 2026 Lumenci · Designed with Clarity in mind.
                    </p>
                </div>
            </div>
        </main>
    );
};

export default AboutCreator;
