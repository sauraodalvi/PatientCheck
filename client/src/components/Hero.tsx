import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';

const Hero: React.FC = () => {
    const navigate = useNavigate();
    const sectionRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const documentRef = useRef<HTMLDivElement>(null);
    const hillRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // 1. Initial State Set
            gsap.set([textRef.current, documentRef.current], { opacity: 0 });
            gsap.set(textRef.current, { y: 30 });
            gsap.set(documentRef.current, { scale: 0.9, rotate: -5 });

            // 2. Entrance Animation (Immediate)
            const entrance = gsap.timeline({
                defaults: { ease: "power3.out", duration: 1.2 }
            });

            entrance.to(textRef.current, {
                y: 0,
                opacity: 1,
                delay: 0.2
            });

            entrance.to(documentRef.current, {
                opacity: 1,
                scale: 1,
                rotate: 10.6,
                duration: 1.5,
                ease: "power4.out"
            }, "-=0.8");
        });

        return () => ctx.revert();
    }, []);

    return (
        <section ref={sectionRef} className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-background pt-20 pb-32 md:pt-32 md:pb-48">
            {/* Background Lighting Elements */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-accent blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-primary blur-[160px] rounded-full opacity-50"></div>
            </div>

            {/* Cinematic Hill Base */}
            <div
                ref={hillRef}
                className="absolute bottom-[-10%] w-[120%] h-[40%] bg-muted rounded-[100%] z-10 blur-sm brightness-95 transform"
            ></div>

            {/* Neural Workspace Content */}
            <div ref={textRef} className="relative z-20 text-center px-6 max-w-4xl transform">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-6">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                    </span>
                    The Claim Chart Architect
                </div>

                <h1 className="text-4xl md:text-6xl lg:text-7xl font-display leading-[0.95] tracking-tighter mb-8">
                    Architecting the <br />
                    <span className="italic text-accent decoration-accent/30 underline-offset-8">Future</span> <br />
                    of Patent Litigation.
                </h1>

                <p className="text-base md:text-lg text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed mb-10">
                    The neural workspace where chaotic claims become <span className="text-foreground font-medium">ironclad evidence</span>. Transform patent analysis into a deterministic verification workflow.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <button
                        onClick={() => navigate('/redirect')}
                        className="w-full sm:w-auto px-8 py-4 bg-accent text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-accent/20 text-base cursor-pointer"
                    >
                        Start Architecting Now
                    </button>
                    <button
                        onClick={() => document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' })}
                        className="w-full sm:w-auto px-8 py-4 glass text-foreground rounded-2xl font-bold hover:bg-white/10 transition-all border-white/10 text-base cursor-pointer"
                    >
                        Watch Demo
                    </button>
                </div>
            </div>

            {/* Levitating AI Judge Card */}
            <div
                ref={documentRef}
                className="mt-16 relative z-30 group cursor-pointer transform"
            >
                <div className="w-64 h-80 glass border-white/40 rounded-[2.5rem] shadow-2xl flex flex-col p-8 transition-all duration-700 group-hover:scale-105 group-hover:shadow-accent/30 group-hover:border-accent/50 bg-white/10 backdrop-blur-3xl">
                    <div className="w-16 h-1.5 bg-accent/40 rounded-full mb-6"></div>
                    <div className="w-full h-5 bg-foreground/10 rounded-lg mb-3"></div>
                    <div className="w-[70%] h-5 bg-foreground/10 rounded-lg mb-10"></div>

                    <div className="space-y-5">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="w-full h-2.5 bg-foreground/5 rounded-full overflow-hidden">
                                <div className="h-full bg-accent/10 w-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                        <div className="w-10 h-10 bg-accent/20 rounded-full animate-pulse border border-accent/20"></div>
                        <span className="text-[10px] font-bold font-mono text-accent tracking-tighter uppercase">AI Judge Ready</span>
                    </div>
                </div>

                {/* Ambient Particles */}
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-accent/30 blur-2xl rounded-full animate-pulse"></div>
                <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-primary/30 blur-2xl rounded-full opacity-50"></div>
            </div>
        </section>
    );
};

export default Hero;
