---
name: code-review
description: Review a Bruno diff, PR, or branch via focused reviewers run in parallel —
  correctness, security, DSL, React, cross-platform, tests. Mirrors the CodeRabbit /
  CODING_STANDARDS review.
---

# Reviewing Bruno code

This skill mirrors the automated CodeRabbit review (`.coderabbit.yaml`) so you can run
the same review locally. Source-of-truth order: coding standards → `CODING_STANDARDS.md`;
architecture/behavior → `.claude/rules/*`. `.coderabbit.yaml` mirrors these for CI parity —
read it for a path instruction not summarized here, but the rules win if they ever disagree.

The review is **split into focused lenses that run in parallel**, so a large diff is
covered faster and each reviewer stays sharply scoped to one concern. Each lens lives in
its own file under `reviewers/`. You (the orchestrator) dispatch the reviewers, then
merge and report their findings.

## How to review (orchestration)

1. **Get the diff.** Review only what changed — never untouched code. Pick the mode:
   - **Committed range** (default): `git diff main...HEAD` against the base branch
     (`main` or `release/*`). Update the base first (`git fetch` and confirm the local
     base is current) — a stale base inflates the diff with already-merged, unrelated
     changes and wastes a full fan-out. Each reviewer re-runs this scoped to its own
     globs; since the range is pinned to fixed commits they all see identical bytes, so
     there's no need to snapshot.
   - **Working tree / uncommitted changes** (when asked to review unstaged or staged
     work): the tree can shift mid-review, so re-running `git diff` per reviewer risks
     each seeing a different snapshot. Instead, capture the diff **once** to a scratch
     file and hand every reviewer that path. `git diff HEAD` covers staged + unstaged
     tracked changes; run `git add -N .` first (reversible with `git reset`) so any new
     untracked files also show up:
     ```bash
     git add -N . && git diff HEAD > "$SCRATCH/review.diff"
     ```
     `$SCRATCH` is your environment's scratchpad dir. Reviewers read this frozen diff for
     their globs plus the on-disk files for surrounding context — the working-tree files
     already hold the uncommitted state.
2. **Enumerate changed files** — `git diff --name-only main...HEAD` (committed range) or
   `git diff --name-only HEAD` (working tree). Use this to skip any lens whose file scope
   isn't touched (e.g. no `packages/bruno-app/**` change → skip `react.md`; no `tests/**`
   change → skip `e2e-tests.md`). Never skip the lenses scoped to all files.
3. **Fan out the reviewers in parallel.** In a *single message*, launch one `Agent`
   (subagent_type `Explore` or `general-purpose`) per in-scope reviewer below. Give each
   subagent this exact briefing:
   - The diff source — the committed range (e.g. `main...HEAD`) or the snapshot file path
     (`$SCRATCH/review.diff`) — and the file globs it owns (from the reviewer file's
     "Scope" line). For a snapshot, tell the reviewer to read that file for its globs
     rather than re-run `git diff`.
   - "Read `.claude/skills/code-review/reviewers/_contract.md` for the shared persona and
     output contract, then read `.claude/skills/code-review/reviewers/<file>` — and any rule
     or source file it points to (e.g. `CODING_STANDARDS.md`, `.claude/rules/*.md`), which
     hold the detailed checklist. Apply **only** that lens to the changed files in your
     scope, at the severities the reviewer specifies. Do not review outside your scope."
   Reviewers are read-only and independent — they don't coordinate, and overlap between
   lenses is fine (you dedupe at merge time).
4. **Merge and report.** Collect every reviewer's findings, drop exact duplicates, and
   when two lenses flag the same `file:line` keep the higher severity. Regroup **by
   file**, each finding tagged by severity (blocker / suggestion / nit) with `file:line`.
   If the review request carries a problem statement or acceptance criteria (e.g. passed
   as args), reconcile its enumerated deliverables — docs, migration notes, a test per new
   default/branch — against the diff and flag any that are absent. If nothing's wrong, say
   so briefly — don't manufacture nits.

## Reviewers

Each file is a self-contained checklist for one lens:

| Reviewer file | Lens | Scope |
|---|---|---|
| `reviewers/correctness.md` | Correctness & root-cause | all source (excl. `tests/**`) |
| `reviewers/architecture.md` | Architecture & dependency boundaries | `packages/**` |
| `reviewers/conventions.md` | Coding standards & readability | all files |
| `reviewers/react.md` | React — app files | `packages/bruno-app/**` |
| `reviewers/cross-platform.md` | Cross-platform (macOS/Windows/Linux) | all files |
| `reviewers/security.md` | Security & data safety | all source (excl. `tests/**`) |
| `reviewers/dsl-changes.md` | On-disk DSL & serialization (backward compat) | `bruno-app`, `bruno-electron`, `bruno-cli`, `bruno-lang`, `bruno-filestore`, `bruno-schema(-types)`, `bruno-converters` |
| `reviewers/e2e-tests.md` | Playwright E2E tests | `tests/**` |

## Shared reviewer persona & output contract

Defined once in `reviewers/_contract.md` — the small file every reviewer reads (dispatched
reviewers read it, not this orchestration file). Keep the persona and the
`<blocker|suggestion|nit> | <file>:<line> | <finding>` output shape there, not duplicated here,
so a change updates a single place.
