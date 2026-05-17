# Lumen · Dusk+

A personal finance web app built on the four principles:

1. **Where I Am** — live balance and pressure gauge
2. **What Happened** — transaction history with AI pattern detection
3. **What's Coming** — bill calendar and cash flow forecast
4. **What If** — AI scenario engine powered by real numbers

## Stack

- **Frontend** — React + Vite
- **Styling** — CSS Modules
- **Routing** — React Router v6
- **Deployment** — Vercel

## Local Development

```bash
npm install
npm run dev
```

## Deploy

Push to your GitHub repo and connect to Vercel. The `vercel.json` handles SPA routing automatically.

## Project Structure

```
src/
├── components/
│   ├── Rail/              # Side navigation
│   ├── LumenDot/          # The living orb
│   ├── PressureGauge/     # SVG arc gauge
│   ├── BillRow/           # Upcoming bill list row
│   ├── Spotlight/         # Lumen AI response block
│   ├── WhatIfTheater/     # Scenario chips + live response
│   └── ScreenWrap/        # Padded rounded card wrapper
├── pages/
│   ├── Dashboard/         # Overview — all four principles
│   ├── Transactions/      # Transaction feed + AI notices
│   ├── Budgets/           # Category tracking + AI recs
│   ├── Accounts/          # Net worth + account cards
│   ├── Analytics/         # Charts + Lumen insights
│   └── Calendar/          # Bill calendar + upcoming events
├── data/
│   └── mock.js            # Placeholder data (replace with API)
└── styles/
    └── globals.css        # Design tokens + global atoms
```

## Design Tokens

All tokens live in `src/styles/globals.css`:

| Token | Value | Use |
|-------|-------|-----|
| `--safe` | `#5dcaa5` | Healthy / positive |
| `--calm` | `#6c8cff` | Neutral / informational |
| `--goal` | `#a78bff` | Goals / what-if |
| `--debt` | `#e87363` | Negative / debt |
| `--warn` | `#f0b04c` | Warning / watch |
