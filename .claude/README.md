# Claude Config

The [Claude Code](https://docs.claude.com/en/docs/claude-code) configuration for
[Bruno](https://github.com/usebruno/bruno) — the project context, architecture notes, coding
rules, and review/test skills the team has tuned while working on Bruno. Claude picks it up
automatically when you launch from the project root.

<!-- This README is a human maintainer guide. It is NOT a memory file and is never imported into
     Claude's always-loaded context — keep contributor/ownership guidance here, not in CLAUDE.md. -->

## What's inside

| Path | What it is | Loads |
|------|------------|-------|
| `CLAUDE.md` | Project overview — commands, key architecture, coding standards, index of rules/references. | Every session (auto). |
| `rules/*.md` | Path-scoped engineering guidance: `architecture` (`@usebruno/*` dependency boundaries), `redux-store`, `electron-ipc`, `dsl-changes` (on-disk `.bru`/`.yml` format), `cross-platform`, `testing`, `conventions` (readability + comment/diff hygiene). | When Claude touches files matching each rule's `paths:`. |
| `reference/architecture.md` | The monorepo map — request pipeline, sandbox, file formats, core types, dependency versions. Too big to auto-load. | On demand only (Claude reads it when a task needs it). |
| `skills/code-review/` | `/code-review` — reviews the current branch/PR via focused lenses in parallel; takes base pointers from `.coderabbit.yaml`. | On invocation / when relevant. |
| `skills/write-e2e-test/` | `/write-e2e-test` — writes a Playwright E2E test following Bruno's fixtures and conventions. | On invocation / when relevant. |
| `settings.json` | Shared project settings, checked in for the team. Denies `Read` on `**/dist/**` so Claude works from `src/`, not generated bundles. | At startup, from the launch directory. |
| `settings.local.json` | Your machine-specific overrides. Gitignored — never committed. | At startup, if present. |

## Requirements

- [Claude Code](https://docs.claude.com/en/docs/claude-code) installed (`npm i -g @anthropic-ai/claude-code`).
- A local checkout of Bruno (or a Bruno fork).

## Install

Start Claude Code (`claude`) from the Bruno root and everything loads on its own:

- **`.claude/CLAUDE.md`** loads every session — it is a first-class project-instruction location,
  so **no root `CLAUDE.md` and no `@` import are needed**; keeping all shared guidance under
  `.claude/` leaves the Claude config self-contained in one folder.
- **Path-scoped rules** attach automatically when Claude reads a matching file (e.g. `dsl-changes`
  kicks in on `bruno-filestore`). Launching from a package subdirectory still loads this root
  `.claude/` (rules + `CLAUDE.md`) from the ancestor directory.
- **`reference/architecture.md`** is *not* auto-loaded; Claude reads it on demand.
- **Skills** are discovered from `.claude/skills/` — type `/code-review` or `/write-e2e-test`.

## Everyday use

```bash
/code-review            # review the current branch against main before pushing
/write-e2e-test         # scaffold a Playwright spec under tests/
```

Otherwise just work normally — Claude consults the rules on demand. Machine-specific overrides go
in `.claude/settings.local.json` (already gitignored), not in `settings.json`.

---

## Maintaining this config

This section is for whoever edits the config. The goal is **high instruction adherence at the
lowest always-loaded cost**: put each instruction in the mechanism that loads it exactly when it's
needed, and no sooner.

It operationalizes the Claude Code docs — read them before making structural changes:
[Write an effective CLAUDE.md](https://code.claude.com/docs/en/best-practices#write-an-effective-claude-md)
(the *"would removing this cause a mistake?"* test below is from it),
[Memory](https://code.claude.com/docs/en/memory) (CLAUDE.md loading + `.claude/rules/`),
[Large codebases](https://code.claude.com/docs/en/large-codebases) (monorepo scoping), and
[Skills](https://code.claude.com/docs/en/skills).

### Where does a new instruction go?

| Mechanism | Lives in | Loads | Use it for |
|---|---|---|---|
| Project instructions | `.claude/CLAUDE.md` | Every session (full file) | Facts true in nearly every session and not inferable from code: orientation, non-obvious setup, global invariants, pointers to everything else. |
| Path-scoped rule | `.claude/rules/<topic>.md` with `paths:` | When Claude reads a file matching `paths:` | A coding constraint or convention specific to one area (a package, `tests/`, DSL files). One topic per file. |
| On-demand reference | `.claude/reference/<topic>.md` | Only when Claude `Read`s it | Long maps / reference material too big to auto-load. Point to it from CLAUDE.md or a rule. |
| Skill | `.claude/skills/<name>/SKILL.md` (+ support files) | On `/invoke` or when the model judges the description relevant | A reusable multi-step *procedure* or workflow (review, scaffold a test). Not a fact. |
| Settings / hooks | `.claude/settings.json` | Startup (from launch dir) / deterministic lifecycle events | Shared permissions/env; deterministic enforcement that must happen every time regardless of the model. Advisory guidance is **not** a hook. |

**Why no nested per-package `CLAUDE.md`?** Central path-scoped rules keep all conventions in one
maintained place under `.claude/` and attach exactly where they're needed (see the Claude Code
"large codebases" guide) — simpler than scattering `CLAUDE.md` files across package directories.

### Budgets

- `CLAUDE.md`: target **≤ 120 lines**, hard cap 200. For every line ask *"would removing this cause
  Claude to make a recurring project-specific mistake?"* If not, cut or relocate it.
- Rules: one coherent topic each; keep concise. If a rule grows a long reference tail (maps, tables,
  worked examples), move that tail to `reference/` and leave the invariants in the rule.
- Skills: keep `SKILL.md` focused (aim < 150 lines); push long checklists/examples to support files.
  Descriptions **< ~200 chars**, leading with words a triggering request would contain.
- Prefer a small, distinct skill catalog — names + descriptions cost discovery context even though
  bodies load lazily.

### Add / retire a rule or skill

- **Add a rule**: create a flat `rules/<topic>.md` with accurate `paths:` frontmatter (globs against
  real repo paths). Record only non-obvious conventions or constraints static tooling (ESLint, TS)
  doesn't already enforce. Only split a topic into a subfolder once it has several rules.
- **Add a skill**: unique stable directory name; description states *what* + *when*; set
  `disable-model-invocation: true` for side-effectful workflows (publish/commit/release). Verify it
  passes the reuse / project-specific / non-trivial-procedure tests before adding.
- **Retire**: delete the file and remove any pointer to it from `CLAUDE.md` and other rules/skills.

### Keep it consistent

- **Detect duplication/conflicts**: `grep -rn "<claim>" .claude` before writing a fact; if two files
  state the same thing, keep it in one and point to it. Watch for the same fact drifting across
  `CLAUDE.md`, a rule, a skill, and `CODING_STANDARDS.md` / `.coderabbit.yaml`.
- **Verify against real code.** Every rule/example must reflect the actual repo — grep the source,
  don't assume. Rules are the source of truth; reviewer lenses and CLAUDE.md are thin pointers.
- **Don't hardcode volatile catalogs** (slice lists, handler names, dep versions that drift).
  Describe the category and tell Claude where to read the current set.
- Imports (`@path`) improve organization but **do not reduce startup context** — the imported file
  still loads in full. To keep something out of context, use a rule (`paths:`), a `reference/` doc,
  or a skill instead.
- Team-wide requirements belong in these committed files, **not** only in Claude's auto memory
  (`~/.claude/projects/.../memory/`), which is machine-local and unshared.
- **`Read`-deny rules are for build output, not dependencies.** `settings.json` denies
  `Read(./**/dist/**)` so Claude edits `src/`, never the generated bundles the app consumes.
  `node_modules/` is deliberately *not* denied — `.gitignore` already keeps it (and `dist/`) out of
  search, and reading a dependency's source or `@types` is legitimate maintenance. Don't add deny
  rules for gitignored paths just to keep them out of search; that's already handled. Note
  `settings.json` loads only from the launch directory, so this deny applies on a root launch, not
  when starting inside a package.

### Validate a change

- `git diff --check` (whitespace); confirm `settings.json` still parses as JSON.
- Check every rule has `paths:` (an accidental unscoped rule loads in *every* session):
  `grep -L "paths:" .claude/rules/*.md` should print nothing.
- Confirm cross-references resolve (no pointer to a moved/renamed file):
  `grep -rn "\.md" .claude CLAUDE.md`.
- **Loading**: run `/memory` in a session to list what actually loaded; open a file in a package to
  confirm the right rule attaches. Use the `InstructionsLoaded` hook only temporarily if you need to
  debug lazy loading — don't commit a diagnostic hook.
- **Skill triggering**: from the repo root, phrase a request the skill should catch ("review my
  changes", "add an e2e test for X") and confirm it's offered; phrase a near-miss ("explain how
  requests are persisted") and confirm it is *not* auto-invoked.

### When to revisit

Review this config after: Claude repeats the same project-specific mistake, a major repo
restructuring (packages moved/renamed, build tooling changed), or a major Claude Code release that
changes loading/skill behavior. Treat config edits like code — review them in PRs.