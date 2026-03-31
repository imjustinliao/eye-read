# SPEC.md — Product Specification

## What it is

A Chrome extension + Next.js web app that transforms any article, blog post, or website into a themed reading canvas populated with silent, eye-tracking companions. The experience is mysterious, alive, and unlike anything that exists on the web.

## The three parts

**1 — The canvas**
A Next.js page. The user pastes a URL → the app fetches the content, strips noise (ads, popups, nav), and renders it inside a chosen theme. Pretext handles all text layout so text can evade companions dynamically.

**2 — The companion system**
Each companion is a draggable PNG image with calibrated eyes. Pupils track the cursor in real time. Click = spin. Drag = text reflows live around new position. Multiple companions coexist — all tracking simultaneously and independently.

**3 — The Chrome extension**
Toolbar icon opens the extension panel. User pastes URL, picks theme, manages companions, opens the canvas.

---

## Companion — full detail

### Image
- 5 predefined companions in `/public/companions/`
- Custom photo upload supported
- Background removal tool (Remove.bg API) — optional, user-triggered

### Eyes
- User places two circles over the image — one per eye
- Each circle: drag to position, resize to fit pupil boundary exactly
- Synthetic pupil overlay: black dot inside white ring, moves within boundary tracking cursor
- Eye color themes: default (dark) · amber · blue · white · red · void (pure black)
- Calibration data stored per companion — never guessed

### Interactions
- **Drag** — smooth physics (Framer Motion), text reflows live via Pretext
- **Click** — full 360° spin, smooth, Framer Motion
- **Page-anchored mode** — stays at position in article; scrolling past hides it
- **Window-fixed mode** — sticks to viewport at all scroll positions; Pretext recalculates evasion on every scroll tick
- Unlimited companions — user adds as many as they want
- All track cursor simultaneously without performance degradation

---

## Themes — each is a complete color swap. Each theme defines fonts, spacing, column layout, heading treatment, image treatment, color palette.

| Theme | Feel | Reference |
|---|---|---|
| **Origin** | Inherits source site's colors + fonts | Whatever the user came from |
| **The Times** | Dense serif, black & white, authoritative | NYT, WSJ |
| **Forbes** | Bold headings, gold accent, high contrast | Forbes, Bloomberg |
| **Vogue** | Max white space, elegant serif, airy | Vogue, Harper's Bazaar |
| **Wired** | Dark, techy, sharp sans | Wired, The Verge |

---

## Marketplace

Users upload companions with a name. Others search by name, preview, and add them. Stored in Firebase.

---

## Security requirements

- All API keys in `.env.local` only — never committed
- `REMOVEBG_API_KEY` never `NEXT_PUBLIC_` — server-side proxy only
- `/api/fetch-url` SSRF prevention: block localhost, 127.0.0.1, 0.0.0.0, all private IP ranges; allow only http/https; 10s timeout; strip all `<script>` tags
- Rate limiting: 60 req/min per IP on `/api/fetch-url` and `/api/remove-bg`
- Input validation: file uploads = jpg/png/webp only, max 5MB
- Firebase rules tightened before real data stored (see firebase/firestore.rules)

## Performance requirements

| Metric | Target |
|---|---|
| Canvas initial load | < 2 seconds |
| Drag + eye tracking | < 16ms (60fps) |
| Pretext recalculation | < 5ms per event |
| URL fetch + parse | < 8 seconds — show loading state |

- Use `requestAnimationFrame` for all rendering — never `setInterval`
- `mousemove` throttled with `requestAnimationFrame`
- Test with 3+ companions before confirming any companion layer complete
- Firebase reads cached in memory — no re-fetching loaded data
