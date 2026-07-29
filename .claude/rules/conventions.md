---
paths:
  - "packages/**/*"
  - "tests/**/*"
  - "scripts/**/*"
---

# Coding Conventions, Readability & Hygiene

`CODING_STANDARDS.md` is the source of truth for Bruno's coding standards — read it. This file is
the judgment layer over those standards: the readability and code-hygiene calls a linter can't make.
Code and comments must read as a natural, permanent part of the project — never as artifacts of the
task or session that produced them.

## Style & formatting

The mechanical style — 2-space indent, single quotes (double for JSX/TSX attributes), semicolons,
no trailing commas, parenthesized arrow params, spacing around arrows, no space before call parens
— is enforced by ESLint and auto-fixed by `npm run lint:fix`. These deviations are real but
low-value to catch by hand: note them briefly rather than dwelling. Naming and casing that ESLint
can't mechanically repair still warrant attention.

## Readability

- **Descriptive names.** Functions and variables carry concise, descriptive names; an unclear or
  misleading name is worth raising even when the code is otherwise correct.
- **Extraction & abstraction.** Extract a helper or shared abstraction whenever it genuinely
  improves readability or serves a clear, anticipated reuse — this is encouraged and not gated on a
  minimum number of call sites; suggest it where it would help. Avoid only *unnecessary* abstraction:
  a layer that adds indirection without improving clarity or earning reuse — a generalized utility
  built for a single site with no foreseeable second user, or options/config added "for later."
  Breaking a long, complex function into well-named local helpers for readability is always fine.
- **Single-line indirection.** A one-line function that only forwards to another — adding a stack
  frame without adding meaning — should be inlined.
- **Optional chaining.** `?.` belongs only where the null case is handled right there (a fallback,
  early return, or guard). Used elsewhere it hides whether a value can genuinely be null and works
  against TypeScript's guarantees; fix the type or narrow first.
- **Comments explain the why.** Genuinely complex flow deserves a comment covering the rationale an
  obvious reading can't; self-explanatory code does not. Full bar in **Comments** below.
- **Functional, but readable.** Prefer obvious, linear pipelines over deep functional machinery
  (ADTs, monads) — the code should stay easy for any contributor to follow and extend.

## Comments

- **No situational or prompt-driven comments.** A comment must not reference the change, the task, or
  the moment it was written. Drop `// added to fix ...`, `// as requested`, `// new logic for X`,
  `// updated to handle ...`, `// per review`. If the reason genuinely matters, state it as a
  timeless fact about the code (or link the issue/PR) — not as "what I just did".
- **No obvious comments.** Don't restate what the code already says. `// loop over items` above a
  loop, `// set the name` above `obj.name = name`, `// return the result` — these add nothing. If the
  code is self-explanatory, leave it uncommented.
- **Comment the why, not the what.** Reserve comments for what the code can't show: non-obvious
  rationale, invariants, edge cases, a workaround and the constraint forcing it, units, or a pointer
  to a spec/issue. These stay useful long after the change lands.
- **No scaffolding or narration.** No `// ... existing code ...`, no placeholder or TODO-for-me
  notes, no changelog or step-by-step narration in comments, no commented-out code left behind.

## Beyond comments

- Don't add speculative options, parameters, or configuration "for later" that nothing in the change
  uses — build for the actual need. Extracting a helper for readability or clear, foreseeable reuse is
  fine (see **Readability → Extraction & abstraction** above).
- Match the surrounding code's style and naming so a change is indistinguishable from the existing
  codebase, not visibly bolted on.
- Keep diffs minimal — no unrelated reformatting or whitespace churn.
