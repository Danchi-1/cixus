import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, Shield, Activity, Map as MapIcon, ChevronLeft, Wifi, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const GameContainer = () => {
    const { warId } = useParams();
    const navigate = useNavigate();
    const [command, setCommand] = useState('');
    const [logs, setLogs] = useState([
        { type: 'system', text: 'Connection established to Cixus Command Core.' },
        { type: 'system', text: 'Battlefield rendering...' },
        { type: 'cixus', text: 'The enemy is waiting, Commander. Do not hesitate.' }
    ]);
    const [gameState, setGameState] = useState(null);
    const [isTransmitting, setIsTransmitting] = useState(false);

    const logsEndRef = useRef(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    // Poll for game state
    useEffect(() => {
        if (!warId) return;
        const fetchState = async () => {
            try {
                const res = await axios.get(`http://127.0.0.1:8080/api/v1/war/${warId}/state`);
                setGameState({
                    turn: res.data.turn_count,
                    player_authority: 100, // TODO: Add real AP
                    status: res.data.general_status,
                    units: res.data.player_units
                });
            } catch (err) {
                console.error("Polling Error:", err);
            }
        };

        fetchState(); // Initial
        const interval = setInterval(fetchState, 1000); // Poll every 1s
        return () => clearInterval(interval);
    }, [warId]);

    const authority = gameState?.player_authority || 100;
    const isLowAuthority = authority < 30;

    const handleSendCommand = async (e) => {
        e.preventDefault();
        if (!command.trim() || isTransmitting) return;

        const cmdText = command;
        setCommand('');
        setIsTransmitting(true);

        setLogs(prev => [...prev, { type: 'user', text: cmdText }]);

        try {
            const res = await axios.post(`http://127.0.0.1:8080/api/v1/war/${warId}/command`, {
                type: "text",
                content: cmdText
            });

            // Handle AI Response
            const instruction = res.data.instructions[0];
            const feedback = instruction ?
                `CONFIRMED: ${instruction.action} -> ${JSON.stringify(instruction.parameters)}` :
                "Command acknowledged.";

            setLogs(prev => [...prev, {
                type: 'system',
                text: feedback
            }]);

            // Cixus Judgment
            if (res.data.cixus_judgment) {
                setLogs(prev => [...prev, {
                    type: 'cixus',
                    text: res.data.cixus_judgment.commentary,
                    delta: res.data.cixus_judgment.authority_change
                }]);
            }

        } catch (err) {
            setLogs(prev => [...prev, {
                type: 'system',
                text: `ERROR: ${err.response?.data?.detail || err.message}`
            }]);
        } finally {
            setIsTransmitting(false);
        }
    };

    return (
        <div className="h-screen bg-obsidian-950 flex flex-col overflow-hidden text-obsidian-300 font-mono relative">

            {/* Low Authority Glitch Overlay */}
            {isLowAuthority && (
                <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover mix-blend-overlay" />
            )}

            {/* Top Bar */}
            <header className="h-14 border-b border-obsidian-800 bg-obsidian-900/90 flex items-center justify-between px-6 shrink-0 backdrop-blur-md relative z-40">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-obsidian-800 rounded-sm text-obsidian-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-obsidian-200 tracking-wider">WAR ROOM // SESSION {warId?.substring(0, 6)}</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isTransmitting ? 'bg-gold-500 animate-ping' : 'bg-green-500'}`} />
                            <span className="text-[10px] text-obsidian-500">{isTransmitting ? 'TRANSMITTING...' : 'CONNECTED'}</span>
                        </div>
                    </div>
                </div>

                {/* Authority Meter */}
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-obsidian-400">
                            <Wifi className={`w-3 h-3 ${isLowAuthority ? 'text-crimson-500 animate-pulse' : 'text-gold-500'}`} />
                            NEURAL SYNC STABILITY
                        </div>
                        <div className="w-48 h-1.5 bg-obsidian-800 rounded-full mt-1 overflow-hidden">
                            <motion.div
                                initial={{ width: "100%" }}
                                animate={{ width: `${authority}%` }}
                                className={`h-full ${isLowAuthority ? 'bg-crimson-600' : 'bg-gold-500'}`}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content: Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* 3D Viewport Area */}
                <div className="flex-1 bg-black relative flex items-center justify-center border-r border-obsidian-800">
                    <div className="absolute inset-0 grid grid-cols-[repeat(10,minmax(0,1fr))] grid-rows-[repeat(10,minmax(0,1fr))] opacity-20 pointer-events-none">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="border-[0.5px] border-obsidian-800 text-[8px] text-obsidian-700 flex items-center justify-center">
                                {i + 1}
                            </div>
                        ))}
                    </div>

                    {/* Render Units */}
                    {gameState?.units?.map(u => (
                        <motion.div
                            key={u.unit_id}
                            initial={false}
                            animate={{
                                left: `${u.position.x}%`,
                                top: `${u.position.z}%`
                            }}
                            className="absolute w-4 h-4 bg-crimson-500 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)] z-20"
                            title={`Unit: ${u.unit_id}`}
                        />
                    ))}

                    <div className="text-center space-y-4 z-10 opacity-50 pointer-events-none">
                        <MapIcon className="w-16 h-16 text-obsidian-600 mx-auto" />
                        <p className="text-sm tracking-widest text-obsidian-500">TACTICAL GRID OFFLINE</p>
                    </div>
                </div>

                {/* Right Panel: Command Terminal */}
                <div className="w-96 bg-obsidian-900/80 flex flex-col border-l border-obsidian-800 backdrop-blur-sm shadow-xl z-40">

                    {/* Log Output */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs scrollbar-thin scrollbar-thumb-obsidian-700 scrollbar-track-transparent">
                        {logs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`
                                    p-3 rounded-sm border-l-2 relative overflow-hidden group
                                    ${log.type === 'user' ? 'bg-obsidian-800/50 border-gold-600/50 text-gold-100 ml-8' : ''}
                                    ${log.type === 'system' ? 'border-obsidian-600 text-obsidian-400' : ''}
                                    ${log.type === 'cixus' ? 'bg-crimson-950/40 border-crimson-600 text-crimson-200 border-l-4 shadow-[inset_0_0_20px_rgba(153,27,27,0.1)]' : ''}
                                `}
                            >
                                {log.type === 'cixus' && (
                                    <div className="absolute top-0 right-0 p-1 opacity-20">
                                        <Activity className="w-8 h-8 text-crimson-600" />
                                    </div>
                                )}
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[9px] opacity-60 uppercase tracking-widest">{log.type}</span>
                                    {log.delta && (
                                        <span className={`text-[9px] font-bold ${log.delta > 0 ? 'text-green-500' : 'text-crimson-500'}`}>
                                            {log.delta > 0 ? '+' : ''}{log.delta} SYNC
                                        </span>
                                    )}
                                </div>
                                <p className="leading-relaxed relative z-10">{log.text}</p>
                            </motion.div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendCommand} className="p-4 border-t border-obsidian-800 bg-obsidian-950">
                        <div className="relative group">
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder={isLowAuthority ? "SIGNAL UNSTABLE..." : "Issue command..."}
                                disabled={isTransmitting}
                                className={`
                                    w-full bg-obsidian-900 border rounded-sm py-3 pl-4 pr-12 text-sm text-white 
                                    placeholder-obsidian-600 focus:outline-none transition-all duration-300
                                    ${isLowAuthority ? 'border-crimson-900/50 focus:border-crimson-600 animate-pulse' : 'border-obsidian-700 focus:border-gold-700'}
                                    ${isTransmitting ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={isTransmitting}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-obsidian-500 hover:text-gold-500 transition-colors disabled:opacity-0"
                            >
                                {isTransmitting ? <Activity className="w-4 h-4 animate-spin text-gold-500" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="flex justify-between items-center mt-2 px-1">
                            <p className="text-[9px] text-obsidian-600 uppercase tracking-widest">
                                {isLowAuthority ? <span className="text-crimson-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> SIGNAL DEGRADED</span> : "SECURE CHANNEL ACTIVE"}
                            </p>
                            <p className="text-[9px] text-obsidian-700">v0.9.2 BETA</p>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default GameContainer;
