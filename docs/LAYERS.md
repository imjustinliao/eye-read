# LAYERS.md — Build Order + Progress Log

## Rules
- Complete each layer fully before starting the next
- Each layer must feel polished — not prototype quality
- Never check a box without human confirmation
- Append to Progress Log after every confirmed commit

---

## Layer 0 — Scaffold
- [x] CLAUDE.md + docs/ created
- [x] Next.js 14 + TypeScript + Tailwind initialized
- [x] All dependencies installed
- [x] Folder structure created
- [x] `.env.local` created + `.gitignore` verified
- [x] Security headers in `next.config.ts`
- [x] **Commit v0.0**

## Layer 1 — Companion on Canvas
- [x] Walk human through Firebase console setup (exact GUI steps)
- [x] `lib/firebase.ts` — initialize Firebase
- [x] Canvas page renders static hardcoded article text
- [x] `Companion.tsx` — renders a predefined PNG on canvas
- [x] Pretext integration — text reflows around companion
- [x] Drag companion — text reflows live with smooth physics
- [x] Click companion — rotation animation (Framer Motion)
- [x] **Commit v0.1**

## Layer 2 — Eye Tracking
- [x] Eye placement tool — Figma-style drag + corner handles
- [x] Calibration stored per companion (fractional coords)
- [x] Pupil rendering + cursor tracking (requestAnimationFrame)
- [x] Eye color themes — Dark, Red presets + custom color picker
- [x] **Commit v0.2**

## Layer 3 — Two Companion Modes
- [ ] Page-anchored mode
- [ ] Window-fixed mode + Pretext recalculates on scroll
- [ ] Mode toggle per companion
- [ ] **Commit v0.3**

## Layer 4 — URL Fetch + Article Rendering
- [ ] `/api/fetch-url` with SSRF protection
- [ ] Readability + Cheerio parsing
- [ ] Real article renders on canvas with Pretext
- [ ] Loading state
- [ ] **Commit v0.4**

## Layer 5 — Themes
- [ ] Origin, The Times, Forbes, Vogue, Wired themes
- [ ] ThemePicker component
- [ ] **Commit v0.5**

## Layer 6 — Multiple Companions
- [ ] CompanionManager — add/remove/reposition
- [ ] All track + spin independently
- [ ] Pretext handles multiple zones
- [ ] Performance confirmed: 3+ companions
- [ ] **Commit v0.6**

## Layer 7 — Chrome Extension
- [ ] Manifest V3 + popup + content script + service worker
- [ ] Walk human through loading in Chrome
- [ ] **Commit v0.7**

## Layer 8 — Marketplace
- [ ] Upload, background removal, eye placement, Firebase storage
- [ ] Browse + search by name
- [ ] Firestore rules finalized
- [ ] **Commit v0.8**

## Layer 9 — Animated Eyes + Effects
- [ ] 10 animated eye styles: Lightning, Heart, Sparkle, Spiral, Fire, Cat slit, Star, Cross, Diamond, Flower
- [ ] Character effect presets per instance: spin, rotate, expand/shrink, custom
- [ ] Instance resizing on canvas
- [ ] **Commit v0.9**

## Layer 10 — Polish + Ship
- [ ] Performance audit, Vercel deploy, Web Store prep, final README
- [ ] **Commit v1.0**

---

## Progress Log
[v0.0] — GitHub init: MIT license + README (github.com)
[v0.0] 2026-03-31 — Scaffold: Next.js + TypeScript + all dependencies + folder structure + CLAUDE.md + docs/
[v0.1] 2026-03-31 — Companion on canvas: Firebase init, Pretext text reflow, drag + rotate with pixel-accurate shape wrapping
[v0.2] 2026-03-31 — Eye tracking: placement tool, cursor-following pupils, color presets + custom picker
