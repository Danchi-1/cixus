import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ChevronRight, Skull } from 'lucide-react';

const Landing = () => {
    const [hovered, setHovered] = useState(false);

    return (
        <div className="relative min-h-screen bg-obsidian-950 flex flex-col items-center justify-center overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_#450E0E_0%,_transparent_60%)] animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-crimson-900 rounded-full blur-[100px] opacity-30"></div>
            </div>

            {/* Main Content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="z-10 text-center max-w-2xl px-6"
            >
                {/* Title */}
                <h1 className="text-6xl md:text-8xl tracking-tighter font-bold text-obsidian-500 mb-2">
                    CIXUS <span className="text-crimson-700">RAGE</span>
                </h1>
                <p className="text-obsidian-600 tracking-widest text-sm md:text-base uppercase mb-12 font-mono">
                    War ends only when the General dies
                </p>

                {/* Start Button */}
                <motion.button
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    whileTap={{ scale: 0.98 }}
                    className={`
            relative group px-12 py-4 border border-gold-700/50 
            bg-transparent hover:bg-gold-900/10 transition-all duration-500
            flex items-center justify-center mx-auto gap-4
          `}
                >
                    {/* Authentic Military Aesthetic - No Glows */}
                    <span className={`
            font-mono text-lg tracking-[0.2em] font-bold uppercase transition-colors duration-300
            ${hovered ? 'text-gold-400' : 'text-gold-500'}
          `}>
                        Enter Simulation
                    </span>

                    {/* Icon */}
                    <ChevronRight className={`
            w-5 h-5 transition-transform duration-300
            ${hovered ? 'text-gold-400 translate-x-1' : 'text-gold-700'}
          `} />

                    {/* Corner Decors */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold-700"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold-700"></div>
                </motion.button>

                {/* Warning Footer */}
                <div className="mt-24 flex items-center justify-center gap-3 opacity-60">
                    <ShieldAlert className="w-4 h-4 text-crimson-800" />
                    <span className="text-xs text-crimson-800 font-mono tracking-widest uppercase">
                        Clearance Level: UNVERIFIED
                    </span>
                </div>

            </motion.div>
        </div>
    );
};

export default Landing;
