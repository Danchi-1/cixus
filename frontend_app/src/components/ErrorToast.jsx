import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Activity, ShieldAlert, Info, X, Wifi } from 'lucide-react';

/**
 * Toast variant configs
 *  type: 'error' | 'warning' | 'success' | 'info'
 */
const VARIANTS = {
    error: {
        container: 'bg-crimson-900/95 border-crimson-700 shadow-[0_0_30px_rgba(176,37,37,0.3)]',
        header: 'text-crimson-500',
        body: 'text-crimson-200',
        icon: <ShieldAlert className="w-5 h-5 text-crimson-500 shrink-0" />,
        label: 'SYSTEM BREACH',
        scanline: true,
    },
    warning: {
        container: 'bg-obsidian-900/95 border-gold-700/60 shadow-[0_0_20px_rgba(156,130,38,0.2)]',
        header: 'text-gold-500',
        body: 'text-gold-200',
        icon: <AlertTriangle className="w-5 h-5 text-gold-500 shrink-0" />,
        label: 'ALERT',
        scanline: false,
    },
    success: {
        container: 'bg-obsidian-900/95 border-obsidian-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]',
        header: 'text-green-500',
        body: 'text-obsidian-300',
        icon: <Activity className="w-5 h-5 text-green-500 shrink-0" />,
        label: 'CONFIRMED',
        scanline: false,
    },
    info: {
        container: 'bg-obsidian-900/95 border-obsidian-700 shadow-[0_0_15px_rgba(0,0,0,0.4)]',
        header: 'text-obsidian-400',
        body: 'text-obsidian-300',
        icon: <Info className="w-5 h-5 text-obsidian-500 shrink-0" />,
        label: 'SITREP',
        scanline: false,
    },
};

/**
 * Single Toast notification.
 *
 * Props:
 *   message  – string
 *   type     – 'error' | 'warning' | 'success' | 'info'  (default: 'error')
 *   onClose  – callback
 *   duration – auto-dismiss ms (0 = no auto-dismiss)
 */
export const Toast = ({ message, type = 'error', onClose, duration = 5000 }) => {
    const v = VARIANTS[type] || VARIANTS.error;

    useEffect(() => {
        if (!duration) return;
        const t = setTimeout(onClose, duration);
        return () => clearTimeout(t);
    }, [duration, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className={`
                relative w-80 border rounded-sm overflow-hidden font-mono
                backdrop-blur-md flex flex-col
                ${v.container}
            `}
        >
            {/* Scanline glitch overlay for errors */}
            {v.scanline && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
                    style={{
                        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)',
                    }}
                />
            )}

            {/* Top accent bar */}
            <div className={`h-[2px] w-full ${type === 'error' ? 'bg-crimson-600' : type === 'warning' ? 'bg-gold-700' : type === 'success' ? 'bg-green-700' : 'bg-obsidian-700'}`} />

            <div className="relative z-10 p-4">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        {v.icon}
                        <span className={`text-[9px] tracking-[0.2em] font-bold uppercase ${v.header}`}>
                            {v.label}
                        </span>
                        {/* Blinking status dot */}
                        <span className={`
                            w-1.5 h-1.5 rounded-full animate-ping
                            ${type === 'error' ? 'bg-crimson-500' : type === 'warning' ? 'bg-gold-500' : 'bg-green-500'}
                        `} />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-obsidian-600 hover:text-obsidian-400 transition-colors ml-2"
                        aria-label="Dismiss"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Message body */}
                <p className={`text-xs leading-relaxed ${v.body}`}>
                    {message}
                </p>

                {/* Bottom signal bar */}
                {type === 'error' && (
                    <div className="mt-3 flex items-center gap-1.5 opacity-50">
                        <Wifi className="w-3 h-3 text-crimson-600" />
                        <span className="text-[8px] text-crimson-700 tracking-widest uppercase">Signal Interrupted</span>
                    </div>
                )}
            </div>

            {/* Auto-dismiss progress bar */}
            {duration > 0 && (
                <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: duration / 1000, ease: 'linear' }}
                    style={{ transformOrigin: 'left' }}
                    className={`h-[1px] w-full origin-left ${type === 'error' ? 'bg-crimson-700' : type === 'warning' ? 'bg-gold-700' : 'bg-obsidian-600'}`}
                />
            )}
        </motion.div>
    );
};

/**
 * ToastContainer — Fixed portal area (bottom-right).
 * Renders a stack of toasts from a `toasts` array.
 *
 * Usage:
 *   const { toasts, pushToast, dismissToast } = useToasts();
 *   <ToastContainer toasts={toasts} onDismiss={dismissToast} />
 */
export const ToastContainer = ({ toasts, onDismiss }) => (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence initial={false}>
            {toasts.map((t) => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast
                        message={t.message}
                        type={t.type}
                        duration={t.duration}
                        onClose={() => onDismiss(t.id)}
                    />
                </div>
            ))}
        </AnimatePresence>
    </div>
);

/**
 * useToasts – lightweight toast state hook.
 *
 * Returns { toasts, pushToast, dismissToast }
 * pushToast({ message, type?, duration? })
 */
export const useToasts = () => {
    const [toasts, setToasts] = React.useState([]);

    const pushToast = React.useCallback(({ message, type = 'error', duration = 5000 }) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const dismissToast = React.useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, pushToast, dismissToast };
};

export default Toast;
