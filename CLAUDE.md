# CLAUDE.md — Pretext Reading Companion

## ⚠️ PROTECTED FILES — NEVER MODIFY OR DELETE THESE
- `README.md` — only update when human explicitly asks
- `LICENSE` — never touch under any circumstances

---

## Project
Chrome extension + Next.js web app. Users paste any URL → content renders on a themed reading canvas → they place silent eye-tracking companions → text evades companions in real time using Pretext. Companions watch your cursor, spin on click, and can be dragged anywhere.

**Repo:** https://github.com/imjustinliao/eye-read

**Full spec:** @docs/SPEC.md
**Design philosophy:** @docs/DESIGN.md
**Build layers + progress log:** @docs/LAYERS.md
**Workflow rules:** @docs/WORKFLOW.md

---

## Stack
Next.js 14 (App Router) · TypeScript strict · Tailwind CSS · Firebase (Firestore + Storage) · `@chenglou/pretext` · Framer Motion · `@mozilla/readability` · Manifest V3 · Vercel

---

## Core Rules — follow every session

1. **Read this file + all @imports before writing any code.** State last confirmed step and next task. Wait for "go."
2. **One task at a time.** Stop after each. Explain in plain English. Wait for human confirmation before continuing.
3. **Never bundle changes.** One task → one confirmation → one commit.
4. **Pretext only** in evasion hot path — never `getBoundingClientRect`, `offsetHeight`, `offsetWidth`.
5. **TypeScript strict** — no `any` without an explanatory comment.
6. **Never commit `.env.local`** — verify `.gitignore` covers it at setup.
7. **`REMOVEBG_API_KEY` = server-side only** — never `NEXT_PUBLIC_`.
8. **Design consultation required** — before any UI code or styling, describe the design in plain words and wait for human approval.
9. **Commit format:** `v#.# - Message` — first word capitalized, symbols allowed, 1–15 words, no period.
10. **After every confirmed step:** commit + push + append one line to LAYERS.md.
11. **On "pause" or "wrap up":** commit current state, update progress log, tell human exactly what's next.
12. **Explain everything** — human is a designer with limited engineering experience. Define every technical term used.
13. **GUI steps** — when human needs to act in Firebase, Vercel, GitHub, or Chrome: provide exact numbered steps.
14. **Layer order is law** — never build ahead of the confirmed layer. See @docs/LAYERS.md.

---

## Progress Log
[v0.0] — GitHub init: MIT license + README (github.com)
