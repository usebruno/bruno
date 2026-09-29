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
- **Reuse before you write.** Before adding a component, hook, or helper, search for the one that
  already exists — by concept, not by the name you'd have picked — and read the nearest sibling
  solving the same shape of problem, since its call site shows the intended composition. Reuse is
  usually a *net deletion* — the bespoke markup and its CSS go. Where the existing primitive is
  *almost* right, widen it rather than standing up a near-duplicate beside it; two near-identical
  implementations diverge silently.
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

- **Anything added needs a live consumer in the same change.** No options, parameters, or
  configuration "for later"; no payload field no reader destructures, branch for a state the producer
  can't emit, or ignored parameter. Each is dead on arrival and reads as a contract honored somewhere
  else — if the consumer is a follow-up, leave it out. Extracting a helper for readability or clear,
  foreseeable reuse is fine (see **Readability → Extraction & abstraction** above).
- Match the surrounding code's style and naming so a change is indistinguishable from the existing
  codebase, not visibly bolted on.
- Keep diffs minimal — no unrelated reformatting or whitespace churn. A drive-by cleanup worth doing
  belongs in its own commit, and never in a *different package* than the change is about; interleaved,
  reviewers can't separate scope creep from load-bearing edits.

## Replacing code leaves nothing behind

Half a migration reads as a complete one — the leftovers survive review and mislead whoever edits the
file next. Closing the loop is part of the change.

- **Follow what you replaced to every reference and remove it there** — the CSS whose selectors the
  new markup no longer emits, the import whose last use just went, the prop nothing passes. Styles are
  the easiest to leave behind and the most misleading when left: CSS for a class that renders nothing
  fails silently and looks intentional.
- **Don't copy a block to its new home and leave the original.** Where both copies must genuinely
  exist — separate call sites, or one rule enforced on both sides of a process boundary — name the
  invariant in a comment at both, because nothing else keeps them in sync.
- **Reconcile the whole flow, not the entry point.** Reshaping something that crosses a boundary — a
  payload, a serialized field, a lookup key — means walking to every consumer on the far side.
  Deleting a control (a sanitizer, a validation or escaping step) is a decision to state, not a side
  effect of a rewrite.

## Before you call it done

- **Run the affected workspace's tests**, not just the specs you wrote.
- **Changed a return value or payload shape?** Other specs assert it too — exact-equality assertions
  elsewhere break on an added key.
- **Walk the acceptance criteria against the diff one at a time.** Compound criteria are what slip:
  the half of the sentence you didn't have open never got exercised.
