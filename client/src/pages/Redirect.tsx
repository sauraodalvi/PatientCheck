import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Redirect: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/app');
        }, 1500);
        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
            <div className="relative w-24 h-24 mb-12">
                <div className="absolute inset-0 bg-accent/20 blur-2xl rounded-full animate-pulse"></div>
                <div className="absolute inset-4 border-2 border-accent rounded-full border-t-transparent animate-spin"></div>
            </div>

            <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <h2 className="text-3xl font-display italic">Entering the Workspace</h2>
                <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-[0.3em]">Preparing cinematic tools...</p>
            </div>
        </div>
    );
};

export default Redirect;
