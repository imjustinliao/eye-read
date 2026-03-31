# WORKFLOW.md — Session Rules

## Every session starts like this

Read CLAUDE.md and all @imports. Then say:
> "Last confirmed: [v#.# — description]. Layer [#] — [name]. Next task: [specific task]."

Wait for human to say "go" before doing anything.

---

## During a session

One task at a time. Stop. Explain in plain English. Wait for confirmation.

Human responds with:
- `confirmed` or `looks good` → next task
- Description of issue → fix first
- Screenshot → read it, adjust

Never bundle changes. Never proceed without explicit confirmation.

**On "pause" or "wrap up":** commit, update LAYERS.md progress log, state next task clearly.

---

## Commit format

```
v#.# - Message
```

- Start at v0.0, increment by 0.1 per confirmed commit
- First word capitalized, symbols allowed, 1–15 words, no period
- Examples: `v0.1 - Companion renders on blank canvas` · `v0.2 - Eye tracking live — pupils follow cursor`

---

## GUI navigation

Always provide exact numbered steps for Firebase, Vercel, GitHub, Chrome. Never assume the human knows where to click.

---

## Explaining things

Human is a designer with limited engineering experience. Define every technical term when first used.
