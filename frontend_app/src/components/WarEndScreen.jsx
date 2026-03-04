import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Swords, ChevronRight, Cpu, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Cixus final verdicts keyed by outcome × top reputation trait
const CIXUS_VERDICTS = {
    SURVIVED: {
        Ruthless: "You won the only way that matters. They will remember your name.",
        Aggressive: "Violence applied with conviction. The battlefield bowed.",
        Cunning: "You read the board before they made their first move. Decisive.",
        Calculated: "Methodical. Cold. Effective. The rarest combination in warfare.",
        Decisive: "You hesitated once. Only once. The rest was execution.",
        default: "The enemy Warlord fell. Whatever you are — it worked.",
    },
    FELL: {
        Hesitant: "You gave the enemy time. Time is the only currency that cannot be recovered.",
        Reckless: "Courage without calibration is just momentum toward the wrong wall.",
        Defensive: "You chose ground over tempo. The ground is still theirs.",
        Aggressive: "Force without direction. You bled where they wanted you to bleed.",
        default: "The commander fell. Every death is a data point. Learn it.",
    },
};

function getCixusVerdict(outcome, reputation) {
    const verdicts = CIXUS_VERDICTS[outcome] || CIXUS_VERDICTS.FELL;
    if (reputation && Object.keys(reputation).length > 0) {
        const topTrait = Object.entries(reputation).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topTrait && verdicts[topTrait]) return verdicts[topTrait];
    }
    return verdicts.default;
}

const WarEndScreen = ({ outcome, gameState, warId, aiModelActive }) => {
    const navigate = useNavigate();
    const survived = outcome === 'SURVIVED';

    // Pull stats from localStorage (most up-to-date after last command)
    const stored = (() => { try { return JSON.parse(localStorage.getItem('cixus_player') || '{}'); } catch { return {}; } })();
    const turn = gameState?.turn ?? 0;
    const ap = stored.authority_points ?? gameState?.player_authority ?? 0;
    const totalAp = stored.total_ap_earned ?? 0;
    const rep = stored.reputation ?? {};
    const topTrait = Object.entries(rep).sort((a, b) => b[1] - a[1])[0];
    const level = stored.authority_level ?? 1;
    const LEVEL_LABELS = { 1: 'Recruit', 2: 'Field Operative', 3: 'War Veteran', 4: 'Battle Commander', 5: 'Supreme Warlord' };

    const verdict = getCixusVerdict(outcome, rep);

    const accent = survived ? 'gold' : 'crimson';

    useEffect(() => {
        // Clear the active war from localStorage cache if fell — don't auto-clear if survived, player may want to review
        return () => { };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-obsidian-950/95 backdrop-blur-sm"
        >
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)' }} />

            <div className="relative w-full max-w-lg mx-4">
                {/* Top accent bar */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`h-0.5 w-full mb-6 origin-left ${survived ? 'bg-gold-500' : 'bg-crimson-600'}`}
                />

                {/* Outcome header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-center mb-8"
                >
                    <p className="text-[9px] font-mono tracking-[0.3em] text-obsidian-600 uppercase mb-2">
                        // ENGAGEMENT TERMINATED
                    </p>
                    <h1 className={`text-5xl sm:text-6xl font-black tracking-tighter mb-1
                        ${survived ? 'text-gold-400' : 'text-crimson-500'}`}>
                        {survived ? 'SURVIVED' : 'FELL'}
                    </h1>
                    <p className="text-[10px] text-obsidian-600 font-mono tracking-widest uppercase">
                        {survived ? 'Enemy Warlord Eliminated' : 'Commander Down — Operation Failed'}
                    </p>
                </motion.div>

                {/* Stats grid */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-3 gap-3 mb-6"
                >
                    {[
                        { label: 'TURNS', value: `T-${turn}` },
                        { label: 'AUTH. POINTS', value: `${ap} AP` },
                        { label: 'LEVEL', value: LEVEL_LABELS[level] || `LVL ${level}` },
                    ].map(({ label, value }) => (
                        <div key={label} className="bg-obsidian-900/60 border border-obsidian-800 rounded-sm p-3 text-center">
                            <p className="text-[8px] text-obsidian-700 font-mono tracking-widest uppercase mb-1">{label}</p>
                            <p className="text-xs font-bold text-obsidian-300 font-mono">{value}</p>
                        </div>
                    ))}
                </motion.div>

                {/* Top reputation trait */}
                {topTrait && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center justify-center gap-2 mb-6"
                    >
                        <Shield className="w-3 h-3 text-obsidian-600" />
                        <p className="text-[9px] text-obsidian-600 font-mono tracking-widest uppercase">
                            Known as — <span className={`font-bold ${survived ? 'text-gold-600' : 'text-crimson-600'}`}>
                                {topTrait[0].toUpperCase()}
                            </span> ({Math.round(topTrait[1] * 100)}%)
                        </p>
                    </motion.div>
                )}

                {/* AI model indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.65 }}
                    className="flex items-center justify-center gap-2 mb-6"
                >
                    {aiModelActive ? (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-obsidian-900/60 border border-obsidian-700 rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold-500" />
                            </span>
                            <Cpu className="w-3 h-3 text-gold-600" />
                            <span className="text-[8px] font-mono text-gold-700 tracking-widest uppercase">Gemini AI Active</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-obsidian-900/60 border border-obsidian-800 rounded-full">
                            <AlertTriangle className="w-3 h-3 text-obsidian-600" />
                            <span className="text-[8px] font-mono text-obsidian-600 tracking-widest uppercase">Manual Mode</span>
                        </div>
                    )}
                </motion.div>

                {/* Cixus final verdict */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.75 }}
                    className="border-l-2 border-obsidian-700 pl-4 mb-8"
                >
                    <p className="text-[9px] text-obsidian-700 font-mono tracking-widest uppercase mb-1.5">CIXUS //</p>
                    <p className="text-sm text-obsidian-400 italic leading-relaxed">{verdict}</p>
                </motion.div>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex gap-3"
                >
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-obsidian-900/40 border border-obsidian-700 text-obsidian-400 text-xs font-mono uppercase tracking-wider hover:bg-obsidian-800/60 hover:text-obsidian-200 transition-all rounded-sm"
                    >
                        Return to Base
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-mono uppercase tracking-wider transition-all rounded-sm
                            ${survived
                                ? 'bg-gold-900/20 border border-gold-800 text-gold-500 hover:bg-gold-900/40'
                                : 'bg-crimson-900/20 border border-crimson-800 text-crimson-500 hover:bg-crimson-900/40'
                            }`}
                    >
                        <Swords className="w-3.5 h-3.5" />
                        New Conflict
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </motion.div>

                {/* Bottom accent */}
                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`h-0.5 w-full mt-6 origin-right ${survived ? 'bg-gold-500' : 'bg-crimson-600'}`}
                />
            </div>
        </motion.div>
    );
};

export default WarEndScreen;
