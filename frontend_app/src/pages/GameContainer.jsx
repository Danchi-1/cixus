import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Activity, Map as MapIcon, ChevronLeft, Wifi,
    AlertTriangle, Radio, Eye, EyeOff, X, Crosshair
} from 'lucide-react';
import api from '../api';
import { ToastContainer, useToasts } from '../components/ErrorToast';
import TypewriterText from '../components/TypewriterText';

// ─── Enemy comms intercept templates ───────────────────────────────────────────
const COMMS_INTERCEPTS = [
    'SECTOR 4 FLANK UNGUARDED — ADVANCE RECOMMENDED',
    'REQUESTING REINFORCEMENT AT GRID 7-7',
    'UNIT DELTA REPORTS LOW AMMO — HOLD POSITION',
    'ENEMY GENERAL RELOCATING NORTH',
    'ARTILLERY POSITIONED BEHIND RIDGE LINE',
    'CIPHER CHANGE AT 0200 — ACKNOWLEDGE',
    'SECTOR 2 HAS FALLEN — REGROUP AT FALLBACK',
    'MEDIC UNIT DOWN — MORALE CRITICAL',
    'COMMAND SUSPECTS INFILTRATION — VERIFY IDENTITY',
    'PROBE ASSAULT ON WEST FLANK FAILED',
    'NEW ORDERS: RETREAT TO SECONDARY LINE',
    'SCOUT REPORTS HEAVY ARMOUR MOVEMENT ON ROUTE DELTA',
    'ALL UNITS — COMMS BLACKOUT IN 3 MINUTES',
    'GRID 3-9 SECURE — PUSH FORWARD',
    'ENGAGE ONLY IF FIRED UPON — PRIORITY: PRESERVE STRENGTH',
    'CASUALTY RATE EXCEEDING PROJECTION — REQUESTING WITHDRAWAL',
    'SUSPECTED SPY IN BATTALION C — DO NOT CONFIRM VIA OPEN CHANNEL',
];

// ─── War Phase config ───────────────────────────────────────────────────────────
const getWarPhase = (turn = 0) => {
    if (turn < 5) return { label: 'EARLY CONFLICT', color: 'text-gold-500', border: 'border-gold-700/60', pulse: false };
    if (turn < 15) return { label: 'ENGAGEMENT', color: 'text-crimson-500', border: 'border-crimson-700/60', pulse: false };
    return { label: 'CRITICAL PHASE', color: 'text-crimson-400', border: 'border-crimson-600', pulse: true };
};

// ─── Fog of War helper ──────────────────────────────────────────────────────────
const isFogVisible = (enemy, friendlyUnits, threshold = 28) => {
    return friendlyUnits.some(f => {
        const dx = f.position.x - enemy.position.x;
        const dz = (f.position.z ?? f.position.y ?? 50) - (enemy.position.z ?? enemy.position.y ?? 50);
        return Math.sqrt(dx * dx + dz * dz) <= threshold;
    });
};

// ───────────────────────────────────────────────────────────────────────────────

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
    const { toasts, pushToast, dismissToast } = useToasts();

    // Feature states
    const [fogEnabled, setFogEnabled] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [enemyComms, setEnemyComms] = useState([]);

    const logsEndRef = useRef(null);
    const mapRef = useRef(null);

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    useEffect(() => { scrollToBottom(); }, [logs]);

    // ── Dismiss unit inspector on Escape ──
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') setSelectedUnit(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // ── Enemy comms intercept ticker ──
    useEffect(() => {
        const scheduleNext = () => {
            const delay = 12000 + Math.random() * 10000; // 12–22s
            return setTimeout(() => {
                const msg = COMMS_INTERCEPTS[Math.floor(Math.random() * COMMS_INTERCEPTS.length)];
                const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setEnemyComms(prev => [...prev.slice(-3), { id: Date.now(), text: msg, ts }]);
                timerRef.current = scheduleNext();
            }, delay);
        };
        const timerRef = { current: scheduleNext() };
        return () => clearTimeout(timerRef.current);
    }, []);

    // ── Poll game state ──
    useEffect(() => {
        if (!warId) return;
        const fetchState = async () => {
            try {
                const res = await api.get(`/api/v1/war/${warId}/state`);
                setGameState(prev => ({
                    ...prev,
                    turn: res.data.turn_count,
                    player_authority: 100,
                    status: res.data.general_status,
                    units: [
                        ...res.data.player_units,
                        ...(res.data.enemy_units || []).map(u => ({ ...u, isEnemy: true }))
                    ]
                }));
            } catch (err) {
                console.error('Polling Error:', err);
                if (err.response && err.response.status === 404) {
                    pushToast({ message: 'War session not found or has ended. Returning to base.', type: 'warning', duration: 3000 });
                    setTimeout(() => navigate('/dashboard'), 3200);
                } else {
                    pushToast({ message: `Sync failure: ${err.response?.data?.detail || err.message}`, type: 'error' });
                }
            }
        };
        fetchState();
        const interval = setInterval(fetchState, 1000);
        return () => clearInterval(interval);
    }, [warId]);

    const authority = gameState?.player_authority || 100;
    const isLowAuthority = authority < 30;
    const warPhase = getWarPhase(gameState?.turn);

    // ── Derived: friendly units for fog calc ──
    const friendlyUnits = (gameState?.units || []).filter(u => !u.isEnemy);
    const allUnits = gameState?.units || [];

    // ── Send command ──
    const handleSendCommand = async (e) => {
        e.preventDefault();
        if (!command.trim() || isTransmitting) return;
        const cmdText = command;
        setCommand('');
        setIsTransmitting(true);
        setLogs(prev => [...prev, { type: 'user', text: cmdText }]);

        try {
            const res = await api.post(`/api/v1/war/${warId}/command`, { type: 'text', content: cmdText });

            if (res.data.new_state) {
                setGameState(prev => ({
                    ...prev,
                    turn: res.data.new_state.turn_count,
                    units: [
                        ...res.data.new_state.player_units,
                        ...(res.data.new_state.enemy_units || []).map(u => ({ ...u, isEnemy: true }))
                    ]
                }));
            }

            const friction = res.data.friction;
            const instructions = res.data.instructions;
            const refusal = instructions.find(i => i.action === 'HOLD' && i.parameters.reason && i.parameters.reason !== 'INSUFFICIENT_AUTHORITY');

            if (refusal) {
                setLogs(prev => [...prev, { type: 'system', text: `COMMAND REJECTED: ${refusal.parameters.reason}`, isRefusal: true }]);
            } else if (friction?.latency_ticks > 0) {
                const delayMs = friction.latency_ticks * 1000;
                setLogs(prev => [...prev, { type: 'system', text: `TRANSMIT DELAYED: Encrypting... (${friction.latency_ticks}s latency)` }]);
                setTimeout(() => {
                    const intent = res.data.intent;
                    const instruction = instructions[0];
                    let feedback = 'Command acknowledged.';
                    if (intent) {
                        feedback = `TACTIC LOCKED: ${intent.primary_pattern.toUpperCase()} [Risk: ${intent.risk_profile.toUpperCase()}]`;
                        if (intent.ethical_weight !== 'standard') feedback += ` [Ethics: ${intent.ethical_weight.toUpperCase()}]`;
                    } else if (instruction) feedback = `CONFIRMED: ${instruction.action}`;
                    setLogs(prev => [...prev, { type: 'system', text: feedback }]);
                }, delayMs);
            } else {
                const intent = res.data.intent;
                const instruction = instructions[0];
                let feedback = 'Command acknowledged.';
                if (intent) {
                    feedback = `TACTIC LOCKED: ${intent.primary_pattern.toUpperCase()} [Risk: ${intent.risk_profile.toUpperCase()}]`;
                    if (intent.ethical_weight !== 'standard') feedback += ` [Ethics: ${intent.ethical_weight.toUpperCase()}]`;
                } else if (instruction) feedback = `CONFIRMED: ${instruction.action}`;
                setLogs(prev => [...prev, { type: 'system', text: feedback }]);
            }

            if (res.data.cixus_judgment) {
                setLogs(prev => [...prev, {
                    type: 'cixus',
                    text: res.data.cixus_judgment.commentary,
                    delta: res.data.cixus_judgment.authority_change,
                    animate: true   // flag: use typewriter
                }]);
            }

            if (res.data.sitrep) {
                setLogs(prev => [...prev, { type: 'system', text: `SITREP: ${res.data.sitrep}`, isSitrep: true }]);
            }

        } catch (err) {
            const errMsg = err.response?.data?.detail || err.message;
            pushToast({ message: `Transmission failed: ${errMsg}`, type: 'error' });
            setLogs(prev => [...prev, { type: 'system', text: `ERROR: ${errMsg}` }]);
        } finally {
            setIsTransmitting(false);
        }
    };

    return (
        <div className="h-screen bg-obsidian-950 flex flex-col overflow-hidden text-obsidian-300 font-mono relative">

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {/* Low Authority Glitch Overlay */}
            {isLowAuthority && (
                <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover mix-blend-overlay" />
            )}

            {/* ── Top Bar ── */}
            <header className="h-14 border-b border-obsidian-800 bg-obsidian-900/90 flex items-center justify-between px-6 shrink-0 backdrop-blur-md relative z-40">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-obsidian-800 rounded-sm text-obsidian-500 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-obsidian-200 tracking-wider">WAR ROOM // SESSION {warId?.substring(0, 6)}</span>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isTransmitting ? 'bg-gold-500 animate-ping' : 'bg-green-500'}`} />
                            <span className="text-[10px] text-obsidian-500">{isTransmitting ? 'TRANSMITTING...' : 'CONNECTED'}</span>
                        </div>
                    </div>

                    {/* ── Feature 3: War Phase Badge ── */}
                    <div className={`ml-4 px-3 py-1 border rounded-sm text-[9px] font-bold tracking-[0.18em] uppercase ${warPhase.color} ${warPhase.border} bg-obsidian-900/60 ${warPhase.pulse ? 'animate-pulse' : ''}`}>
                        {warPhase.label}
                        <span className="ml-2 opacity-50">T-{gameState?.turn ?? 0}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* ── Feature 2: Fog of War toggle ── */}
                    <button
                        onClick={() => setFogEnabled(f => !f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all
                            ${fogEnabled
                                ? 'bg-obsidian-800 border-obsidian-700 text-obsidian-400 hover:border-gold-700 hover:text-gold-500'
                                : 'bg-gold-900/30 border-gold-700/60 text-gold-500'
                            }`}
                    >
                        {fogEnabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        FOG {fogEnabled ? 'ON' : 'OFF'}
                    </button>

                    {/* Authority Meter */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-obsidian-400">
                            <Wifi className={`w-3 h-3 ${isLowAuthority ? 'text-crimson-500 animate-pulse' : 'text-gold-500'}`} />
                            NEURAL SYNC
                        </div>
                        <div className="w-36 h-1.5 bg-obsidian-800 rounded-full mt-1 overflow-hidden">
                            <motion.div
                                initial={{ width: '100%' }}
                                animate={{ width: `${authority}%` }}
                                className={`h-full ${isLowAuthority ? 'bg-crimson-600' : 'bg-gold-500'}`}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── Left: Tactical Grid ── */}
                <div
                    ref={mapRef}
                    className="flex-1 bg-black relative flex items-center justify-center border-r border-obsidian-800 overflow-hidden"
                    onClick={(e) => {
                        // Click outside a unit dismisses inspector
                        if (e.target === mapRef.current || e.target.closest('[data-map-bg]')) setSelectedUnit(null);
                    }}
                >
                    {/* Grid lines */}
                    <div data-map-bg className="absolute inset-0 grid grid-cols-[repeat(10,minmax(0,1fr))] grid-rows-[repeat(10,minmax(0,1fr))] opacity-20 pointer-events-none">
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="border-[0.5px] border-obsidian-800 text-[8px] text-obsidian-700 flex items-center justify-center">{i + 1}</div>
                        ))}
                    </div>

                    {/* ── Feature 2: Fog overlay ── */}
                    {fogEnabled && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="w-full h-full bg-black/40 backdrop-blur-[1px]" />
                        </div>
                    )}

                    {/* ── Render Units ── */}
                    {allUnits.map(u => {
                        const posX = u.position?.x ?? 50;
                        const posZ = u.position?.z ?? u.position?.y ?? 50;
                        const isVisible = !u.isEnemy || !fogEnabled || isFogVisible(u, friendlyUnits);
                        const isGhost = u.isEnemy && fogEnabled && !isVisible;

                        // Completely hidden if deep in fog
                        if (u.isEnemy && fogEnabled && !isVisible && !isFogVisible(u, friendlyUnits, 50)) return null;

                        return (
                            <motion.div
                                key={u.unit_id}
                                initial={false}
                                animate={{ left: `${posX}%`, top: `${posZ}%` }}
                                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                                onClick={(e) => { e.stopPropagation(); setSelectedUnit(u); }}
                                className={`absolute z-20 cursor-pointer transition-all duration-300
                                    ${isGhost ? 'opacity-30' : 'opacity-100'}
                                `}
                                style={{ transform: 'translate(-50%, -50%)' }}
                                title={isGhost ? '??? UNKNOWN' : `${u.type} (${u.unit_id})`}
                            >
                                {isGhost ? (
                                    /* Ghost marker in fog */
                                    <div className="w-3 h-3 rounded-full bg-cyan-900/60 border border-cyan-800/50 flex items-center justify-center animate-pulse">
                                        <span className="text-[5px] text-cyan-700 font-bold">?</span>
                                    </div>
                                ) : (
                                    /* Full unit dot */
                                    <>
                                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]
                                            ${u.isEnemy ? 'bg-cyan-500 shadow-cyan-500/50' : 'bg-crimson-500 shadow-crimson-500/50'}
                                            ${selectedUnit?.unit_id === u.unit_id ? 'ring-2 ring-gold-500 ring-offset-1 ring-offset-black scale-150' : ''}
                                        `} />
                                        <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 text-[6px] font-bold tracking-tighter whitespace-nowrap
                                            ${u.isEnemy ? 'text-cyan-500' : 'text-crimson-500'}`}>
                                            {u.type?.substring(0, 3)}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        );
                    })}

                    {/* Empty grid fallback */}
                    <div className="text-center space-y-4 z-10 opacity-50 pointer-events-none">
                        {(!gameState?.units || gameState.units.length === 0) && (
                            <>
                                <MapIcon className="w-16 h-16 text-obsidian-600 mx-auto" />
                                <p className="text-sm tracking-widest text-obsidian-500">TACTICAL GRID OFFLINE</p>
                            </>
                        )}
                    </div>

                    {/* ── Feature 5: Unit Inspector Card ── */}
                    <AnimatePresence>
                        {selectedUnit && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                className="absolute bottom-4 left-4 z-30 w-56 bg-obsidian-900/95 border border-obsidian-700 backdrop-blur-md rounded-sm overflow-hidden shadow-2xl"
                            >
                                {/* Top accent */}
                                <div className={`h-[2px] w-full ${selectedUnit.isEnemy ? 'bg-cyan-600' : 'bg-crimson-600'}`} />
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Crosshair className={`w-3.5 h-3.5 ${selectedUnit.isEnemy ? 'text-cyan-500' : 'text-crimson-500'}`} />
                                            <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${selectedUnit.isEnemy ? 'text-cyan-500' : 'text-crimson-500'}`}>
                                                {selectedUnit.isEnemy ? 'ENEMY UNIT' : 'FRIENDLY UNIT'}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedUnit(null)} className="text-obsidian-600 hover:text-obsidian-400 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-obsidian-600 uppercase tracking-widest text-[9px]">Unit ID</span>
                                            <span className="text-obsidian-300 font-bold text-[10px]">{selectedUnit.unit_id?.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-obsidian-600 uppercase tracking-widest text-[9px]">Type</span>
                                            <span className="text-obsidian-300 font-bold text-[10px]">{selectedUnit.type?.toUpperCase() || 'UNKNOWN'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-obsidian-600 uppercase tracking-widest text-[9px]">Position</span>
                                            <span className="text-obsidian-300 font-bold text-[10px]">
                                                X:{Math.round(selectedUnit.position?.x ?? 0)} Z:{Math.round(selectedUnit.position?.z ?? selectedUnit.position?.y ?? 0)}
                                            </span>
                                        </div>
                                        {selectedUnit.health !== undefined && (
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-obsidian-600 uppercase tracking-widest text-[9px]">Health</span>
                                                    <span className={`font-bold text-[10px] ${selectedUnit.health > 50 ? 'text-green-500' : 'text-crimson-500'}`}>{selectedUnit.health}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-obsidian-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${selectedUnit.health > 50 ? 'bg-green-600' : 'bg-crimson-600'}`}
                                                        style={{ width: `${selectedUnit.health}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-obsidian-600 uppercase tracking-widest text-[9px]">Status</span>
                                            <span className="text-green-500 font-bold text-[10px]">{selectedUnit.status?.toUpperCase() || 'ACTIVE'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 pb-3">
                                    <p className="text-[8px] text-obsidian-700 tracking-widest">ESC TO DISMISS</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Feature 4: Enemy Comms Ticker ── */}
                    <AnimatePresence>
                        {enemyComms.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-4 right-4 z-30 w-72 space-y-1.5"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Radio className="w-3 h-3 text-cyan-600 animate-pulse" />
                                    <span className="text-[8px] text-cyan-800 tracking-[0.2em] uppercase font-bold">Enemy Comms Intercepted</span>
                                </div>
                                {enemyComms.map((c) => (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="bg-obsidian-950/90 border border-cyan-900/40 px-3 py-2 rounded-sm backdrop-blur-sm"
                                    >
                                        <p className="text-[9px] text-cyan-700 leading-relaxed tracking-wide">
                                            <span className="text-cyan-900 mr-2">[{c.ts}]</span>
                                            {c.text}
                                        </p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Right Panel: Command Terminal ── */}
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
                                    ${log.type === 'system' && log.isRefusal ? 'bg-crimson-950/20 border-crimson-500 text-crimson-400' : ''}
                                    ${log.type === 'system' && log.isSitrep ? 'bg-obsidian-900/80 border-obsidian-500 text-obsidian-300 font-sans tracking-wide italic' : ''}
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
                                {/* ── Feature 1: Typewriter for Cixus messages ── */}
                                {log.type === 'cixus' && log.animate ? (
                                    <p className="leading-relaxed relative z-10">
                                        <TypewriterText text={log.text} speed={20} />
                                    </p>
                                ) : (
                                    <p className="leading-relaxed relative z-10">{log.text}</p>
                                )}
                            </motion.div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>

                    {/* Preset Commands */}
                    <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-obsidian-700">
                        {['FLANK LEFT', 'FLANK RIGHT', 'CHARGE', 'DIG IN', 'RECON', 'SUPPRESS', 'HOLD FIRE'].map(cmd => (
                            <button
                                key={cmd}
                                type="button"
                                onClick={() => setCommand(cmd)}
                                className="px-3 py-1 bg-obsidian-800 border border-obsidian-700 text-[10px] text-obsidian-400 hover:text-gold-500 hover:border-gold-700 transition-colors whitespace-nowrap rounded-sm"
                            >
                                {cmd}
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSendCommand} className="p-4 border-t border-obsidian-800 bg-obsidian-950">
                        <div className="relative group">
                            <input
                                type="text"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder={isLowAuthority ? 'SIGNAL UNSTABLE...' : 'Issue command...'}
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
                                {isLowAuthority
                                    ? <span className="text-crimson-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> SIGNAL DEGRADED</span>
                                    : 'SECURE CHANNEL ACTIVE'
                                }
                            </p>
                            <p className="text-[9px] text-obsidian-700">v0.9.4 BETA</p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default GameContainer;
