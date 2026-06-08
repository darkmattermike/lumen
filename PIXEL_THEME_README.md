# Lumen — Pixel / Terminal Theme Conversion

This build converts the Lumen frontend to the Terminal/pixel concept.

## What changed
- **`src/styles/globals.css`** — design tokens remapped to the pixel palette
  (green `#3ff39a`, amber `#ffc24a`, coral `#ff7a5c`, charcoal backgrounds),
  all three font vars → FreePixel, plus a global pixel layer (square corners,
  crisp rendering, single weight, hard borders, sunset wallpaper on `body`).
  Silkscreen is embedded as a fallback font.
- **`src/styles/pixel.css`** (NEW) — a reusable pixel design system:
  `.px-panel`, `.px-cell`, `.px-bar`, `.px-verdict`, `.px-zone`, `.px-row`,
  `.px-chip`, `.px-meter`, corner brackets, etc. Imported globally in `main.jsx`.
- **Rail nav** (`src/components/Rail/Rail.module.css`) — converted to pixel:
  square buttons, solid-green active state, square tooltips, pixel mobile bar.
- **Dashboard** (`src/pages/Dashboard/Dashboard.module.css`) — fully rebuilt to
  the concept: bracketed hero, status colors, zones, segmented pressure meter
  feel, solid panels. (Flagship page — matches the mockup.)
- **`index.html`** — removed Google Fonts (Lora/Space Mono/Figtree); uses local
  FreePixel + embedded Silkscreen. Theme-color updated.

## REQUIRED: add the font
Drop **`FreePixel.ttf`** into `public/fonts/` (referenced as `/fonts/FreePixel.ttf`).
Until then the app falls back to Silkscreen (embedded), so it still looks pixel.

## Per-page status
- **Dashboard** — fully rebuilt to concept structure ✅
- **All other pages** — adopt the concept look automatically via the global
  theme + design system (pixel font, palette, square corners, solid panels,
  brackets on cards, wallpaper). Their *layouts* are unchanged, so a few may want
  per-page structural polish to match the concept exactly (Transactions, Budgets,
  Calendar have concept designs ready to port next).

## Next steps
Tailor individual pages by rewriting their `*.module.css` to use the `.px-*`
primitives in `src/styles/pixel.css`, following the Dashboard as the pattern.

## Backend
`lumen-api` is untouched (server logic, no styling). The `.env` secret file was
removed for git safety; `.env.example` remains as the template.
