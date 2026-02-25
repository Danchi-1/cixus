# Cixus RAGE — Frontend

React + Vite frontend for the Cixus RAGE war game.

## Stack

- **React 18** — UI framework
- **Vite** — build tool + dev server
- **Framer Motion** — animations
- **Tailwind CSS** — styling (custom `obsidian`, `crimson`, `gold` colour palette)
- **Lucide React** — icons
- **Web Audio API** — synthesized sound effects (no external audio files)

## Setup

```bash
npm install
npm run dev      # dev server → http://localhost:5173
npm run build    # production build → dist/
```

The dev server proxies `/api` requests to `http://localhost:8000` (see `vite.config.js`).

## Structure

```
src/
├── pages/
│   ├── Landing.jsx          # Landing page (hero, features, tactics showcase)
│   ├── Dashboard.jsx        # Player hub (active wars, reputation metrics)
│   └── GameContainer.jsx    # War room (map, logs, commands, tactics panel)
│
├── components/
│   ├── TacticsShowcase.jsx  # 31 war tactics (5 pinned + 26 searchable)
│   │                        # Exports: PINNED_TACTICS, EXTENDED_TACTICS,
│   │                        #          DifficultyBar, WithTooltip
│   ├── TacticsPanel.jsx     # War room sidebar/tab for tactical doctrine
│   ├── ErrorToast.jsx       # Toast notification system (useToasts hook)
│   └── TypewriterText.jsx   # Animated typewriter component
│
├── utils/
│   └── SoundEngine.js       # Web Audio API sound engine
│                            # SoundEngine.play('click' | 'transmit' | ...)
│
├── api.js                   # Axios instance with base URL config
├── App.jsx                  # Router (Landing → Dashboard → GameContainer)
└── index.css                # Global styles + Tailwind base
```

## Sound Effects

All sounds are synthesized via Web Audio API — no audio files required.

```js
import SoundEngine from './utils/SoundEngine';
SoundEngine.play('click');         // tactical order button
SoundEngine.play('transmit');      // command sent
SoundEngine.play('cixusJudge');   // AI response received
SoundEngine.play('authorityGain');
SoundEngine.play('authorityLoss');
SoundEngine.play('commsIntercept');
SoundEngine.play('warStart');
SoundEngine.play('lowAuthority');  // AP < 30 alarm
SoundEngine.play('tacticSelect'); // tactic panel click
SoundEngine.setMute(true);
SoundEngine.setVolume(0.5);        // 0–1
SoundEngine.init();                // restore saved mute/volume from localStorage
```

## Tactics Data

Import tactics directly from `TacticsShowcase.jsx`:

```js
import { PINNED_TACTICS, EXTENDED_TACTICS } from './components/TacticsShowcase';
// PINNED_TACTICS  → 5 core tactics
// EXTENDED_TACTICS → 26 additional tactics
// Total: 31 historical/doctrinal tactics with full dossiers
```

## Auth Flow

The frontend always sends the stored `player_id` from `localStorage` when calling `/identify`,
so returning players are recognised even if their IP changes:

```js
const body = {};
const stored = localStorage.getItem('cixus_player');
if (stored) {
  const p = JSON.parse(stored);
  if (p?.id) body.player_id = p.id;
}
const { data: player } = await api.post('/api/v1/players/identify', body);
localStorage.setItem('cixus_player', JSON.stringify(player));
```
