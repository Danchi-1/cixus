# CIXUS RAGE

> *War ends only when the General dies.*

A live tactical judgement engine where every order you issue is evaluated by **Cixus**, an AI Meta-Intelligence. Cowardice is punished. Brilliance is rewarded with Authority. There are no respawns. There is no undo.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Backend](#backend-setup)
  - [Frontend](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Deployment](#deployment)

---

## Overview

Cixus RAGE is a browser-based real-time war strategy game. Players are identified automatically by IP address — no registration required. Each war session is evaluated turn-by-turn by a Gemini-powered AI that scores your commands on tactical soundness, ethical weight, and risk profile.

Your **Authority Level** is the only resource that matters. Lose it all and the war ends.

---

## Architecture

```
Browser (React + Vite)
    │
    ├── /api/v1/players/identify   ← IP-based auth (no login required)
    ├── /api/v1/war/*              ← War session management + command submission
    └── /api/v1/players/*          ← Player profile + reputation
         │
    FastAPI (Python)
         │
    SQLAlchemy (async)
         │
    ┌────┴─────┐
    │  SQLite  │  (PostgreSQL to be implemented later on)
    └──────────┘
         │
    Gemini AI (google-generativeai)
      ├── Tactic Orchestrator     ← Parses & evaluates commands
      ├── Narrator                ← Generates lore, preludes, commentary
      └── Enemy AI                ← Adversarial response generation
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Framer Motion, Tailwind CSS, Lucide React |
| Backend | FastAPI, SQLAlchemy (async), Pydantic, Uvicorn |
| Database | PostgreSQL (production) / SQLite (local dev) |
| AI | Google Gemini (`google-generativeai`) |
| Auth | IP-based identity (no accounts, no passwords) |
| Hosting | Vercel (frontend) + Railway/Render (backend) |

---

## Getting Started

### Backend Setup

**Prerequisites:** Python 3.11+

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Copy and fill in environment variables
cp .env.example .env   # see Environment Variables section below

# 3. Initialise the database (creates cixus.db for local SQLite dev)
python init_db.py

# 4. Start the development server
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

> **SQLite note:** The default `DATABASE_URL` falls back to `sqlite+aiosqlite:///./cixus.db`
> for zero-config local development. For production, always set `DATABASE_URL` to a
> persistent PostgreSQL connection string.

---

### Frontend Setup

**Prerequisites:** Node.js 18+

```bash
cd frontend_app

# Install dependencies
npm install

# Start the dev server (proxies API to localhost:8000)
npm run dev
```

Frontend runs at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ── Database ──────────────────────────────────────────────────────────────────
# Leave blank to use local SQLite (development only — NOT persistent on serverless)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/cixus_rage

# ── AI ────────────────────────────────────────────────────────────────────────
GEMINI_API_KEY=AIza...

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY=change_me_in_production
```

> ⚠️ **Important:** If `DATABASE_URL` is not set, the app falls back to a local SQLite
> file. On serverless platforms (Vercel, Railway ephemeral instances), this file is wiped
> on every cold start, causing players to lose their identity. Always configure a
> persistent Postgres database for production.

---

## API Reference

Full interactive docs: `http://localhost:8000/docs`

### Identity

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/v1/players/identify` | IP-based login/register. Accepts optional `{ player_id }` body. |
| `GET` | `/api/v1/players/whoami` | Debug: shows the IP + headers the server detects. |
| `GET` | `/api/v1/players/{player_id}` | Fetch player profile. |

### War Sessions

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/v1/war/` | Start a new war session. |
| `GET` | `/api/v1/war/active?player_id=…` | List active wars for a player. |
| `GET` | `/api/v1/war/{war_id}/state` | Get current battlefield state. |
| `POST` | `/api/v1/war/{war_id}/command` | Submit a command (`{ type, content }`). |

### Identity Resolution (login logic)

The `/identify` endpoint uses a 3-layer lookup:
1. **`player_id`** from the request body (most reliable — survives IP changes and VPN)
2. **IP address** (fallback — normalises IPv4-mapped IPv6, strips ports, supports Cloudflare)
3. **Create new player** — only if both lookups fail

---

## Project Structure

```
cixus/
├── app/
│   ├── api/v1/
│   │   ├── player.py          # IP-based auth, /identify, /whoami
│   │   └── war.py             # War session CRUD + command submission
│   ├── core/
│   │   └── config.py          # Pydantic settings, DATABASE_URL fallback
│   ├── db/
│   │   └── base.py            # Async engine + session factory
│   ├── models/
│   │   ├── player.py          # Player model (ip_address, authority, reputation)
│   │   └── war.py             # WarSession model
│   ├── services/ai/
│   │   ├── orchestrator.py    # Tactic parsing + Cixus judgment
│   │   └── narrator.py        # Lore generation, preludes, commentary
│   └── main.py                # FastAPI app + lifespan + DB migration
│
├── frontend_app/
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx        # Landing page with tactics showcase
│       │   ├── Dashboard.jsx      # Player hub, active wars, reputation
│       │   └── GameContainer.jsx  # War room (map, logs, commands, tactics)
│       ├── components/
│       │   ├── TacticsShowcase.jsx  # Landing page tactics section (31 tactics)
│       │   ├── TacticsPanel.jsx     # War room tactics sidebar/tab
│       │   ├── TypewriterText.jsx   # Typewriter animation component
│       │   └── ErrorToast.jsx       # Toast notification system
│       └── utils/
│           └── SoundEngine.js       # Web Audio API synthesized sound effects
│
├── init_db.py
├── requirements.txt
└── README.md
```

---

## Key Features

### 🎯 IP-Based Authentication
No accounts, no passwords. Your IP is your identity. Includes fallback by stored `player_id` from `localStorage` so returning players survive IP changes, VPN toggling, and DHCP reassignment.

### ⚔️ AI Tactical Judgment
Every command is parsed and evaluated by Gemini AI (`orchestrator.py`). The AI extracts:
- **Intent pattern** (e.g. Feigned Retreat, Deep Maneuver, Encirclement)
- **Risk profile** (low / elevated / high / critical)
- **Ethical weight** (standard / controversial / war crime)
- **Authority delta** — how many AP you gain or lose for this move

### 📖 Tactics Showcase (31 tactics)
Available on both the Landing page and in the War Room:
- 5 prominently displayed "pinned" tactics with goal, required attribute, and difficulty bar
- 26 additional tactics accessible via search + dropdown
- Hover dossier tooltips with historical examples and when-to-use guidance

### 🔊 Sound System
Web Audio API synthesized sounds (no external files):
- War start, command transmit, Cixus judgment, authority gain/loss, enemy comms intercept, low-authority alarm, tactic select
- Mute toggle (🔊/🔇) in the war room header; preference persists in `localStorage`

### 📊 Reputation System
Players build reputation through warfare. Reputation metrics (traits + percentages) are stored in the `Player` model and displayed on the Dashboard with animated progress bars.

---

## Deployment

### Backend (Railway / Render / any PaaS)

1. Set `DATABASE_URL` to a persistent Postgres connection string
2. Set `GEMINI_API_KEY`
3. Set `SECRET_KEY`
4. Deploy with: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

The `Procfile` is already configured for Heroku-compatible platforms:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend (Vercel)

1. Connect the GitHub repository
2. Set **Root Directory** to `frontend_app`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set `VITE_API_URL` env var (if your API is not on the same origin)

---

## Debug Utilities

| Tool | Purpose |
|------|---------|
| `GET /api/v1/players/whoami` | Check what IP the server detects (production debug) |
| `GET /api/v1/war/{war_id}/state` | Inspect raw battlefield JSON |
| `python debug_request.py` | Test API locally |
| `python test_db_connection.py` | Verify database connectivity |
| Server logs (`print` statements in `player.py`) | Show IP + player_id resolution path |
