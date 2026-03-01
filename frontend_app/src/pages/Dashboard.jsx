import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Skull, Terminal, Swords, ChevronRight, LogOut, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { ToastContainer, useToasts } from '../components/ErrorToast';

const Dashboard = () => {
    const navigate = useNavigate();
    const [player, setPlayer] = useState(null);
    const [loadingWar, setLoadingWar] = useState(false);
    const [activeWars, setActiveWars] = useState([]);
    const { toasts, pushToast, dismissToast } = useToasts();

    useEffect(() => {
        const storedPlayer = localStorage.getItem('cixus_player');
        if (!storedPlayer) { navigate('/'); return; }
        const parsedPlayer = JSON.parse(storedPlayer);
        setPlayer(parsedPlayer);

        const fetchWars = async () => {
            try {
                const res = await api.get(`/api/v1/war/active?player_id=${parsedPlayer.id}`);
                setActiveWars(res.data);
            } catch (err) {
                console.error('Failed to load wars:', err);
                pushToast({ message: `Failed to load conflicts: ${err.response?.data?.detail || err.message}`, type: 'error' });
            }
        };
        fetchWars();

    }, [navigate]);

    const handleInitializeWar = async () => {
        if (!player) return;
        setLoadingWar(true);
        try {
            const res = await api.post('/api/v1/war/start', { player_id: player.id, difficulty: 1 });
            pushToast({ message: `Conflict Initialized: Session ${res.data.war_id.substring(0, 8)}...`, type: 'success' });
            setTimeout(() => navigate(`/war/${res.data.war_id}`), 1200);
        } catch (err) {
            pushToast({ message: `Initialization Failed: ${err.message}`, type: 'error' });
        } finally {
            setLoadingWar(false);
        }
    };

    const handleDisconnect = () => {
        localStorage.removeItem('cixus_player');
        navigate('/');
    };

    if (!player) return null;

    const authorityPct = Math.min(100, (player.authority_points || 100));

    // Top 3 reputation traits sorted by value, fallback when no data yet
    const repTags = Object.entries(player.reputation || {})
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k.toUpperCase());
    const displayTags = repTags.length >= 3 ? repTags : ['UNKNOWN', 'RISING', 'UNTESTED'].slice(0, 3 - repTags.length).concat(repTags).reverse();

    return (
        <div className="min-h-screen bg-obsidian-950 text-obsidian-500 overflow-x-hidden">
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-obsidian-950/90 backdrop-blur-md border-b border-obsidian-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">

                    {/* Identity */}
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl font-bold tracking-tighter text-obsidian-300 truncate">
                            CDR <span className="text-crimson-600">{player.username?.toUpperCase()}</span>
                        </h1>
                        <p className="text-[9px] sm:text-[10px] font-mono text-obsidian-700 tracking-widest uppercase">
                            LVL {player.authority_level || 1} // ACTIVE
                        </p>
                    </div>

                    {/* Right controls */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* AP badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-900 border border-obsidian-800 rounded-sm">
                            <Shield className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                            <span className="font-mono text-xs text-gold-500 whitespace-nowrap">{player.authority_points || 100} AP</span>
                        </div>
                        {/* Disconnect */}
                        <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-obsidian-900/50 border border-obsidian-800 text-obsidian-500 hover:text-crimson-400 hover:border-crimson-900 active:scale-95 transition-all text-[10px] font-mono uppercase rounded-sm"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Disconnect</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* ── BODY ────────────────────────────────────────────────────── */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">

                {/* ── AUTHORITY BANNER (mobile full-width card) ───────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-obsidian-900/60 border border-obsidian-800 rounded-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Wifi className="w-4 h-4 text-gold-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-[9px] font-bold tracking-widest text-obsidian-500 uppercase mb-1.5">
                                <span>Command Authority</span>
                                <span className="text-gold-500">{player.authority_points || 100} / 100</span>
                            </div>
                            <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${authorityPct}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full bg-gold-500 rounded-full"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        {displayTags.map((tag, i) => (
                            <span key={tag} className={`px-2 py-0.5 text-[8px] font-bold tracking-widest border rounded-sm
                                ${i === 0 ? 'border-crimson-900/60 text-crimson-700 bg-crimson-950/30' :
                                    i === 1 ? 'border-gold-900/60 text-gold-700 bg-gold-950/20' :
                                        'border-obsidian-700 text-obsidian-600'}`}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </motion.div>

                {/* ── MAIN GRID: stacked on mobile, 3-col on desktop ──────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── LEFT SIDEBAR ──────────────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4 lg:space-y-5"
                    >
                        {/* Reputation card */}
                        <div className="bg-obsidian-900/50 border border-obsidian-800 p-5 rounded-sm relative overflow-hidden group hover:border-crimson-900/50 transition-colors">
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-15 transition-opacity pointer-events-none">
                                <Skull className="w-20 h-20 text-crimson-800" />
                            </div>
                            <h3 className="text-[10px] font-mono text-obsidian-600 uppercase tracking-widest mb-4">Reputation Metrics</h3>

                            {player.reputation && Object.keys(player.reputation).length > 0 ? (
                                <div className="space-y-3">
                                    {Object.entries(player.reputation)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([trait, value]) => {
                                            // Values are 0–1 floats; clamp & convert to %
                                            const pct = Math.min(100, Math.round(value * 100));
                                            const isHigh = pct >= 60;
                                            return (
                                                <div key={trait}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-obsidian-500 capitalize">{trait}</span>
                                                        <span className="text-obsidian-600 font-mono">{pct}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-obsidian-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-[width] duration-700 ease-out ${isHigh ? 'bg-crimson-700' : 'bg-gold-600'}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Skull className="w-8 h-8 text-obsidian-800 mx-auto mb-2" />
                                    <p className="text-[10px] text-obsidian-700 font-mono uppercase tracking-widest">No Combat History</p>
                                    <p className="text-[9px] text-obsidian-800 mt-1">Reputation builds through warfare.</p>
                                </div>
                            )}
                        </div>


                        {/* System logs card */}
                        <div className="bg-obsidian-900/30 border border-obsidian-800 p-5 rounded-sm hover:border-gold-900/30 transition-colors">
                            <h3 className="flex items-center gap-2 text-[10px] font-mono text-obsidian-600 uppercase tracking-widest mb-3">
                                <Terminal className="w-3.5 h-3.5" /> System Logs
                            </h3>
                            <div className="space-y-1.5 text-[10px] sm:text-xs font-mono text-obsidian-600">
                                <p>&gt; Connection established...</p>
                                <p>&gt; Synchronizing neural link...</p>
                                <p>&gt; <span className="text-crimson-600">WARNING:</span> Enemy movement detected.</p>
                                <p className="text-obsidian-700">&gt; Cixus observing. Awaiting command.</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── ACTIVE CONFLICTS (takes 2 cols on desktop) ────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-2 flex flex-col gap-4"
                    >
                        {/* Section header */}
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base sm:text-lg font-bold tracking-tight text-obsidian-400 flex items-center gap-2 min-w-0">
                                <Activity className="w-4 h-4 text-crimson-600 shrink-0" />
                                <span className="truncate">ACTIVE CONFLICTS</span>
                                {activeWars.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold bg-crimson-900/30 border border-crimson-800/50 text-crimson-500 rounded-sm shrink-0">
                                        {activeWars.length}
                                    </span>
                                )}
                            </h2>

                            {/* Initialize button — full width on mobile */}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleInitializeWar}
                                disabled={loadingWar}
                                className={`
                                    flex items-center gap-2 px-4 sm:px-5 py-2 shrink-0
                                    bg-crimson-900/20 border border-crimson-800 text-crimson-500
                                    transition-all duration-200 text-xs font-mono uppercase tracking-wider
                                    hover:bg-crimson-900/40 hover:shadow-[0_0_20px_rgba(176,37,37,0.25)]
                                    active:scale-95 rounded-sm
                                    ${loadingWar ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
                                `}
                            >
                                <Swords className={`w-3.5 h-3.5 shrink-0 ${loadingWar ? 'animate-spin' : ''}`} />
                                <span className="whitespace-nowrap">{loadingWar ? 'INITIALIZING...' : 'NEW CONFLICT'}</span>
                            </motion.button>
                        </div>

                        {/* War list */}
                        {activeWars.length > 0 ? (
                            <div className="grid gap-3">
                                {activeWars.map((war, idx) => (
                                    <motion.div
                                        key={war.war_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        onClick={() => navigate(`/war/${war.war_id}`)}
                                        className="bg-obsidian-900/40 border border-obsidian-800 p-4 rounded-sm flex items-center justify-between gap-4 cursor-pointer hover:bg-obsidian-800/50 hover:border-gold-800/40 transition-all group"
                                    >
                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-obsidian-300 group-hover:text-gold-400 transition-colors truncate">
                                                OPERATION {war.war_id.substring(0, 8).toUpperCase()}
                                            </h4>
                                            <p className="text-[10px] font-mono text-obsidian-600 mt-0.5">
                                                T-{war.turn} // {new Date(war.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <div className="px-2.5 py-1 bg-green-900/20 text-green-500 text-[9px] font-bold tracking-widest border border-green-900/50 rounded-sm">
                                                ACTIVE
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-obsidian-600 group-hover:text-gold-500 transition-colors" />
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex-1 border border-dashed border-obsidian-800 rounded-sm p-8 sm:p-14 flex flex-col items-center justify-center text-center bg-obsidian-900/10"
                            >
                                <div className="w-14 h-14 bg-obsidian-900 rounded-full flex items-center justify-center mb-4 border border-obsidian-800">
                                    <Activity className="w-7 h-7 text-obsidian-700" />
                                </div>
                                <h3 className="text-sm font-mono font-bold text-obsidian-600 uppercase tracking-widest mb-2">No Active Campaigns</h3>
                                <p className="text-obsidian-700 text-xs max-w-xs mb-6 leading-relaxed">
                                    Peace is a momentary graphical glitch. Initialize a conflict to begin conquest.
                                </p>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleInitializeWar}
                                    disabled={loadingWar}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-crimson-900/20 border border-crimson-800 text-crimson-500 text-xs font-mono uppercase tracking-wider hover:bg-crimson-900/40 transition-all rounded-sm"
                                >
                                    <Swords className="w-3.5 h-3.5" />
                                    {loadingWar ? 'INITIALIZING...' : 'BEGIN CAMPAIGN'}
                                </motion.button>
                            </motion.div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
