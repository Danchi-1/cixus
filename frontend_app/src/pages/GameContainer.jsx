import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Terminal, Send, Shield, Activity, Map as MapIcon, ChevronLeft } from 'lucide-react';
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

    const logsEndRef = useRef(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    // Mock initial fetch
    useEffect(() => {
        // In real impl, we fetch GET /api/v1/war/{warId}/state
        setGameState({
            turn: 1,
            player_authority: 100,
            status: "ACTIVE"
        });
    }, [warId]);

    const handleSendCommand = async (e) => {
        e.preventDefault();
        if (!command.trim()) return;

        // Add user command to log
        const newLogs = [...logs, { type: 'user', text: command }];
        setLogs(newLogs);
        setCommand('');

        // Simulate processing / API call
        // const res = await axios.post(...)

        // Mock Response
        setTimeout(() => {
            setLogs(prev => [...prev, {
                type: 'system',
                text: 'Processing command logic...'
            }]);

            setTimeout(() => {
                setLogs(prev => [...prev, {
                    type: 'cixus',
                    text: 'Command Validated. Unit Alpha moving to sector 7. Ambush risk calculated at 12%.'
                }]);
            }, 800);
        }, 400);
    };

    return (
        <div className="h-screen bg-obsidian-950 flex flex-col overflow-hidden text-obsidian-300 font-mono">

            {/* Top Bar */}
            <header className="h-14 border-b border-obsidian-800 bg-obsidian-900/50 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-obsidian-800 rounded-sm text-obsidian-500 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-obsidian-200 tracking-wider">WAR ROOM // SESSION {warId?.substring(0, 6)}</span>
                        <span className="text-[10px] text-crimson-500 animate-pulse">LIVE CONNECTION</span>
                    </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-obsidian-500" />
                        <span>TURN {gameState?.turn || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gold-600" />
                        <span className="text-gold-500">{gameState?.player_authority || 100} AP</span>
                    </div>
                </div>
            </header>

            {/* Main Content: Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* 3D Viewport Area */}
                <div className="flex-1 bg-black relative flex items-center justify-center border-r border-obsidian-800">
                    {/* Placeholder for Unity Canvas */}
                    <div className="absolute inset-0 grid grid-cols-[repeat(40,minmax(0,1fr))] grid-rows-[repeat(40,minmax(0,1fr))] opacity-20 pointer-events-none">
                        {Array.from({ length: 1600 }).map((_, i) => (
                            <div key={i} className="border-[0.5px] border-obsidian-800" />
                        ))}
                    </div>

                    <div className="text-center space-y-4 z-10 opacity-50">
                        <MapIcon className="w-16 h-16 text-obsidian-600 mx-auto" />
                        <p className="text-sm tracking-widest text-obsidian-500">TACTICAL GRID OFFLINE</p>
                        <p className="text-xs text-obsidian-700">Awaiting WebGL Injection...</p>
                    </div>
                </div>

                {/* Right Panel: Command Terminal */}
                <div className="w-96 bg-obsidian-900/80 flex flex-col border-l border-obsidian-800 backdrop-blur-sm">

                    {/* Log Output */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-sm scrollbar-thin scrollbar-thumb-obsidian-700 scrollbar-track-transparent">
                        {logs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`
                                    p-3 rounded-sm border-l-2
                                    ${log.type === 'user' ? 'bg-obsidian-800/50 border-gold-600 text-gold-100 ml-4' : ''}
                                    ${log.type === 'system' ? 'border-obsidian-600 text-obsidian-400' : ''}
                                    ${log.type === 'cixus' ? 'bg-crimson-900/10 border-crimson-600 text-crimson-300' : ''}
                                `}
                            >
                                <span className="text-[10px] opacity-50 block mb-1 uppercase tracking-wider">{log.type}</span>
                                {log.text}
                            </motion.div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendCommand} className="p-4 border-t border-obsidian-800 bg-obsidian-950">
                        <div className="relative">
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder="Issue command..."
                                className="w-full bg-obsidian-900 border border-obsidian-700 rounded-sm py-3 pl-4 pr-12 text-sm text-white placeholder-obsidian-600 focus:outline-none focus:border-gold-700 transition-colors"
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-obsidian-500 hover:text-gold-500 transition-colors"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-obsidian-600 mt-2 text-center">
                            Valid syntax is optional. Intent is judged.
                        </p>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default GameContainer;
