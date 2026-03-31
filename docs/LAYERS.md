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
- [ ] Walk human through Firebase console setup (exact GUI steps)
- [ ] `lib/firebase.ts` — initialize Firebase
- [ ] Canvas page renders static hardcoded article text
- [ ] `Companion.tsx` — renders a predefined PNG on canvas
- [ ] Pretext integration — text reflows around companion
- [ ] Drag companion — text reflows live with smooth physics
- [ ] Click companion — spin animation (Framer Motion)
- [ ] **Commit v0.1**

## Layer 2 — Eye Tracking
- [ ] Eye placement tool — two circles, drag + resize
- [ ] Calibration stored per companion
- [ ] Pupil rendering + cursor tracking
- [ ] Eye color themes
- [ ] **Commit v0.2**

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

## Layer 9 — Polish + Ship
- [ ] Performance audit, Vercel deploy, Web Store prep, final README
- [ ] **Commit v1.0**

---

## Progress Log
[v0.0] — GitHub init: MIT license + README (github.com)
