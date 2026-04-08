import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout } from 'lucide-react';
import { cn } from '../lib/utils';

const Navbar: React.FC = () => {
    const location = useLocation();
    const isDashboard = location.pathname.startsWith('/app');

    if (isDashboard) return null;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-6 pointer-events-none bg-gradient-to-b from-background via-background/50 to-transparent pb-20">
            <div className="w-full max-w-5xl h-14 glass flex items-center justify-between px-6 rounded-2xl pointer-events-auto border-white/20">
                <Link to="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg shadow-accent/20">
                        <Layout size={18} className="text-white" />
                    </div>
                    <span className="font-display text-xl font-bold tracking-tight">Lumenci</span>
                </Link>

                <div className="flex items-center gap-8 text-sm font-medium">

                    <Link to="/about" className="text-foreground hover:text-accent transition-colors">The Creator</Link>
                    <Link
                        to="/redirect"
                        className="px-4 py-2 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                        Launch App
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
