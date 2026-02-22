import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, ChevronRight, Skull, Target, Crosshair,
    Zap, Shield, Radio, Eye, AlertTriangle, Activity,
    ArrowDown, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ToastContainer, useToasts } from '../components/ErrorToast';
import TacticsShowcase from '../components/TacticsShowcase';

// ── Static data ────────────────────────────────────────────────────────────
const HOW_IT_WORKS = [
    {
        step: '01',
        title: 'Assert Command',
        desc: 'Enter the war room. Cixus assigns your identity. No account creation required — your presence is enough.',
        icon: Crosshair,
        color: 'text-gold-500',
        border: 'border-gold-900/40',
    },
    {
        step: '02',
        title: 'Issue Orders',
        desc: 'Deploy units, flank, charge, recon. Every tactical decision is processed by Cixus\'s judgment engine in real time.',
        icon: Radio,
        color: 'text-crimson-500',
        border: 'border-crimson-900/40',
    },
    {
        step: '03',
        title: 'Earn Authority',
        desc: 'Cixus rewards brilliance and punishes cowardice. Authority is not given — it is drawn from consequence.',
        icon: Shield,
        color: 'text-gold-600',
        border: 'border-gold-900/40',
    },
    {
        step: '04',
        title: 'Win or Fall',
        desc: 'Generals die. Wars end. The battlefield remembers every commander — the ruthless and the broken alike.',
        icon: Skull,
        color: 'text-crimson-700',
        border: 'border-crimson-900/40',
    },
];

const FEATURES = [
    {
        icon: Zap,
        title: 'Cixus AI Judgment',
        desc: 'An autonomous meta-intelligence evaluates every command you issue. Tactical brilliance is rewarded. Hesitation is punished.',
        tag: 'AI-POWERED',
    },
    {
        icon: Eye,
        title: 'Fog of War',
        desc: 'Enemy positions are hidden beyond your intelligence radius. Push recon or fight blind.',
        tag: 'TACTICAL',
    },
    {
        icon: Radio,
        title: 'Enemy Comms Intercept',
        desc: 'Fragments of enemy transmissions bleed through the noise. Act on them — or ignore them at your peril.',
        tag: 'INTELLIGENCE',
    },
    {
        icon: Activity,
        title: 'Dynamic War Phases',
        desc: 'Early Conflict escalates to Engagement and beyond. The battlefield evolves regardless of your pace.',
        tag: 'LIVE',
    },
    {
        icon: AlertTriangle,
        title: 'Authority Decay',
        desc: 'Issue reckless orders and watch your neural sync destabilize. Command collapse is real.',
        tag: 'RISK',
    },
    {
        icon: Target,
        title: 'Unit Inspector',
        desc: 'Click any unit on the tactical grid to inspect health, position, status and threat level in real time.',
        tag: 'INTERFACE',
    },
];

const STATS = [
    { value: '∞', label: 'Possible Engagements' },
    { value: '0', label: 'Respawns' },
    { value: '1', label: 'Judge — Cixus' },
    { value: '∞', label: 'Ways to Fall' },
];

const TESTIMONIALS = [
    { callsign: 'IRON-WOLF-47', text: 'I issued a reckless flank. Cixus docked 30 authority in a single turn. I earned it back by turn 9.' },
    { callsign: 'SHADOW-BLADE-03', text: 'The fog is what gets you. I sent recon too late. Lost my entire western flank in silence.' },
    { callsign: 'GHOST-FANG-92', text: 'No game has ever made me feel the weight of a bad decision like this one does.' },
];

// ─────────────────────────────────────────────────────────────────────────────

const Landing = () => {
    const [loading, setLoading] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [ticker, setTicker] = useState(0);
    const navigate = useNavigate();
    const { toasts, pushToast, dismissToast } = useToasts();

    // Rotating callsign ticker in hero
    const CALLSIGNS = ['IRON-WOLF-47', 'GHOST-FANG-12', 'VOID-LANCE-88', 'ASHEN-PYRE-39', 'DARK-CROW-71'];
    useEffect(() => {
        const t = setInterval(() => setTicker(p => (p + 1) % CALLSIGNS.length), 2500);
        return () => clearInterval(t);
    }, []);

    const handleStartGame = async () => {
        setLoading(true);
        try {
            const response = await api.post('/api/v1/players/identify');
            const player = response.data;
            localStorage.setItem('cixus_player', JSON.stringify(player));

            if (player.returning) {
                pushToast({ message: `Identity confirmed: Commander ${player.username}. Welcome back.`, type: 'success', duration: 2500 });
            } else {
                pushToast({ message: `Callsign assigned: ${player.username}. Proceed to command.`, type: 'info', duration: 2500 });
            }
            setTimeout(() => navigate('/dashboard'), 1100);
        } catch (error) {
            console.error('Connection Failed:', error);
            pushToast({ message: error.response?.data?.detail || 'Server connection failed. Ensure backend is running.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-obsidian-950 text-obsidian-500 overflow-x-hidden selection:bg-crimson-900 selection:text-white">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* ══════════════════════════════════════════════════════════════
                1. HERO
            ══════════════════════════════════════════════════════════════ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4">

                {/* Background ambience */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_rgba(69,14,14,0.4)_0%,_transparent_65%)]" />
                    <div className="absolute bottom-0 right-0 w-80 h-80 sm:w-[500px] sm:h-[500px] bg-crimson-950 rounded-full blur-[100px] opacity-20" />
                    <div className="absolute top-1/3 left-0 w-64 h-64 bg-gold-950 rounded-full blur-[120px] opacity-10" />
                </div>

                {/* Scan line grid */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, #ffffff 0px, transparent 1px, transparent 4px)' }} />

                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.1, ease: 'easeOut' }}
                    className="z-10 text-center max-w-4xl w-full"
                >
                    {/* Status badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-obsidian-800 bg-obsidian-900/60 rounded-sm text-[9px] font-mono tracking-[0.25em] text-obsidian-600 uppercase mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        CIXUS COMMAND NETWORK — ONLINE
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-[9rem] tracking-tighter font-black text-obsidian-400 leading-none mb-3">
                        CIXUS <span className="text-crimson-700">RAGE</span>
                    </h1>

                    <p className="text-obsidian-600 tracking-[0.2em] text-xs sm:text-base uppercase mb-4 font-mono">
                        War ends only when the General dies
                    </p>

                    {/* Rotating callsign ticker */}
                    <div className="flex items-center justify-center gap-3 mb-10 h-7">
                        <span className="text-[9px] text-obsidian-700 tracking-[0.2em] uppercase font-mono">CURRENT FIELD CDR:</span>
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={ticker}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 8 }}
                                transition={{ duration: 0.3 }}
                                className="text-[10px] font-bold text-gold-600 font-mono tracking-widest"
                            >
                                {CALLSIGNS[ticker]}
                            </motion.span>
                        </AnimatePresence>
                    </div>

                    {/* CTA button */}
                    <motion.button
                        onClick={handleStartGame}
                        disabled={loading}
                        onMouseEnter={() => setHovered(true)}
                        onMouseLeave={() => setHovered(false)}
                        whileTap={{ scale: 0.97 }}
                        className="relative group px-12 sm:px-16 py-4 sm:py-5 border border-gold-700/50 bg-transparent hover:bg-gold-900/10 transition-all duration-500 flex items-center justify-center mx-auto gap-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className={`font-mono text-lg sm:text-xl tracking-[0.2em] font-bold uppercase transition-colors duration-300 ${hovered ? 'text-gold-400' : 'text-gold-500'}`}>
                            {loading ? 'INITIALIZING...' : 'ASSERT COMMAND'}
                        </span>
                        <ChevronRight className={`w-5 h-5 transition-all duration-300 ${hovered ? 'text-gold-400 translate-x-2' : 'text-gold-700'}`} />
                        {/* Corner decors */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-gold-700" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-gold-700" />
                    </motion.button>

                    <p className="mt-4 text-[9px] text-obsidian-800 font-mono tracking-widest uppercase">
                        No registration required — identity inferred from field signal
                    </p>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 text-obsidian-800"
                >
                    <ArrowDown className="w-5 h-5" />
                </motion.div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                2. STATS BAR
            ══════════════════════════════════════════════════════════════ */}
            <section className="border-y border-obsidian-800 bg-obsidian-900/40">
                <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4">
                    {STATS.map(({ value, label }, i) => (
                        <div key={label} className={`py-6 px-4 text-center ${i < STATS.length - 1 ? 'border-r border-obsidian-800/50' : ''}`}>
                            <div className="text-3xl sm:text-4xl font-black text-crimson-700 tracking-tighter mb-1">{value}</div>
                            <div className="text-[9px] text-obsidian-700 tracking-[0.2em] uppercase font-mono">{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                3. WHAT IS CIXUS RAGE
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-20 sm:py-32 px-4 bg-obsidian-900/20 border-b border-obsidian-800">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-20 items-center">
                    <div className="space-y-6">
                        <p className="text-[9px] text-crimson-700 tracking-[0.3em] uppercase font-mono font-bold">// ABOUT THE ENGINE</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-obsidian-300 leading-tight">
                            A NEW ERA OF <span className="text-crimson-600">CONFLICT</span>
                        </h2>
                        <p className="text-sm sm:text-base text-obsidian-500 leading-relaxed">
                            Cixus Rage is a live tactical judgement engine. You do not just move units —
                            you prove your worthiness to lead them.
                        </p>
                        <p className="text-sm sm:text-base text-obsidian-500 leading-relaxed">
                            Every order you issue is evaluated by <strong className="text-crimson-600">Cixus</strong>, the Meta-Intelligence.
                            Cowardice is punished. Brilliance is rewarded with Authority. There are no respawns.
                            There is no undo. The battlefield remembers.
                        </p>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            {[
                                { Icon: Crosshair, label: 'Perma-Death', sub: 'Generals die. Wars end.', c: 'crimson' },
                                { Icon: Target, label: 'Natural Language', sub: 'Command with your words.', c: 'gold' },
                                { Icon: Shield, label: 'Authority System', sub: 'Earn or lose command.', c: 'gold' },
                                { Icon: Skull, label: 'No Mercy', sub: 'Cixus never forgives recklessness.', c: 'crimson' },
                            ].map(({ Icon, label, sub, c }) => (
                                <div key={label} className={`border-l-2 ${c === 'crimson' ? 'border-crimson-800' : 'border-gold-800'} pl-4`}>
                                    <Icon className={`w-5 h-5 ${c === 'crimson' ? 'text-crimson-700' : 'text-gold-700'} mb-1.5`} />
                                    <h4 className="font-mono text-xs font-bold text-obsidian-400 uppercase">{label}</h4>
                                    <p className="text-[10px] text-obsidian-600 mt-0.5 leading-relaxed">{sub}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Visual */}
                    <div className="relative h-64 sm:h-[420px] bg-obsidian-950 border border-obsidian-800 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 grid grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-[repeat(20,minmax(0,1fr))] opacity-10 pointer-events-none">
                            {Array.from({ length: 400 }).map((_, i) => (
                                <div key={i} className="border-[0.5px] border-obsidian-700" />
                            ))}
                        </div>
                        {/* Animated unit blips */}
                        {[
                            { top: '30%', left: '25%', color: 'bg-crimson-500', delay: 0 },
                            { top: '55%', left: '40%', color: 'bg-crimson-600', delay: 0.4 },
                            { top: '45%', left: '70%', color: 'bg-cyan-600', delay: 0.8 },
                            { top: '20%', left: '65%', color: 'bg-cyan-700', delay: 1.2 },
                            { top: '70%', left: '60%', color: 'bg-cyan-500', delay: 0.6 },
                        ].map((b, i) => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                                transition={{ repeat: Infinity, duration: 2, delay: b.delay }}
                                className={`absolute w-2.5 h-2.5 rounded-full ${b.color}`}
                                style={{ top: b.top, left: b.left }}
                            />
                        ))}
                        <div className="relative z-10 text-center">
                            <Skull className="w-16 h-16 sm:w-20 sm:h-20 text-crimson-950 mx-auto animate-pulse" />
                            <div className="font-mono text-[9px] text-crimson-900 tracking-widest mt-2 uppercase">AWAITING COMMAND</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                4. HOW IT WORKS
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-20 sm:py-28 px-4 border-b border-obsidian-800">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <p className="text-[9px] text-gold-700 tracking-[0.3em] uppercase font-mono mb-3">// OPERATIONAL BRIEFING</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-obsidian-300">HOW IT WORKS</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon, color, border }, i) => (
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`bg-obsidian-900/30 border ${border} p-5 sm:p-6 rounded-sm relative overflow-hidden group hover:bg-obsidian-900/60 transition-all`}
                            >
                                <div className="text-[40px] sm:text-[56px] font-black text-obsidian-900 absolute top-2 right-3 leading-none pointer-events-none select-none group-hover:text-obsidian-800 transition-colors">
                                    {step}
                                </div>
                                <Icon className={`w-6 h-6 ${color} mb-4 relative z-10`} />
                                <h3 className="font-bold text-obsidian-300 text-sm mb-2 relative z-10">{title}</h3>
                                <p className="text-[11px] text-obsidian-600 leading-relaxed relative z-10">{desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                5. FEATURES GRID
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-20 sm:py-28 px-4 bg-obsidian-900/20 border-b border-obsidian-800">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-12 sm:mb-16">
                        <p className="text-[9px] text-crimson-700 tracking-[0.3em] uppercase font-mono mb-3">// TACTICAL SYSTEMS</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-obsidian-300">BATTLEFIELD FEATURES</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {FEATURES.map(({ icon: Icon, title, desc, tag }, i) => (
                            <motion.div
                                key={title}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07 }}
                                className="bg-obsidian-950/60 border border-obsidian-800 p-5 rounded-sm hover:border-obsidian-700 transition-all group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <Icon className="w-5 h-5 text-crimson-700 group-hover:text-crimson-500 transition-colors" />
                                    <span className="text-[7px] font-bold tracking-[0.2em] text-obsidian-700 border border-obsidian-800 px-1.5 py-0.5 rounded-sm uppercase">{tag}</span>
                                </div>
                                <h3 className="font-bold text-obsidian-300 text-sm mb-2">{title}</h3>
                                <p className="text-[11px] text-obsidian-600 leading-relaxed">{desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                6. TACTICS SHOWCASE
            ══════════════════════════════════════════════════════════════ */}
            <TacticsShowcase />

            {/* ══════════════════════════════════════════════════════════════
                7. FIELD REPORTS (Testimonials)
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-20 sm:py-28 px-4 border-b border-obsidian-800">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <p className="text-[9px] text-obsidian-700 tracking-[0.3em] uppercase font-mono mb-3">// AFTER-ACTION REPORTS</p>
                        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-obsidian-300">FROM THE FIELD</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        {TESTIMONIALS.map(({ callsign, text }, i) => (
                            <motion.div
                                key={callsign}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.12 }}
                                className="bg-obsidian-900/30 border border-obsidian-800 p-5 rounded-sm"
                            >
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-2.5 h-2.5 text-gold-700 fill-gold-700" />
                                    ))}
                                </div>
                                <p className="text-xs text-obsidian-500 leading-relaxed mb-4 italic">"{text}"</p>
                                <p className="text-[9px] font-bold font-mono text-obsidian-600 tracking-widest uppercase">— CDR {callsign}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                7. FINAL CTA
            ══════════════════════════════════════════════════════════════ */}
            <section className="py-24 sm:py-36 px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,_rgba(69,14,14,0.3)_0%,_transparent_70%)] pointer-events-none" />
                <div className="max-w-2xl mx-auto text-center relative z-10">
                    <Skull className="w-12 h-12 text-crimson-900 mx-auto mb-6 animate-pulse" />
                    <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-obsidian-300 mb-4">
                        THE BATTLEFIELD<br />DOES NOT WAIT
                    </h2>
                    <p className="text-sm text-obsidian-600 mb-10 leading-relaxed max-w-md mx-auto">
                        Every second you hesitate is a second the enemy uses to fortify. Assert your command now.
                    </p>
                    <motion.button
                        onClick={handleStartGame}
                        disabled={loading}
                        whileTap={{ scale: 0.97 }}
                        className="relative group px-12 py-4 border border-crimson-700/60 bg-crimson-900/10 hover:bg-crimson-900/30 transition-all duration-400 flex items-center justify-center mx-auto gap-4 disabled:opacity-50 rounded-sm"
                    >
                        <ShieldAlert className="w-5 h-5 text-crimson-600" />
                        <span className="font-mono text-lg tracking-[0.2em] font-bold uppercase text-crimson-500">
                            {loading ? 'INITIALIZING...' : 'ENTER WAR ROOM'}
                        </span>
                    </motion.button>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="py-10 border-t border-obsidian-900 bg-obsidian-950 text-center px-4">
                <div className="flex items-center justify-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[9px] font-mono text-obsidian-800 tracking-[0.25em] uppercase">Cixus Command Network Online</span>
                </div>
                <p className="text-[9px] text-obsidian-900 font-mono uppercase tracking-widest">
                    Cixus Rage © 2149 // Authorized Personnel Only
                </p>
            </footer>
        </div>
    );
};

export default Landing;
