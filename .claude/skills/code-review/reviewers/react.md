# React — app files reviewer

**Scope:** `packages/bruno-app/**`.

Adopt the reviewer persona and return findings in the output contract defined in
`_contract.md`.

Review changed components against **`CODING_STANDARDS.md` §React** (read it); for changes that
touch the store, also consult **`.claude/rules/redux-store.md`**. Report violations with
`file:line`, severity:

- **blocker** — an `useEffect` that could be derived state, an event handler, or a custom hook;
  a hardcoded hex/rgb/hsl/named color instead of the styled-components `theme` prop (breaks the other
  12 themes — verify the token path exists on the theme object); namespaced hook import (`React.useX`);
  a component that mixes controlled and uncontrolled state; a hook called after a conditional
  early return.
- **blocker** — anything breaking **`.claude/rules/bruno-app-layout.md`** (read it),
  component-specific vs shared placement included; the drift noted at the end of that file is not a
  finding.
- **blocker** — a new theme token defined in `themes/light|dark/*.js` without the matching property
  added to `themes/schema/oss.js`, or added to the schema but missing from some of the 13 theme files.
  The schema is `additionalProperties: false` and `providers/Theme/index.js` validates against it at
  runtime, so either gap invalidates that whole theme and silently falls the user back to the default
  with an error toast.
- **suggestion** — a missing memo that breaks a dependency array or re-renders a heavy child, or
  a gratuitous memo wrapping a cheap primitive; Tailwind used for colors (layout only);
  a testable element without `data-testid`; a theme-token swap resolving to a different value than
  the literal it replaced, or one value left hardcoded while its neighbours were themed (resolve it
  in `themes/` first); a `document`/`window` listener not gated on the state that makes it relevant,
  even where an incidental detail makes it harmless today.
- **suggestion** — a new `EditableTable` column that omits the `readOnly`/`editMode` gating its
  sibling columns carry (`readOnly={column.readOnly}` at render): the field stays editable in
  view / read-only mode even though the change handler discards the edit.
- **suggestion** — optimistic success state (`copied`, `saved`, `done`) set unconditionally
  rather than gated on the operation resolving — e.g. `copied = true` after an optional-chained
  `navigator.clipboard?.writeText` that no-ops in an insecure context — showing a false
  confirmation.
