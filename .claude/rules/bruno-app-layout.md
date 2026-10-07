---
paths:
  - "packages/bruno-app/**/*"
---

# Module & Directory Layout (bruno-app)

Layout is predictable enough here to be load-bearing, so a misplaced file is an architectural defect,
not a style nit — a breach blocks, the same as a dependency-direction violation in
`.claude/rules/architecture.md`.

- **A component owns a directory: `<ComponentName>/index.js(x)`, never `<ComponentName>.js`** — at
  every nesting depth, including a sub-component of a component. Same shape for hooks
  (`src/hooks/useX/index.js`) and `src/ui/` primitives.
- **Everything a component owns lives in its directory** beside its `index.js` — `StyledWrapper.js`,
  spec, component-specific utils. Reaching up into a parent's `StyledWrapper.js`, or leaving a
  component's styles outside its directory, hands ownership of them to no one.
- **`src/ui/` is a leaf**: app-agnostic presentational primitives only, and it must not import from
  `src/components/` — the edge runs `components → ui`, never back. A `ui/` module needing one either
  isn't a primitive, or its dependency belongs in `ui/` too.
- **`utils/` is for stateless helpers you call.** A module *registered* into something — an editor
  extension, a plugin, a node view, a keymap — is behavior or configuration, and filing it under
  `utils/` hides that it's part of a schema or document contract. Give those their own directory.

Existing breaches — bare `PascalCase.js(x)` component files, and `ui/MenuDropdown`'s import of
`components/Dropdown` — are drift, not a second pattern. Don't extend them, and don't raise an
untouched one as a finding.
