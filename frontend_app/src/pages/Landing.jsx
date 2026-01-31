import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ChevronRight, Skull, Target, Crosshair, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Landing = () => {
    const [hovered, setHovered] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleStartGame = async () => {
        setLoading(true);
        try {
            // Create Guest Player
            const username = `Commander-${Math.floor(Math.random() * 10000)}`;
            // Note: Check if backend URL is env var or proxy. For now assuming localhost:8080 via proxy or direct
            // Ideally we setup a proxy in vite.config.js, for now direct absolute for stability
            const response = await axios.post('http://127.0.0.1:8080/api/v1/players/', {
                username: username
            });

            // Save session
            localStorage.setItem('cixus_player', JSON.stringify(response.data));

            // Navigate
            navigate('/dashboard');
        } catch (error) {
            console.error("Connection Failed:", error);
            alert("Server connection failed. Ensure backend is running.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-obsidian-950 text-obsidian-500 overflow-x-hidden selection:bg-crimson-900 selection:text-white">

            {/* Hero Section */}
            <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
                {/* Background Ambience */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#450E0E_0%,_transparent_60%)] animate-pulse-slow"></div>
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-crimson-900 rounded-full blur-[100px] opacity-30"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="z-10 text-center max-w-4xl px-6"
                >
                    <h1 className="text-6xl md:text-9xl tracking-tighter font-bold text-obsidian-400 mb-2">
                        CIXUS <span className="text-crimson-700">RAGE</span>
                    </h1>
                    <p className="text-obsidian-600 tracking-[0.2em] text-sm md:text-lg uppercase mb-12 font-mono">
                        War ends only when the General dies
                    </p>

                    <motion.button
                        onClick={handleStartGame}
                        disabled={loading}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        whileTap={{ scale: 0.98 }}
                        className={`
                relative group px-16 py-5 border border-gold-700/50 
                bg-transparent hover:bg-gold-900/10 transition-all duration-500
                flex items-center justify-center mx-auto gap-4 disabled:opacity-50 disabled:cursor-not-allowed
            `}
                    >
                        <span className={`
                font-mono text-xl tracking-[0.2em] font-bold uppercase transition-colors duration-300
                ${hovered ? 'text-gold-400' : 'text-gold-500'}
            `}>
                            {loading ? 'INITIALIZING...' : 'ASSERT COMMAND'}
                        </span>
                        <ChevronRight className={`
                w-6 h-6 transition-transform duration-300
                ${hovered ? 'text-gold-400 translate-x-2' : 'text-gold-700'}
            `} />

                        {/* Corner Decors */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold-700"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold-700"></div>
                    </motion.button>
                </motion.div>
            </section>

            {/* Description / Lore Section */}
            <section className="relative py-32 bg-obsidian-900/30 border-t border-obsidian-800">
                <div className="max-w-6xl mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">

                    <div className="space-y-8">
                        <h2 className="text-4xl font-bold tracking-tight text-obsidian-300">
                            A NEW ERA OF <span className="text-crimson-600">CONFLICT</span>
                        </h2>
                        <p className="text-lg text-obsidian-500 leading-relaxed">
                            Cixus Rage is a live tactical judgement engine. You do not just move units;
                            you prove your worthiness to lead them.
                        </p>
                        <p className="text-lg text-obsidian-500 leading-relaxed">
                            Every order you issue is evaluated by Cixus, the Meta-Intelligence.
                            Cowardice is punished. Brilliance is rewarded with Authority.
                        </p>

                        <div className="grid grid-cols-2 gap-6 pt-8">
                            <div className="border-l-2 border-crimson-800 pl-4">
                                <Crosshair className="w-6 h-6 text-crimson-700 mb-2" />
                                <h4 className="font-mono text-sm text-obsidian-400 uppercase">Perma-Death</h4>
                                <p className="text-xs text-obsidian-600 mt-1">Generals die. Wars end. No respawns.</p>
                            </div>
                            <div className="border-l-2 border-gold-800 pl-4">
                                <Target className="w-6 h-6 text-gold-700 mb-2" />
                                <h4 className="font-mono text-sm text-obsidian-400 uppercase">Natural Language</h4>
                                <p className="text-xs text-obsidian-600 mt-1">Command armies with your own words.</p>
                            </div>
                        </div>
                    </div>

                    {/* Visual Abstract - Replaces a generic image */}
                    <div className="relative h-[400px] bg-obsidian-950 border border-obsidian-800 p-8 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(20,minmax(0,1fr))] opacity-10">
                            {Array.from({ length: 400 }).map((_, i) => (
                                <div key={i} className="border-[0.5px] border-obsidian-700" />
                            ))}
                        </div>
                        <div className="relative z-10 text-center space-y-4">
                            <Skull className="w-20 h-20 text-crimson-900 mx-auto animate-pulse" />
                            <div className="font-mono text-xs text-crimson-800 tracking-widest">AWAITING INPUT</div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-obsidian-800 bg-obsidian-950 text-center">
                <p className="text-obsidian-700 text-xs font-mono uppercase tracking-widest">
                    Cixus Rage © 2149 // Authorized Personnel Only
                </p>
            </footer>

        </div>
    );
};

export default Landing;
