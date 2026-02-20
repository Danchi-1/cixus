import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Activity, Skull, Terminal, Swords } from 'lucide-react';
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
        // Mock Auth Check (Replace with real API call later)
        const storedPlayer = localStorage.getItem('cixus_player');
        if (!storedPlayer) {
            navigate('/');
            return;
        }
        const parsedPlayer = JSON.parse(storedPlayer);
        setPlayer(parsedPlayer);

        // Fetch Active Wars
        const fetchWars = async () => {
            try {
                const res = await api.get(`/api/v1/war/active?player_id=${parsedPlayer.id}`);
                setActiveWars(res.data);
            } catch (err) {
                console.error("Failed to load wars:", err);
            }
        };
        fetchWars();

    }, [navigate]);

    const showNotify = (msg, type = 'info') => {
        pushToast({ message: msg, type });
    };

    const handleInitializeWar = async () => {
        if (!player) return;
        setLoadingWar(true);
        try {
            const res = await api.post("/api/v1/war/start", {
                player_id: player.id,
                difficulty: 1
            });
            showNotify(`Conflict Initialized: Session ${res.data.war_id.substring(0, 8)}...`, 'success');
            setTimeout(() => navigate(`/war/${res.data.war_id}`), 1500); // Short delay for toast read
        } catch (err) {
            showNotify(`Initialization Failed: ${err.message}`, 'error');
        } finally {
            setLoadingWar(false);
        }
    };

    if (!player) return null;

    return (
        <div className="min-h-screen bg-obsidian-950 p-8 text-obsidian-500 overflow-hidden relative">

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* Header */}
            <header className="flex justify-between items-center mb-12 border-b border-obsidian-800 pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tighter text-obsidian-400">
                        COMMANDER <span className="text-crimson-600">{player.username.toUpperCase()}</span>
                    </h1>
                    <p className="text-xs font-mono text-obsidian-600 tracking-widest mt-1">
                        AUTHORITY LEVEL: {player.authority_level || 1} // STATUS: ACTIVE
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-obsidian-900 border border-obsidian-800 rounded-sm">
                        <Shield className="w-4 h-4 text-gold-500" />
                        <span className="font-mono text-sm text-gold-500">{player.authority_points || 100} AP</span>
                    </div>
                    <button
                        onClick={() => navigate('/')}
                        className="px-4 py-2 bg-obsidian-900/50 border border-obsidian-800 text-obsidian-500 hover:text-obsidian-300 hover:bg-obsidian-800 active:scale-95 transition-all duration-150 text-xs font-mono uppercase cursor-pointer"
                    >
                        Disconnect
                    </button>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Stats & Profile */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-6"
                >
                    {/* Reputation Card */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-obsidian-900/50 border border-obsidian-800 p-6 rounded-sm relative overflow-hidden group transition-colors hover:border-crimson-900/50"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Skull className="w-24 h-24 text-crimson-900" />
                        </div>
                        <h3 className="text-sm font-mono text-obsidian-600 uppercase mb-4">Reputation Metrics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Ruthlessness</span>
                                <div className="w-32 h-2 bg-obsidian-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-crimson-700 w-[65%]"></div>
                                </div>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Tactics</span>
                                <div className="w-32 h-2 bg-obsidian-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gold-600 w-[40%]"></div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Recent Comms */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="bg-obsidian-900/30 border border-obsidian-800 p-6 rounded-sm transition-colors hover:border-gold-900/30"
                    >
                        <h3 className="flex items-center gap-2 text-sm font-mono text-obsidian-600 uppercase mb-4">
                            <Terminal className="w-4 h-4" /> System Logs
                        </h3>
                        <div className="space-y-2 text-xs font-mono text-obsidian-500">
                            <p>&gt; Connection established...</p>
                            <p>&gt; Synchronizing neural link...</p>
                            <p>&gt; <span className="text-crimson-600">WARNING:</span> Enemy movement detected in Sector 4.</p>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Center Column: Active Conflicts */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="lg:col-span-2"
                >
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-xl font-bold tracking-tight text-obsidian-400 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-crimson-600" /> ACTIVE CONFLICTS
                        </h2>
                        <motion.button
                            whileHover={{ scale: 1.05, backgroundColor: "rgba(69, 14, 14, 0.4)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleInitializeWar}
                            disabled={loadingWar}
                            className={`
                                px-6 py-2 bg-crimson-900/20 border border-crimson-800 text-crimson-500 
                                transition-all duration-300 text-sm font-mono uppercase tracking-wider 
                                flex items-center gap-2 cursor-pointer select-none 
                                shadow-[0_0_10px_rgba(220,38,38,0.1)] hover:shadow-[0_0_20px_rgba(220,38,38,0.3)]
                                ${loadingWar ? 'opacity-50 cursor-wait' : ''}
                            `}
                        >
                            <Swords className={`w-4 h-4 ${loadingWar ? 'animate-spin' : ''}`} />
                            {loadingWar ? 'INITIALIZING...' : 'INITIALIZE CONFLICT'}
                        </motion.button>
                    </div>

                    {/* War List */}
                    {activeWars.length > 0 ? (
                        <div className="grid gap-4">
                            {activeWars.map(war => (
                                <motion.div
                                    key={war.war_id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => navigate(`/war/${war.war_id}`)}
                                    className="bg-obsidian-900/40 border border-obsidian-800 p-4 rounded-sm flex justify-between items-center cursor-pointer hover:bg-obsidian-800/60 hover:border-gold-800/50 transition-all group"
                                >
                                    <div>
                                        <h4 className="text-sm font-bold text-obsidian-300 group-hover:text-gold-400 transition-colors">
                                            OPERATION {war.war_id.substring(0, 8).toUpperCase()}
                                        </h4>
                                        <p className="text-xs font-mono text-obsidian-600 mt-1">
                                            TURN {war.turn} // DEPLOYED {new Date(war.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="px-3 py-1 bg-green-900/20 text-green-500 text-[10px] font-bold tracking-widest border border-green-900/50 rounded-sm">
                                        ACTIVE
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="border border-dashed border-obsidian-800 rounded-sm p-12 flex flex-col items-center justify-center text-center bg-obsidian-900/20">
                            <div className="w-16 h-16 bg-obsidian-800 rounded-full flex items-center justify-center mb-4 text-obsidian-600">
                                <Activity className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-obsidian-500 mb-2">NO ACTIVE CAMPAIGNS</h3>
                            <p className="max-w-md text-obsidian-600 text-sm mb-6">
                                Peace is a momentary graphical glitch. Initialize a war campaign to begin conquest.
                            </p>
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default Dashboard;
