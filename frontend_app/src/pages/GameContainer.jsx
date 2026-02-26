import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send, Activity, Map as MapIcon, ChevronLeft, Wifi, AlertTriangle,
    Radio, Eye, EyeOff, X, Crosshair, Zap, List, LayoutGrid, BookOpen,
    ArrowLeft, ArrowRight, Shield, Swords, Search, Pause, Target, ZapOff
} from 'lucide-react';
import api from '../api';
import { ToastContainer, useToasts } from '../components/ErrorToast';
import TypewriterText from '../components/TypewriterText';
import TacticsPanel from '../components/TacticsPanel';
import SoundEngine from '../utils/SoundEngine';

// ── Constants (module-level, never recreated) ─────────────────────────────────

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

const TACTICAL_COMMANDS = [
    { cmd: 'FLANK LEFT', icon: ArrowLeft, color: 'gold' },
    { cmd: 'FLANK RIGHT', icon: ArrowRight, color: 'gold' },
    { cmd: 'CHARGE', icon: Swords, color: 'crimson' },
    { cmd: 'DIG IN', icon: Shield, color: 'obsidian' },
    { cmd: 'RECON', icon: Search, color: 'obsidian' },
    { cmd: 'SUPPRESS', icon: Target, color: 'crimson' },
    { cmd: 'HOLD FIRE', icon: Pause, color: 'obsidian' },
    { cmd: 'WITHDRAW', icon: ZapOff, color: 'obsidian' },
];

const CMD_COLORS = {
    gold: 'border-gold-700/60 text-gold-500 hover:bg-gold-900/30 hover:border-gold-600 active:bg-gold-900/60',
    crimson: 'border-crimson-700/60 text-crimson-500 hover:bg-crimson-900/30 hover:border-crimson-600 active:bg-crimson-900/60',
    obsidian: 'border-obsidian-700 text-obsidian-400 hover:bg-obsidian-800/60 hover:border-obsidian-600 hover:text-obsidian-200 active:bg-obsidian-800',
};

const TABS = [
    { id: 'orders', label: 'ORDERS', Icon: LayoutGrid },
    { id: 'log', label: 'LOG', Icon: List },
    { id: 'tactics', label: 'TACTICS', Icon: BookOpen },
    { id: 'extreme', label: '⚡ XTRM', Icon: Zap },
];

// ── Pure helper functions ─────────────────────────────────────────────────────

const getWarPhase = (turn = 0) => {
    if (turn < 5) return { label: 'EARLY CONFLICT', color: 'text-gold-500', border: 'border-gold-700/60', pulse: false };
    if (turn < 15) return { label: 'ENGAGEMENT', color: 'text-crimson-500', border: 'border-crimson-700/60', pulse: false };
    return { label: 'CRITICAL PHASE', color: 'text-crimson-400', border: 'border-crimson-600', pulse: true };
};

const isFogVisible = (enemy, friendlyUnits, threshold = 28) =>
    friendlyUnits.some(f => {
        const dx = f.position.x - enemy.position.x;
        const dz = (f.position.z ?? f.position.y ?? 50) - (enemy.position.z ?? enemy.position.y ?? 50);
        return Math.sqrt(dx * dx + dz * dz) <= threshold;
    });

// ── Sub-components (module-level — NEVER defined inside GameContainer) ────────
// Defining these outside prevents remount on every parent re-render.
// Each is wrapped in React.memo so they only re-render when their own props change.

const CommandGrid = memo(({ onCommand, isTransmitting }) => (
    <div className="grid grid-cols-2 gap-2 p-4">
        {TACTICAL_COMMANDS.map(({ cmd, icon: Icon, color }) => (
            <button
                key={cmd}
                onClick={() => onCommand(cmd)}
                disabled={isTransmitting}
                className={`
                    flex items-center gap-3 px-4 py-3.5 border rounded-sm font-mono text-xs
                    font-bold tracking-wider uppercase transition-all duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed select-none
                    active:scale-95 ${CMD_COLORS[color]}
                `}
            >
                <Icon className="w-4 h-4 shrink-0" />
                {cmd}
            </button>
        ))}
    </div>
));
CommandGrid.displayName = 'CommandGrid';

const LogPanel = memo(({ logs, logsEndRef }) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs font-mono scrollbar-thin scrollbar-thumb-obsidian-700 scrollbar-track-transparent">
        {logs.map((log) => (
            <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`
                    p-3 rounded-sm border-l-2 relative overflow-hidden
                    ${log.type === 'user' ? 'bg-obsidian-800/50 border-gold-600/50 text-gold-100 ml-6' : ''}
                    ${log.type === 'system' ? 'border-obsidian-600 text-obsidian-400' : ''}
                    ${log.type === 'system' && log.isRefusal ? 'bg-crimson-950/20 border-crimson-500 text-crimson-400' : ''}
                    ${log.type === 'system' && log.isSitrep ? 'border-obsidian-500 text-obsidian-300 font-sans italic tracking-wide' : ''}
                    ${log.type === 'cixus' ? 'bg-crimson-950/40 border-crimson-600 border-l-4 text-crimson-200 shadow-[inset_0_0_20px_rgba(153,27,27,0.1)]' : ''}
                `}
            >
                {log.type === 'cixus' && (
                    <div className="absolute top-0 right-0 p-1 opacity-20 pointer-events-none">
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
                {log.type === 'cixus' && log.animate
                    ? <p className="leading-relaxed z-10 relative"><TypewriterText text={log.text} speed={20} /></p>
                    : <p className="leading-relaxed z-10 relative">{log.text}</p>
                }
            </motion.div>
        ))}
        <div ref={logsEndRef} />
    </div>
));
LogPanel.displayName = 'LogPanel';

const ExtremePanel = memo(({ extremeCmd, setExtremeCmd, onSubmit, isTransmitting, isLowAuth, compact = false }) => (
    <form onSubmit={onSubmit} className={compact ? 'p-3' : 'p-4'}>
        <div className="mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-gold-500" />
            <span className="text-[9px] tracking-[0.2em] text-gold-600 uppercase font-bold">Extreme Command — AI Interpreted</span>
        </div>
        <p className="text-[9px] text-obsidian-600 mb-3 leading-relaxed">
            For complex multi-unit orders or unconventional tactics. Cixus will judge harshly.
        </p>
        <div className="relative">
            <input
                type="text"
                value={extremeCmd}
                onChange={e => setExtremeCmd(e.target.value)}
                placeholder={isLowAuth ? 'SIGNAL UNSTABLE...' : 'Describe your order in detail...'}
                disabled={isTransmitting}
                className={`
                    w-full bg-obsidian-950 border rounded-sm py-3 pl-4 pr-12 text-sm text-white
                    placeholder-obsidian-700 outline-none transition-colors duration-200
                    ${isLowAuth
                        ? 'border-crimson-800 focus:border-crimson-500'
                        : 'border-gold-900/50 focus:border-gold-600'
                    }
                    ${isTransmitting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                autoFocus={!compact}
            />
            <button
                type="submit"
                disabled={isTransmitting || !extremeCmd.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gold-700 hover:text-gold-400 disabled:opacity-30 transition-colors"
            >
                {isTransmitting ? <Activity className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
        </div>
        <p className="text-[8px] text-obsidian-700 mt-2 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" /> Extreme commands invoke full Cixus judgment
        </p>
    </form>
));
ExtremePanel.displayName = 'ExtremePanel';

// ── Battlefield ambient data (seeded random, computed once at module load) ────
const _sr = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };
const _re = _sr(42), _rf = _sr(99), _rb = _sr(7), _rbl = _sr(13);
// Friendly: 300 troops in 3 disciplined battle lines (front / middle / reserve)
const FRIENDLY_SWARM = Array.from({ length: 300 }, (_, i) => {
    const line = Math.floor(i / 100);           // 0 = front, 1 = middle, 2 = reserve
    const pos = (i % 100) / 100;                // horizontal position along the line
    const jx = _rf() * 0.025 - 0.0125;         // ±1.25% horizontal jitter
    const jy = _rf() * 0.018 - 0.009;          // ±0.9% vertical jitter
    return {
        x: 0.03 + pos * 0.53 + jx,             // lines stretch across left 56% of map
        y: 0.40 + line * 0.16 + jy,            // three rows: y≈0.40, 0.56, 0.72
        phase: _rf() * Math.PI * 2, spd: 0.28 + _rf() * 0.45, r: 0.5 + _rf() * 0.35,
    };
});
// Enemy: 500 troops in assault line + center mass + flanking encirclement
const ENEMY_SWARM = Array.from({ length: 500 }, (_, i) => {
    let x, y;
    if (i < 150) {
        // Top assault line — wide front across the whole width
        x = 0.01 + (i / 150) * 0.97;
        y = 0.02 + _re() * 0.10;
    } else if (i < 280) {
        // Second assault wave — slightly deeper
        x = 0.01 + ((i - 150) / 130) * 0.96;
        y = 0.13 + _re() * 0.10;
    } else if (i < 400) {
        // Center mass — densely packed mid-field
        x = 0.05 + ((i - 280) / 120) * 0.88;
        y = 0.24 + _re() * 0.12;
    } else if (i < 460) {
        // Right flanking column — encircling from right
        x = 0.72 + _re() * 0.26;
        y = 0.20 + ((i - 400) / 60) * 0.60 + _re() * 0.05;
    } else {
        // Left flanking probe — pressure from far left
        x = 0.00 + _re() * 0.18;
        y = 0.10 + ((i - 460) / 40) * 0.70 + _re() * 0.06;
    }
    return {
        x: Math.max(0.005, Math.min(0.995, x + _re() * 0.012 - 0.006)),
        y: Math.max(0.005, Math.min(0.995, y + _re() * 0.008 - 0.004)),
        phase: _re() * Math.PI * 2, spd: 0.3 + _re() * 0.6, r: 0.7 + _re() * 0.5,
    };
});
const BLOOD = Array.from({ length: 22 }, () => ({ x: _rb() * 0.95, y: _rb() * 0.95, rx: 3 + _rb() * 9, ry: 2 + _rb() * 5, a: 0.07 + _rb() * 0.18 }));
const BULLETS = Array.from({ length: 28 }, () => { const left = _rbl() > 0.5; const ang = (left ? -18 + _rbl() * 36 : 162 + _rbl() * 36) * Math.PI / 180; const spd = 1.4 + _rbl() * 1.8; return { x0: left ? -0.04 : 1.04, y0: 0.08 + _rbl() * 0.82, dx: Math.cos(ang) * spd, dy: Math.sin(ang) * spd, period: 2.2 + _rbl() * 2.8, phase: _rbl() * 5, col: _rbl() > 0.6 ? '#fbbf24' : _rbl() > 0.3 ? '#fde68a' : '#ffedd5' }; });

// ── Canvas-based battlefield renderer (pure RAF, zero re-renders) ──────────────
const BattlefieldCanvas = memo(({ fogEnabled }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);

        const draw = (ts) => {
            const t = ts / 1000;
            const W = canvas.width, H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            // ── Blood splatters (painted every frame but cheap) ──────────
            BLOOD.forEach(b => {
                ctx.save();
                ctx.translate(b.x * W, b.y * H);
                ctx.scale(b.rx, b.ry);
                ctx.beginPath();
                ctx.arc(0, 0, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100,0,0,${b.a})`;
                ctx.fill();
                ctx.restore();
            });

            // ── Enemy swarm (cyan, only visible when fog off) ────────────
            if (!fogEnabled) {
                ctx.fillStyle = 'rgba(6,182,212,0.65)';
                ENEMY_SWARM.forEach(e => {
                    const jx = Math.sin(t * e.spd + e.phase) * e.r;
                    const jy = Math.cos(t * e.spd * 0.7 + e.phase) * e.r;
                    ctx.beginPath();
                    ctx.arc(e.x * W + jx, e.y * H + jy, 1, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else {
                // Show a small ghost ring cloud so the map isn't empty under fog
                ctx.fillStyle = 'rgba(6,182,212,0.18)';
                ENEMY_SWARM.filter((_, i) => i % 4 === 0).forEach(e => {
                    ctx.beginPath();
                    ctx.arc(e.x * W, e.y * H, 1, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // ── Friendly swarm (crimson) ─────────────────────────────────
            ctx.fillStyle = 'rgba(220,38,38,0.6)';
            FRIENDLY_SWARM.forEach(f => {
                const jx = Math.sin(t * f.spd + f.phase) * f.r;
                const jy = Math.cos(t * f.spd * 0.8 + f.phase) * f.r;
                ctx.beginPath();
                ctx.arc(f.x * W + jx, f.y * H + jy, 1, 0, Math.PI * 2);
                ctx.fill();
            });

            // ── Bullet tracers ───────────────────────────────────────────
            BULLETS.forEach(b => {
                const prog = ((t + b.phase) % b.period) / b.period;
                const px = (b.x0 + b.dx * b.period * prog) * W;
                const py = (b.y0 + b.dy * b.period * prog) * H;
                if (px < -20 || px > W + 20 || py < -20 || py > H + 20) return;
                const alpha = 0.85 * (1 - prog * 0.55);
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(Math.atan2(b.dy, b.dx));
                ctx.globalAlpha = alpha;
                ctx.fillStyle = b.col;
                ctx.fillRect(-7, -0.7, 14, 1.4);
                // Glow halo
                ctx.globalAlpha = alpha * 0.28;
                ctx.fillRect(-9, -2, 18, 4);
                ctx.restore();
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        rafRef.current = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
    }, [fogEnabled]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} />;
});
BattlefieldCanvas.displayName = 'BattlefieldCanvas';

// ── Main component ────────────────────────────────────────────────────────────

const GameContainer = () => {
    const { warId } = useParams();
    const navigate = useNavigate();

    // Stable log IDs — use a counter ref so they don't cause re-renders
    const logIdRef = useRef(0);
    const makeLog = (fields) => ({ id: ++logIdRef.current, ...fields });

    const [extremeCmd, setExtremeCmd] = useState('');
    const [logs, setLogs] = useState(() => [
        makeLog({ type: 'system', text: 'Connection established to Cixus Command Core.' }),
        makeLog({ type: 'system', text: 'Battlefield rendering...' }),
        makeLog({ type: 'cixus', text: 'The enemy is waiting, Commander. Do not hesitate.' }),
    ]);
    const [gameState, setGameState] = useState(null);
    const [isTransmitting, setIsTransmitting] = useState(false);
    const [fogEnabled, setFogEnabled] = useState(true);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [enemyComms, setEnemyComms] = useState([]);
    const [activeTab, setActiveTab] = useState('orders');
    const [extremeOpen, setExtremeOpen] = useState(false);
    const [sfxMuted, setSfxMuted] = useState(() => SoundEngine.isMuted());

    const { toasts, pushToast, dismissToast } = useToasts();
    const logsEndRef = useRef(null);
    const mapRef = useRef(null);
    const prevAuthRef = useRef(100);

    // Init SoundEngine + war-start sound on mount
    useEffect(() => {
        SoundEngine.init();
        setSfxMuted(SoundEngine.isMuted());
        // Brief delay so the browser suspends are resolved after first user gesture
        const t = setTimeout(() => SoundEngine.play('warStart'), 400);
        return () => clearTimeout(t);
    }, []);

    // Scroll on new log — only when logs array length changes
    const logsLength = logs.length;
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logsLength]);

    // Escape key dismisses unit inspector
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') setSelectedUnit(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    // Enemy comms ticker
    useEffect(() => {
        const timerRef = { current: null };
        const scheduleNext = () => {
            const delay = 12000 + Math.random() * 10000;
            timerRef.current = setTimeout(() => {
                const msg = COMMS_INTERCEPTS[Math.floor(Math.random() * COMMS_INTERCEPTS.length)];
                const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setEnemyComms(prev => [...prev.slice(-3), { id: Date.now(), text: msg, ts }]);
                SoundEngine.play('commsIntercept');
                scheduleNext();
            }, delay);
        };
        scheduleNext();
        return () => clearTimeout(timerRef.current);
    }, []);

    // Poll game state — updating ONLY gameState, never logs
    useEffect(() => {
        if (!warId) return;
        const fetchState = async () => {
            try {
                const res = await api.get(`/api/v1/war/${warId}/state`);
                setGameState({
                    turn: res.data.turn_count,
                    player_authority: 100,
                    status: res.data.general_status,
                    units: [
                        ...res.data.player_units,
                        ...(res.data.enemy_units || []).map(u => ({ ...u, isEnemy: true })),
                    ],
                });
            } catch (err) {
                if (err.response?.status === 404) {
                    pushToast({ message: 'War session ended. Returning to base.', type: 'warning', duration: 3000 });
                    setTimeout(() => navigate('/dashboard'), 3200);
                } else {
                    pushToast({ message: `Sync failure: ${err.response?.data?.detail || err.message}`, type: 'error' });
                }
            }
        };
        fetchState();
        const interval = setInterval(fetchState, 1000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warId]);

    const authority = gameState?.player_authority || 100;
    const isLowAuth = authority < 30;
    const warPhase = getWarPhase(gameState?.turn);

    // Low-authority alarm
    useEffect(() => {
        if (isLowAuth && prevAuthRef.current >= 30) SoundEngine.play('lowAuthority');
        prevAuthRef.current = authority;
    }, [isLowAuth, authority]);
    const friendlyUnits = (gameState?.units || []).filter(u => !u.isEnemy);
    const allUnits = gameState?.units || [];

    // ── Shared command submission ─────────────────────────────────────────────
    const submitCommand = useCallback(async (cmdText) => {
        if (!cmdText.trim() || isTransmitting) return;
        SoundEngine.play('transmit');
        setIsTransmitting(true);
        setLogs(prev => [...prev, makeLog({ type: 'user', text: cmdText })]);
        setActiveTab('log');

        try {
            const res = await api.post(`/api/v1/war/${warId}/command`, { type: 'text', content: cmdText });

            if (res.data.new_state) {
                setGameState({
                    turn: res.data.new_state.turn_count,
                    player_authority: 100,
                    units: [
                        ...res.data.new_state.player_units,
                        ...(res.data.new_state.enemy_units || []).map(u => ({ ...u, isEnemy: true })),
                    ],
                });
            }

            const friction = res.data.friction;
            const instructions = res.data.instructions;
            const refusal = instructions.find(i => i.action === 'HOLD' && i.parameters.reason && i.parameters.reason !== 'INSUFFICIENT_AUTHORITY');

            if (refusal) {
                setLogs(prev => [...prev, makeLog({ type: 'system', text: `COMMAND REJECTED: ${refusal.parameters.reason}`, isRefusal: true })]);
            } else {
                const intent = res.data.intent;
                const inst = instructions[0];
                let fb = 'Command acknowledged.';
                if (intent) {
                    fb = `TACTIC LOCKED: ${intent.primary_pattern.toUpperCase()} [Risk: ${intent.risk_profile.toUpperCase()}]`;
                    if (intent.ethical_weight !== 'standard') fb += ` [Ethics: ${intent.ethical_weight.toUpperCase()}]`;
                } else if (inst) fb = `CONFIRMED: ${inst.action}`;

                if (friction?.latency_ticks > 0) {
                    setLogs(prev => [...prev, makeLog({ type: 'system', text: `TRANSMIT DELAYED: Encrypting... (${friction.latency_ticks}s latency)` })]);
                    setTimeout(() => setLogs(prev => [...prev, makeLog({ type: 'system', text: fb })]), friction.latency_ticks * 1000);
                } else {
                    setLogs(prev => [...prev, makeLog({ type: 'system', text: fb })]);
                }
            }

            if (res.data.cixus_judgment) {
                const delta = res.data.cixus_judgment.authority_change || 0;
                SoundEngine.play('cixusJudge');
                if (delta > 0) setTimeout(() => SoundEngine.play('authorityGain'), 350);
                else if (delta < 0) setTimeout(() => SoundEngine.play('authorityLoss'), 350);
                setLogs(prev => [...prev, makeLog({
                    type: 'cixus',
                    text: res.data.cixus_judgment.commentary,
                    delta,
                    animate: true,
                })]);
            }
            if (res.data.sitrep) {
                setLogs(prev => [...prev, makeLog({ type: 'system', text: `SITREP: ${res.data.sitrep}`, isSitrep: true })]);
            }
        } catch (err) {
            const errMsg = err.response?.data?.detail || err.message;
            pushToast({ message: `Transmission failed: ${errMsg}`, type: 'error' });
            setLogs(prev => [...prev, makeLog({ type: 'system', text: `ERROR: ${errMsg}` })]);
        } finally {
            setIsTransmitting(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warId, isTransmitting]);

    const handlePresetCommand = useCallback(cmd => { SoundEngine.play('click'); submitCommand(cmd); }, [submitCommand]);

    const handleExtremeSubmit = useCallback(e => {
        e.preventDefault();
        if (!extremeCmd.trim()) return;
        submitCommand(extremeCmd);
        setExtremeCmd('');
    }, [extremeCmd, submitCommand]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="h-screen bg-obsidian-950 flex flex-col overflow-hidden text-obsidian-300 font-mono">

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {isLowAuth && (
                <div className="absolute inset-0 pointer-events-none z-50 opacity-10 bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] bg-cover mix-blend-overlay" />
            )}

            {/* ── TOP BAR ────────────────────────────────────────────────── */}
            <header className="h-12 lg:h-14 border-b border-obsidian-800 bg-obsidian-900/90 flex items-center justify-between px-3 lg:px-6 shrink-0 backdrop-blur-md z-40">
                <div className="flex items-center gap-2 lg:gap-4 min-w-0">
                    <button onClick={() => navigate('/dashboard')} className="p-1.5 hover:bg-obsidian-800 rounded-sm text-obsidian-500 transition-colors shrink-0">
                        <ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" />
                    </button>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs lg:text-sm font-bold text-obsidian-200 tracking-wider truncate">
                            WAR ROOM // {warId?.substring(0, 6)}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isTransmitting ? 'bg-gold-500 animate-ping' : 'bg-green-500'}`} />
                            <span className="text-[9px] text-obsidian-500 hidden sm:block">{isTransmitting ? 'TRANSMITTING...' : 'CONNECTED'}</span>
                        </div>
                    </div>
                    <div className={`hidden md:flex ml-2 px-2 py-1 border rounded-sm text-[9px] font-bold tracking-[0.15em] uppercase items-center gap-1 ${warPhase.color} ${warPhase.border} bg-obsidian-900/60 ${warPhase.pulse ? 'animate-pulse' : ''}`}>
                        {warPhase.label}
                        <span className="opacity-50 ml-1">T-{gameState?.turn ?? 0}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                    {/* Mute toggle */}
                    <button
                        onClick={() => { const m = !sfxMuted; SoundEngine.setMute(m); setSfxMuted(m); if (!m) SoundEngine.play('click'); }}
                        title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                        className="flex items-center gap-1 px-2 py-1.5 border border-obsidian-800 rounded-sm text-[9px] font-bold tracking-widest uppercase transition-all hover:border-obsidian-600 text-obsidian-500 hover:text-obsidian-300"
                    >
                        <span className="text-sm leading-none">{sfxMuted ? '🔇' : '🔊'}</span>
                    </button>
                    <button
                        onClick={() => setFogEnabled(f => !f)}
                        className={`flex items-center gap-1 px-2 py-1.5 border rounded-sm text-[9px] font-bold tracking-widest uppercase transition-all
                            ${fogEnabled ? 'border-obsidian-700 text-obsidian-500 hover:border-gold-700 hover:text-gold-500' : 'border-gold-700/60 text-gold-500 bg-gold-900/20'}`}
                    >
                        {fogEnabled ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span className="hidden sm:inline ml-1">FOG</span>
                    </button>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-[9px] font-bold tracking-widest text-obsidian-500">
                            <Wifi className={`w-3 h-3 ${isLowAuth ? 'text-crimson-500 animate-pulse' : 'text-gold-500'}`} />
                            <span className="hidden sm:inline">SYNC</span>
                        </div>
                        <div className="w-16 lg:w-32 h-1.5 bg-obsidian-800 rounded-full mt-0.5 overflow-hidden">
                            <motion.div
                                animate={{ width: `${authority}%` }}
                                className={`h-full ${isLowAuth ? 'bg-crimson-600' : 'bg-gold-500'}`}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* ── BODY ────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* ── TACTICAL MAP ────────────────────────────────────────── */}
                <div
                    ref={mapRef}
                    className="relative bg-black border-b lg:border-b-0 lg:border-r border-obsidian-800 overflow-hidden
                               h-[42vh] lg:h-auto lg:flex-1 flex items-center justify-center"
                    onClick={e => { if (e.currentTarget === e.target) setSelectedUnit(null); }}
                >
                    {/* Tactical map grid (faint, behind canvas) */}
                    <div className="absolute inset-0 grid grid-cols-[repeat(10,minmax(0,1fr))] grid-rows-[repeat(10,minmax(0,1fr))] opacity-[0.07] pointer-events-none" style={{ zIndex: 1 }}>
                        {Array.from({ length: 100 }).map((_, i) => (
                            <div key={i} className="border-[0.5px] border-obsidian-700" />
                        ))}
                    </div>

                    {/* Canvas battlefield — soldiers, bullets, blood */}
                    <BattlefieldCanvas fogEnabled={fogEnabled} />

                    {/* Fog overlay */}
                    {fogEnabled && <div className="absolute inset-0 bg-black/50 backdrop-blur-[1.5px] pointer-events-none" style={{ zIndex: 15 }} />}

                    {/* API units (if any) — tiny 2px dots on top of canvas */}
                    {allUnits.map(u => {
                        const px = u.position?.x ?? 50;
                        const pz = u.position?.z ?? u.position?.y ?? 50;
                        const visible = !u.isEnemy || !fogEnabled || isFogVisible(u, friendlyUnits);
                        if (u.isEnemy && fogEnabled && !visible) return null;
                        return (
                            <motion.div
                                key={u.unit_id}
                                initial={false}
                                animate={{ left: `${px}%`, top: `${pz}%` }}
                                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                                onClick={e => { e.stopPropagation(); setSelectedUnit(u); SoundEngine.play('click'); }}
                                className="absolute cursor-pointer"
                                style={{ zIndex: 25, transform: 'translate(-50%,-50%)' }}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full
                                    ${u.isEnemy ? 'bg-cyan-400' : 'bg-crimson-400'}
                                    ${selectedUnit?.unit_id === u.unit_id ? 'ring-1 ring-gold-400 scale-150' : ''}`}
                                />
                            </motion.div>
                        );
                    })}

                    {/* ── PLAYER COMMANDER DOT — scales with authority: 5px → 15px ── */}
                    {(() => {
                        // 5px at authority 0 (fresh lieutenant), 15px at authority 100 (General)
                        const dotSize = 5 + (authority / 100) * 10;
                        const half = dotSize / 2;
                        const glow = `0 0 ${6 + authority / 10}px rgba(253,224,71,${0.6 + authority / 250})`;
                        return (
                            <div
                                className="absolute pointer-events-none"
                                style={{ left: `${friendlyUnits[0]?.position?.x ?? 22}%`, top: `${friendlyUnits[0]?.position?.z ?? friendlyUnits[0]?.position?.y ?? 65}%`, zIndex: 30, transform: 'translate(-50%,-50%)' }}
                            >
                                <motion.div
                                    animate={{ scale: [1, 2.4, 1], opacity: [0.45, 0, 0.45] }}
                                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeOut' }}
                                    className="absolute rounded-full bg-gold-400"
                                    style={{ width: dotSize, height: dotSize, top: -half, left: -half }}
                                />
                                <div
                                    className="absolute rounded-full bg-gold-300 border border-gold-100"
                                    style={{ width: dotSize, height: dotSize, top: -half, left: -half, boxShadow: glow }}
                                />
                            </div>
                        );
                    })()}

                    {/* Empty state */}
                    {(!gameState?.units || gameState.units.length === 0) && (
                        <div className="absolute bottom-3 left-3 z-30 text-[8px] font-mono text-obsidian-800 tracking-widest uppercase pointer-events-none">
                            battlefield online
                        </div>
                    )}

                    {/* Unit Inspector */}
                    <AnimatePresence>
                        {selectedUnit && (
                            <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                transition={{ duration: 0.14 }}
                                className="absolute bottom-3 left-3 z-30 w-52 bg-obsidian-900/95 border border-obsidian-700 backdrop-blur-md rounded-sm overflow-hidden shadow-2xl"
                            >
                                <div className={`h-[2px] w-full ${selectedUnit.isEnemy ? 'bg-cyan-600' : 'bg-crimson-600'}`} />
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <Crosshair className={`w-3 h-3 ${selectedUnit.isEnemy ? 'text-cyan-500' : 'text-crimson-500'}`} />
                                            <span className={`text-[8px] font-bold tracking-[0.2em] uppercase ${selectedUnit.isEnemy ? 'text-cyan-500' : 'text-crimson-500'}`}>
                                                {selectedUnit.isEnemy ? 'ENEMY' : 'FRIENDLY'}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedUnit(null)} className="text-obsidian-600 hover:text-obsidian-400"><X className="w-3 h-3" /></button>
                                    </div>
                                    <div className="space-y-1.5 text-[10px]">
                                        {[
                                            ['ID', selectedUnit.unit_id?.substring(0, 8).toUpperCase()],
                                            ['TYPE', selectedUnit.type?.toUpperCase() || 'UNKNOWN'],
                                            ['POS', `X:${Math.round(selectedUnit.position?.x ?? 0)} Z:${Math.round(selectedUnit.position?.z ?? selectedUnit.position?.y ?? 0)}`],
                                            ['STATUS', selectedUnit.status?.toUpperCase() || 'ACTIVE'],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between">
                                                <span className="text-obsidian-600 tracking-widest text-[8px]">{k}</span>
                                                <span className="text-obsidian-300 font-bold">{v}</span>
                                            </div>
                                        ))}
                                        {selectedUnit.health !== undefined && (
                                            <div>
                                                <div className="flex justify-between mb-0.5">
                                                    <span className="text-obsidian-600 tracking-widest text-[8px]">HP</span>
                                                    <span className={`font-bold ${selectedUnit.health > 50 ? 'text-green-500' : 'text-crimson-500'}`}>{selectedUnit.health}%</span>
                                                </div>
                                                <div className="w-full h-1 bg-obsidian-800 rounded-full overflow-hidden">
                                                    <div className={`h-full ${selectedUnit.health > 50 ? 'bg-green-600' : 'bg-crimson-600'}`} style={{ width: `${selectedUnit.health}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[7px] text-obsidian-800 mt-2 tracking-widest">ESC TO DISMISS</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Enemy comms ticker */}
                    <AnimatePresence>
                        {enemyComms.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute bottom-3 right-3 z-30 w-60 lg:w-72 space-y-1"
                            >
                                <div className="flex items-center gap-1.5 mb-1.5">
                                    <Radio className="w-3 h-3 text-cyan-700 animate-pulse" />
                                    <span className="text-[7px] text-cyan-900 tracking-[0.2em] uppercase font-bold">INTERCEPTED COMMS</span>
                                </div>
                                {enemyComms.map(c => (
                                    <motion.div key={c.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                                        className="bg-obsidian-950/90 border border-cyan-900/30 px-2.5 py-1.5 rounded-sm">
                                        <p className="text-[8px] text-cyan-800 leading-relaxed">
                                            <span className="text-cyan-950 mr-1.5">[{c.ts}]</span>{c.text}
                                        </p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── RIGHT / BOTTOM COMMAND PANEL ────────────────────────── */}
                <div className="flex flex-col lg:w-96 bg-obsidian-900/80 border-t lg:border-t-0 lg:border-l border-obsidian-800 overflow-hidden flex-1 lg:flex-none">

                    {/* Mobile tab bar */}
                    <div className="flex lg:hidden border-b border-obsidian-800 bg-obsidian-950 shrink-0">
                        {TABS.map(({ id, label, Icon }) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-bold tracking-widest uppercase transition-all
                                    ${activeTab === id
                                        ? id === 'extreme' ? 'text-gold-500 border-b-2 border-gold-600 bg-gold-950/20'
                                            : 'text-crimson-400 border-b-2 border-crimson-700 bg-crimson-950/10'
                                        : 'text-obsidian-600 hover:text-obsidian-400'
                                    }`}>
                                <Icon className="w-3.5 h-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* ── Desktop layout ─────────────────────────────────── */}
                    <div className="hidden lg:flex flex-col flex-1 overflow-hidden">

                        {/* LOG PANEL — always visible, takes remaining space above commands */}
                        <div className="flex-1 min-h-[140px] overflow-hidden flex flex-col border-b border-obsidian-800">
                            <LogPanel logs={logs} logsEndRef={logsEndRef} />
                        </div>

                        {/* COMMAND SECTION — scrollable so nothing is ever cut off */}
                        <div className="shrink-0 overflow-y-auto" style={{ maxHeight: '58%' }}>

                            {/* Tactical preset orders */}
                            <div className="bg-obsidian-950/50 border-b border-obsidian-800">
                                <div className="px-4 pt-3 flex items-center justify-between">
                                    <span className="text-[9px] text-obsidian-600 tracking-widest uppercase font-bold">Tactical Orders</span>
                                    {isTransmitting && <span className="text-[9px] text-gold-600 animate-pulse tracking-widest">TRANSMITTING...</span>}
                                </div>
                                <CommandGrid onCommand={handlePresetCommand} isTransmitting={isTransmitting} />
                            </div>

                            {/* Tactical Doctrine panel */}
                            <div className="border-b border-obsidian-800">
                                <TacticsPanel onSelect={handlePresetCommand} isTransmitting={isTransmitting} compact />
                            </div>

                            {/* Extreme Command — collapse/expand */}
                            <div>
                                <button onClick={() => setExtremeOpen(o => !o)}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold tracking-widest uppercase transition-all
                                        ${extremeOpen ? 'text-gold-400 bg-gold-950/20' : 'text-obsidian-600 hover:text-gold-600 hover:bg-obsidian-800/30'}`}>
                                    <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Extreme Command</span>
                                    <span className="text-[8px] opacity-60">{extremeOpen ? '▲ COLLAPSE' : '▼ EXPAND'}</span>
                                </button>
                                <AnimatePresence>
                                    {extremeOpen && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden border-t border-obsidian-800/50"
                                        >
                                            <ExtremePanel
                                                extremeCmd={extremeCmd}
                                                setExtremeCmd={setExtremeCmd}
                                                onSubmit={handleExtremeSubmit}
                                                isTransmitting={isTransmitting}
                                                isLowAuth={isLowAuth}
                                                compact
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>
                    </div>


                    {/* Mobile tab content */}
                    <div className="lg:hidden flex-1 overflow-hidden flex flex-col">
                        {activeTab === 'orders' && (
                            <div className="flex-1 overflow-y-auto">
                                {isTransmitting && (
                                    <div className="px-4 pt-3 flex items-center gap-2">
                                        <Activity className="w-3 h-3 text-gold-500 animate-spin" />
                                        <span className="text-[9px] text-gold-600 tracking-widest">TRANSMITTING...</span>
                                    </div>
                                )}
                                <CommandGrid onCommand={handlePresetCommand} isTransmitting={isTransmitting} />
                            </div>
                        )}
                        {activeTab === 'log' && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <LogPanel logs={logs} logsEndRef={logsEndRef} />
                            </div>
                        )}
                        {activeTab === 'tactics' && (
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <TacticsPanel onSelect={cmd => { handlePresetCommand(cmd); setActiveTab('log'); }} isTransmitting={isTransmitting} />
                            </div>
                        )}
                        {activeTab === 'extreme' && (
                            <div className="flex-1 overflow-y-auto">
                                <ExtremePanel
                                    extremeCmd={extremeCmd}
                                    setExtremeCmd={setExtremeCmd}
                                    onSubmit={handleExtremeSubmit}
                                    isTransmitting={isTransmitting}
                                    isLowAuth={isLowAuth}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameContainer;
