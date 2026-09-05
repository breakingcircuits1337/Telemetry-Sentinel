# 🛡️ Telemetry Sentinel

**A real-time browser telemetry monitoring, analysis, and defense platform.**

Telemetry Sentinel intercepts, decodes, and visualizes tracking beacons from known surveillance companies — then gives you the tools to fight back. It combines live fingerprint auditing, Shannon entropy analysis, AI-powered explanations, and actionable defense exports in a single dark-mode dashboard.

> **Zero remote exfiltration.** All analysis runs locally in your browser. No data leaves your machine.

---

## ✨ Features

### 🔴 Live Telemetry Alerts
Real-time feed of intercepted tracking beacons. The sentinel patches `window.fetch`, `navigator.sendBeacon`, and `XMLHttpRequest` to catch outgoing telemetry calls. Each alert shows:
- Harvester identity and company (Google, Meta, Microsoft, etc.)
- Destination host + IP + protocol (HTTPS / DNS / WSS)
- Extracted harvested fields with risk ratings (high / medium / low)
- Shannon entropy score per field — flags Bearer tokens, UUIDs, GPS coordinates
- Interdiction action: **Blocked**, **Allowed**, **Sanitized**, or **Poisoned**
- Grouped by endpoint with ping count deduplication

### 📈 Privacy Pulse (24-Hour Health Score)
An ECG-style waveform showing your real-time privacy health. The score is calculated as:
```
Health Score = (Blocked Requests / Total Evaluated) × 100
```
The waveform animation speed responds dynamically — calm at >85%, urgent at <45%. Historical 24-hour trend with min/max/avg and direction tracking.

### 🔥 Entropy Heatmap
A time-series matrix showing Shannon entropy across all telemetry channels. Detects high-entropy token leaks:
- **Bearer Tokens** — authorization headers exfiltrated to third parties
- **Encrypted PII** — hashed email, phone, or identity data
- **Crypto Fingerprints** — canvas/audio/WebGL unique hashes
- **Session UUIDs** — persistent cross-session identity tokens

Includes a sliding entropy waveform showing character-level entropy spikes in real time.

### 🔬 Live Browser Probe
Runs a complete fingerprint audit of your own browser without any remote call:
- Canvas 2D hash (GPU + font rendering fingerprint)
- WebGL vendor and renderer string
- Audio context oscillation fingerprint  
- Screen resolution, color depth, pixel ratio
- CPU core count and device memory
- Battery level and charging state
- Timezone, language, and connection type
- localStorage / sessionStorage / IndexedDB inventory
- **Uniqueness Score** (0–100) — how identifiable you are among all internet users

### 🕵️ Tracker Dossier
Profiles of 19 real surveillance entities including:
| Tracker | Company | Risk Score |
|---|---|---|
| Google Analytics 4 | Alphabet Inc. | 84/100 |
| Meta Pixel | Meta Platforms | 95/100 |
| LiveRamp RampID | LiveRamp Holdings | 98/100 |
| TikTok Pixel | ByteDance | 94/100 |
| Oracle BlueKai | Oracle Corp. | 96/100 |
| Hotjar Session Replay | Contentsquare | 92/100 |
| Microsoft DiagTrack | Microsoft Corp. | 89/100 |
| Samsung ACR | Samsung Electronics | 91/100 |
| … and more | | |

Each dossier includes: known domains, tracking techniques, sample beacon payloads, uBlock Origin filter rules, jurisdiction, and opt-out URLs.

### 🌐 Domain Reputation Checker *(new)*
Instantly check any domain or URL against the tracker database:
- Known tracker match with full entity profile
- Risk score (0–100) with color-coded verdict
- All associated domains highlighted
- Ready-to-paste uBlock Origin filter rule
- Heuristic analysis for unknown hosts (path keywords, numeric subdomains, pixel patterns, tracking TLDs)
- Lookup history sidebar

### 🛡️ Privacy Hardening Advisor *(new)*
Generates a personalized, prioritized hardening checklist based on your actual browser probe data:
- **Critical** → Canvas fingerprint, WebGL GPU leak, uBlock Origin
- **High** → Battery API exposure, DNS encryption, third-party cookies
- **Medium** → Device memory/CPU core spoofing, storage accumulation
- **Low** → Do Not Track header, HTTPS enforcement

Each recommendation includes: why it matters, step-by-step fix instructions, and links to official resources. Track your progress with a completion checkbox and progress bar.

### ☠️ Telemetry Poison Engine
Injects calibrated noise into outgoing telemetry to corrupt tracker identity graphs:
- **Fingerprint Jitter** — randomizes canvas/WebGL/audio hashes ±variance
- **Behavioral Noise** — synthetic mouse movement and keystroke cadence
- **Garbage Pollution** — injects fake metric fields into beacon payloads
- **Decoy Signatures** — floods tracker endpoints with synthetic device profiles

Configurable variance (1%–25%) with real-time disruption percentage display.

### 🌍 Network Architecture View
Visual map of tracker CDN infrastructure showing how surveillance companies route harvested data through globally distributed server clusters.

### 📋 Payload Auditor
Interactive tool to paste any raw telemetry beacon (URL + JSON body) and decode every parameter — identifies persistent identifiers, hardware specs, behavioral markers, and assigns risk ratings. Includes preset beacons from all 19 tracked entities.

### 📤 Defense Export
Exports actionable defense rules in three formats:
- **Pi-hole / Hosts file** — `0.0.0.0` block rules for every tracker domain
- **uBlock Origin filters** — ready-to-paste custom filter rules
- **Audit Report (JSON)** — full session log including fingerprint data and alerts

### 🤖 AI Telemetry Analyst (Gemini-powered)
Chat interface powered by Google Gemini 2.5 Flash. Ask anything about tracking mechanisms, company surveillance practices, or how to defend against specific techniques. Falls back to curated heuristic responses when offline.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  React 19 + TypeScript SPA              │
│                                                         │
│  TelemetryInterceptor ──────────────────────────────┐  │
│  (patches fetch/XHR/sendBeacon)                     │  │
│                                                     ▼  │
│  TelemetryPoisonEngine ──► Alert Feed ──► Entropy   │  │
│  (noise injection)          (LiveAlerts)   (Heatmap) │  │
│                                                     │  │
│  TelemetryProber ──────────────────────────────────►│  │
│  (browser fingerprinting)                           │  │
│                                                     ▼  │
│  NetworkTelemetryArchitecture                          │
│  (entropy calc, PII scan, TLS fingerprint, blocklists) │
└─────────────────────────────────────────────────────────┘
                        │
                        │ /api/analyze-telemetry
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Express + TypeScript Backend (server.ts)      │
│                                                         │
│  Google Gemini 2.5 Flash ───── AI Analyst API          │
│  (privacy engineer persona)                             │
│  Heuristic fallback (offline, keyword-matched)          │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Visualization | D3.js, Framer Motion, Lucide icons |
| Backend | Express.js + TypeScript (server.ts) |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Build | Vite 6, esbuild, tsx |
| Runtime | Node.js / Bun |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or [Bun](https://bun.sh)
- A [Google AI Studio](https://aistudio.google.com) API key (free tier works; AI features degrade gracefully without one)

### Installation

```bash
git clone https://github.com/breakingcircuits1337/Telemetry-Sentinel.git
cd Telemetry-Sentinel

# Using npm
npm install

# Or with Bun (faster)
bun install
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:
```env
GEMINI_API_KEY=your_google_ai_studio_key_here
```

The app runs fully without the key — AI Analyst falls back to curated offline responses for common questions.

### Development

```bash
npm run dev
# or
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
Telemetry-Sentinel/
├── server.ts                    # Express backend + Gemini API proxy
├── src/
│   ├── App.tsx                  # Root component, tab routing, state
│   ├── types.ts                 # All TypeScript interfaces
│   ├── components/
│   │   ├── AiAnalystModal.tsx       # Gemini chat interface
│   │   ├── DefenseExportModal.tsx   # Pi-hole / uBlock export
│   │   ├── DomainChecker.tsx        # Domain reputation lookup ✨
│   │   ├── EntropyHeatmap.tsx       # Time-series entropy matrix
│   │   ├── EntropyHeatmapMatrix.tsx # Matrix grid rendering
│   │   ├── EntropySlidingWaveform.tsx # Character-level entropy viz
│   │   ├── GeospatialHarvestHeatmap.tsx # World map of tracker CDNs
│   │   ├── HarvestedDataMatrix.tsx  # Data type × category matrix
│   │   ├── Header.tsx               # Nav bar + status bar
│   │   ├── HealthSparkline.tsx      # 24h health trend chart
│   │   ├── LiveAlertsFeed.tsx       # Real-time alert cards
│   │   ├── LiveBrowserProbe.tsx     # Fingerprint audit display
│   │   ├── NetworkArchitectureView.tsx # Tracker infrastructure map
│   │   ├── PayloadInspector.tsx     # Beacon payload decoder
│   │   ├── PrivacyHardeningAdvisor.tsx # Personalized checklist ✨
│   │   ├── PrivacyPulse.tsx         # ECG health waveform
│   │   ├── TelemetryPoisonDashboard.tsx # Noise engine controls
│   │   └── TrackerDossier.tsx       # Tracker entity profiles
│   ├── data/
│   │   ├── trackerDatabase.ts       # 19 real tracker profiles
│   │   ├── geoClusterData.ts        # CDN cluster coordinates
│   │   └── worldGeoData.ts          # World map GeoJSON
│   ├── services/
│   │   ├── networkTelemetryArchitecture.ts  # Entropy, PII, TLS analysis
│   │   ├── telemetryInterceptor.ts          # fetch/XHR/beacon patcher
│   │   ├── telemetryPoisonEngine.ts         # Noise injection engine
│   │   └── telemetryProber.ts               # Browser fingerprint runner
│   └── utils/
│       └── audioAlerts.ts           # Sound cues for alert severity
├── .env.example
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔒 Privacy & Trust

- **All fingerprinting runs locally** — `telemetryProber.ts` reads browser APIs client-side only
- **No telemetry sent home** — Telemetry Sentinel does not report to any analytics service
- **Gemini API calls are opt-in** — only triggered when you use the AI Analyst feature
- **Interceptor is educational** — the `fetch`/XHR monkey-patching operates on same-origin calls in the demo environment; real third-party request blocking requires a browser extension

---

## 🗺️ Roadmap

- [ ] Firefox / Chrome extension for true network-layer interception
- [ ] Import HAR files for offline payload analysis
- [ ] PCAP integration for desktop traffic capture
- [ ] Historical session persistence (IndexedDB)
- [ ] Tracker RSS feed with new entity alerts
- [ ] Community-submitted tracker database contributions

---

## 🙏 Credits

Built by [@breakingcircuits1337](https://github.com/breakingcircuits1337)

Scaffolded from [google-gemini/aistudio-repository-template](https://github.com/google-gemini/aistudio-repository-template)

---

## 📄 License

Apache-2.0 — see source file headers.
