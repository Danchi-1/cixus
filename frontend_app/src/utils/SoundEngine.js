/**
 * SoundEngine.js — Cixus RAGE Sound System
 *
 * All sounds are synthesized via Web Audio API.
 * No external audio files required.
 *
 * Usage:
 *   import { SoundEngine } from './SoundEngine';
 *   SoundEngine.play('click');
 *   SoundEngine.setMute(true);
 *   SoundEngine.setVolume(0.5); // 0–1
 */

let _ctx = null;
let _muted = false;
let _volume = 0.45;

// Lazily create the AudioContext on first use (browsers block audio until user gesture)
function ctx() {
    if (!_ctx) {
        try {
            _ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('[SoundEngine] Web Audio API not supported:', e);
        }
    }
    if (_ctx && _ctx.state === 'suspended') {
        _ctx.resume();
    }
    return _ctx;
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

/** Play a simple oscillator tone */
function tone({ frequency = 440, type = 'sine', duration = 0.15, gain = 0.4, delay = 0, attack = 0.005, release = 0.08 } = {}) {
    const c = ctx();
    if (!c || _muted) return;

    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gainNode = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(gain * _volume, now + attack);
    gainNode.gain.setValueAtTime(gain * _volume, now + duration - release);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gainNode);
    gainNode.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
}

/** Sweep oscillator from f1 → f2 */
function sweep({ f1 = 440, f2 = 220, type = 'sawtooth', duration = 0.3, gain = 0.3, delay = 0 } = {}) {
    const c = ctx();
    if (!c || _muted) return;

    const now = c.currentTime + delay;
    const osc = c.createOscillator();
    const gainNode = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(f1, now);
    osc.frequency.exponentialRampToValueAtTime(f2, now + duration);

    gainNode.gain.setValueAtTime(gain * _volume, now);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    osc.connect(gainNode);
    gainNode.connect(c.destination);
    osc.start(now);
    osc.stop(now + duration);
}

/** White/brown noise burst */
function noise({ duration = 0.08, gain = 0.15, delay = 0, lowpass = 800 } = {}) {
    const c = ctx();
    if (!c || _muted) return;

    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brownian noise approximation
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
    }

    const now = c.currentTime + delay;
    const source = c.createBufferSource();
    source.buffer = buffer;

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;

    const gainNode = c.createGain();
    gainNode.gain.setValueAtTime(gain * _volume, now);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(c.destination);
    source.start(now);
}

// ── Sound definitions ─────────────────────────────────────────────────────────

const SOUNDS = {

    /** Short tactile click when pressing a tactical order button */
    click() {
        tone({ frequency: 880, type: 'square', duration: 0.06, gain: 0.25, attack: 0.002, release: 0.04 });
        tone({ frequency: 660, type: 'square', duration: 0.04, gain: 0.15, delay: 0.03, attack: 0.001, release: 0.03 });
    },

    /** Morse-code-like TX burst when sending a command */
    transmit() {
        const dashes = [0, 0.10, 0.20];
        dashes.forEach(d => tone({ frequency: 1200, type: 'sine', duration: 0.07, gain: 0.3, delay: d }));
        // fading tail
        tone({ frequency: 800, type: 'sine', duration: 0.2, gain: 0.08, delay: 0.32 });
    },

    /** Ominous low drone when Cixus AI response arrives */
    cixusJudge() {
        // Deep subsonic thud
        sweep({ f1: 90, f2: 45, type: 'sine', duration: 0.5, gain: 0.55, delay: 0 });
        // Eerie high overtone
        tone({ frequency: 1320, type: 'sine', duration: 0.8, gain: 0.08, delay: 0.1, attack: 0.2, release: 0.4 });
        // Metallic click
        noise({ duration: 0.05, gain: 0.2, delay: 0, lowpass: 3000 });
    },

    /** Ascending chime when authority points increase */
    authorityGain() {
        const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
        notes.forEach((f, i) =>
            tone({ frequency: f, type: 'sine', duration: 0.25, gain: 0.3, delay: i * 0.06, release: 0.15 })
        );
    },

    /** Descending warning tone when authority is refused or lost */
    authorityLoss() {
        const notes = [440, 349, 262]; // A4 F4 C4
        notes.forEach((f, i) =>
            tone({ frequency: f, type: 'sawtooth', duration: 0.2, gain: 0.25, delay: i * 0.09, release: 0.1 })
        );
        noise({ duration: 0.1, gain: 0.12, delay: 0.28, lowpass: 600 });
    },

    /** Radio static burst for intercepted enemy comms */
    commsIntercept() {
        // Static
        noise({ duration: 0.12, gain: 0.18, delay: 0, lowpass: 4000 });
        // Carrier
        tone({ frequency: 2200, type: 'sine', duration: 0.06, gain: 0.12, delay: 0.02 });
        tone({ frequency: 1800, type: 'sine', duration: 0.04, gain: 0.10, delay: 0.07 });
        noise({ duration: 0.08, gain: 0.14, delay: 0.12, lowpass: 3500 });
    },

    /** Dramatic war-start sound when entering the war room */
    warStart() {
        // Deep bass pulse
        sweep({ f1: 60, f2: 40, type: 'sine', duration: 1.0, gain: 0.55, delay: 0 });
        // Rising tension
        sweep({ f1: 200, f2: 800, type: 'sawtooth', duration: 0.6, gain: 0.15, delay: 0.3 });
        // High alarm note
        tone({ frequency: 1760, type: 'sine', duration: 0.4, gain: 0.2, delay: 0.5, attack: 0.1, release: 0.25 });
        // Impact noise
        noise({ duration: 0.15, gain: 0.25, delay: 0.55, lowpass: 1200 });
    },

    /** Subtle blip when units reposition on the map */
    unitMove() {
        tone({ frequency: 660, type: 'sine', duration: 0.08, gain: 0.12, attack: 0.003, release: 0.05 });
    },

    /** Pulsing alarm when authority drops below 30 */
    lowAuthority() {
        [0, 0.22, 0.44].forEach(d => {
            tone({ frequency: 523, type: 'square', duration: 0.14, gain: 0.3, delay: d });
        });
    },

    /** Brief confirm blip when a tactic is selected from the panel */
    tacticSelect() {
        tone({ frequency: 740, type: 'sine', duration: 0.05, gain: 0.2, attack: 0.002, release: 0.03 });
        tone({ frequency: 987, type: 'sine', duration: 0.07, gain: 0.18, delay: 0.04, attack: 0.001, release: 0.05 });
    },
};

// ── Ambient / continuous sounds ───────────────────────────────────────────────

let _ambientNodes = null;  // holds refs to stop ambient loop
let _heartbeatTimer = null;
let _currentAuthority = 100;

/** Start the always-on battlefield ambience: distant artillery drone */
function startAmbientLoop() {
    const c = ctx();
    if (!c || _ambientNodes) return;

    // Deep sub-bass rumble oscillator
    const bass = c.createOscillator();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(38, c.currentTime);
    // Very slow LFO wobble on the frequency (~0.08Hz)
    bass.frequency.setValueCurveAtTime(
        Float32Array.from({ length: 100 }, (_, i) => 38 + Math.sin(i / 100 * Math.PI * 2) * 4),
        c.currentTime, 12
    );

    const bassGain = c.createGain();
    bassGain.gain.setValueAtTime(0, c.currentTime);
    bassGain.gain.linearRampToValueAtTime(0.09 * _volume, c.currentTime + 3); // fade in

    // Mid-frequency rumble (cannons, distant)
    const mid = c.createOscillator();
    mid.type = 'sawtooth';
    mid.frequency.setValueAtTime(72, c.currentTime);

    const midFilter = c.createBiquadFilter();
    midFilter.type = 'lowpass';
    midFilter.frequency.value = 120;

    const midGain = c.createGain();
    midGain.gain.setValueAtTime(0, c.currentTime);
    midGain.gain.linearRampToValueAtTime(0.03 * _volume, c.currentTime + 4);

    bass.connect(bassGain); bassGain.connect(c.destination);
    mid.connect(midFilter); midFilter.connect(midGain); midGain.connect(c.destination);
    bass.start(); mid.start();

    _ambientNodes = { bass, bassGain, mid, midGain };

    // Restart the LFO curve every 12s so it keeps looping
    const loopLFO = () => {
        if (!_ambientNodes) return;
        try {
            bass.frequency.cancelScheduledValues(c.currentTime);
            bass.frequency.setValueCurveAtTime(
                Float32Array.from({ length: 100 }, (_, i) => 38 + Math.sin(i / 100 * Math.PI * 2) * 4),
                c.currentTime, 12
            );
        } catch { }
        _ambientNodes._lfoTimer = setTimeout(loopLFO, 11800);
    };
    _ambientNodes._lfoTimer = setTimeout(loopLFO, 11800);
}

function stopAmbientLoop() {
    if (!_ambientNodes) return;
    const c = ctx();
    if (c && _ambientNodes.bassGain) {
        _ambientNodes.bassGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
        _ambientNodes.midGain.gain.linearRampToValueAtTime(0, c.currentTime + 1.5);
        clearTimeout(_ambientNodes._lfoTimer);
        setTimeout(() => {
            try { _ambientNodes.bass.stop(); _ambientNodes.mid.stop(); } catch { }
            _ambientNodes = null;
        }, 1600);
    }
}

/** Schedule heartbeat ticks; rate escalates as authority falls toward 0 */
function scheduleHeartbeat(authority) {
    clearTimeout(_heartbeatTimer);
    if (_muted || authority > 30) return;               // only active in danger zone
    // BPM: 40 at ap=30 → 130 at ap=0
    const bpm = 40 + ((30 - Math.max(0, authority)) / 30) * 90;
    const interval = (60 / bpm) * 1000;
    const c = ctx();
    if (!c) return;
    // Single heartbeat pair
    tone({ frequency: 80, type: 'sine', duration: 0.06, gain: 0.25 * _volume });
    tone({ frequency: 65, type: 'sine', duration: 0.06, gain: 0.20 * _volume, delay: 0.09 });
    _heartbeatTimer = setTimeout(() => scheduleHeartbeat(_currentAuthority), interval);
}


// ── Public API ────────────────────────────────────────────────────────────────

export const SoundEngine = {
    play(name) {
        if (_muted) return;
        const fn = SOUNDS[name];
        if (fn) {
            try { fn(); } catch (e) { console.warn('[SoundEngine] Error playing', name, e); }
        } else {
            console.warn('[SoundEngine] Unknown sound:', name);
        }
    },

    /** Start ambient battlefield drone. Call after first user gesture. */
    startAmbient() { if (!_muted) startAmbientLoop(); },

    /** Stop ambient drone (e.g. on leaving war room). */
    stopAmbient() { stopAmbientLoop(); clearTimeout(_heartbeatTimer); },

    /**
     * Call whenever authority changes. Manages the heartbeat loop.
     * @param {number} authority 0–100
     */
    updateStress(authority) {
        _currentAuthority = authority;
        if (authority <= 30 && !_heartbeatTimer) {
            scheduleHeartbeat(authority); // kick off loop
        } else if (authority > 30) {
            clearTimeout(_heartbeatTimer);
            _heartbeatTimer = null;
        }
    },

    setMute(muted) {
        _muted = muted;
        if (muted) { stopAmbientLoop(); clearTimeout(_heartbeatTimer); }
        try { localStorage.setItem('cixus_sfx_muted', String(muted)); } catch { }
    },

    isMuted() { return _muted; },

    setVolume(v) {
        _volume = Math.max(0, Math.min(1, v));
        // Update live ambient gain if running
        if (_ambientNodes) {
            const c = ctx();
            if (c) {
                _ambientNodes.bassGain.gain.setTargetAtTime(0.09 * _volume, c.currentTime, 0.5);
                _ambientNodes.midGain.gain.setTargetAtTime(0.03 * _volume, c.currentTime, 0.5);
            }
        }
        try { localStorage.setItem('cixus_sfx_volume', String(_volume)); } catch { }
    },

    getVolume() { return _volume; },

    init() {
        try {
            const m = localStorage.getItem('cixus_sfx_muted');
            if (m !== null) _muted = m === 'true';
            const v = localStorage.getItem('cixus_sfx_volume');
            if (v !== null) _volume = parseFloat(v) || 0.45;
        } catch { }
    },
};

export default SoundEngine;
