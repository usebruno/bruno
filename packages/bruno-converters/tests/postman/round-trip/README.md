# Round-trip conversion tests

This directory tests conversion **fidelity** by sending a real collection through both converters and
comparing the result against the input:

```
Postman export ──postmanToBruno──▶ Bruno collection ──brunoToPostman──▶ Postman export
     (input)                                                              (output)
        └──────────────────── compared, subtree by subtree ──────────────────┘
```

Currently only the **auth** subtree is covered ([`auth.spec.js`](./auth.spec.js)), but the harness is
built so other subtrees (body, headers, scripts, params, …) can be added as sibling files with no new
plumbing. See [Extending](#extending) below.

---

## Why round-trip, and why this direction

The per-converter unit specs (`process-auth`, `request-auth`, `bruno-to-postman`, …) each exercise
**one** converter in isolation and assert a hand-written expected object. That has two blind spots:

1. **Asymmetry between the two converters** — a field renamed on import (`tokenName` → `credentialsId`)
   but not renamed back on export is invisible to a one-sided test. A round-trip is the only thing that
   exercises both mappings against each other.
2. **Circular expectations** — a hand-written "expected" object is only as correct as the author's
   reading of the converter. If you misread it, the test encodes the misreading.

We focus on **Postman → Bruno → Postman** (not Bruno → Postman → Bruno) because that is the direction
where a **real exported `.postman_collection.json`** is the input. Real exports carry the exact key
names, the full v2.1 array-backed auth format, and even fields Bruno doesn't model — ground truth that
a hand-built object can't reproduce.

---

## Why the fixture approach

Tests are **data-driven off the files in [`fixtures/`](./fixtures)**. Every `*.postman_collection.json`
is discovered automatically and run through the round-trip. This is deliberate:

- **No hand-written expected values.** The input fixture's own auth is the source of truth — the test
  asserts the output equals the input (minus documented exceptions), so adding coverage is "drop a
  file", not "write an expectation".
- **Real-world shape.** Fixtures are actual Postman exports, so they include the quirks (omitted
  defaults, extra keys, ordering) that synthetic objects miss.

### Extending

- **More auth coverage:** export a collection of the desired auth type from Postman, drop it into
  `fixtures/`. It's picked up automatically. A new whitelist entry is only needed if it exercises a
  field Bruno doesn't model yet (see below).
- **Another subtree** (e.g. body): add `body.spec.js` alongside `auth.spec.js`, reusing the same
  fixtures. Factor the shared "walk + diff by node path" logic the way [`compare-auth.js`](./compare-auth.js)
  does for auth, keeping each subtree's normalization rules in its own module.

---

## The whitelist and its categories

Comparison is **strict**: any difference in the auth subtree fails the test. Differences that are
expected today are recorded in `AUTH_ROUNDTRIP_WHITELIST` in [`auth.spec.js`](./auth.spec.js), each
tagged with a `category`. The category is the whole point — it separates "bug we haven't fixed" from
"working as intended":

| Category | Meaning | Trend | Action |
| --- | --- | --- | --- |
| **`feature-gap`** | Bruno has no field to hold this Postman value, so it's dropped on import. | **Should shrink** as Bruno adds support. | **This is the list to focus on.** Each entry is a concrete, user-visible data loss. |
| **`normalization`** | Intentional, semantically-lossless transformation. | **Permanent** — will never reach zero. | Leave alone. Documents *why* the round-trip isn't byte-identical. |

**Where to focus: the `feature-gap` count.** It's the number of Postman auth capabilities Bruno can't
represent. Driving it down is real product work; when a gap is filled, delete its whitelist entry and
the test stays green. The `normalization` entries are not a backlog — they're the documented contract
of what round-tripping intentionally changes.

### The two flavors of `normalization`

- **Grant-scoped pruning** (oauth2): Bruno stores grant-type-specific fields, so a field unused by the
  grant (`authUrl` on a `client_credentials` grant, `username` on anything but `password`) is dropped.
  These entries carry a `grantType` list and are accepted **only** for grants that don't use the field —
  so the *same* drop on a grant that *does* use it (e.g. `authUrl` on `authorization_code`) still fails.
  That keeps the exception tight instead of blanket-allowing the field to vanish.
- **Default materialization**: Postman omits a field and relies on a default; Bruno stores it
  explicitly and re-emits it (apikey `in: header`, oauth1 `version`). Whitelisted only where **Bruno's
  default equals Postman's default**, so materializing it changes nothing semantically.

### Whitelist entry matching

Each entry matches a diff on `(fixture, node, authType, key, kind)`:

- `fixture` and `node` accept `'*'` — a field-level gap that recurs across many requests/fixtures is
  **one wildcard entry**, not dozens of near-duplicates.
- `grantType` (oauth2, optional) restricts an entry to specific grant types (grant-scoped pruning).
- Matching is **value-agnostic** (`kind` + `key`, never the value) so a whitelisted field tolerates any
  value — we're asserting "this field is *expected* to differ", not pinning a specific value.

---

## Comparison mechanics (`compare-auth.js`)

### `stableStringify`

Auth values are compared by a **canonical stringification** — object keys sorted, array order
preserved — rather than by `JSON.stringify` or reference equality. Two reasons:

1. **Key order is not semantic.** Postman and Bruno emit auth params in different orders; a plain
   string compare would flag every reorder as a diff. Sorting keys makes the compare structural.
2. **Nested values must compare by content.** The oauth2 `additionalParameters` arrays
   (`authRequestParams` / `tokenRequestParams` / `refreshRequestParams`) are arrays of objects. We need
   deep, order-insensitive-on-keys but order-*sensitive*-on-arrays comparison, which `stableStringify`
   gives: object keys are sorted (order-insensitive), array element order is preserved (array order *is*
   semantic for these params).

### `normalizeAuth` — array-backed → map

Postman's v2.1 auth is an array of `{key, value, type}`. We collapse it to a plain `{key: value}` map so
that (a) param ordering doesn't matter and (b) the `type` tag is ignored because it is not semantically meaningful. 
Missing auth normalizes to `null` so "no auth" compares equal on both sides.

### `absent === ""` collapse

An absent key and an empty-string value are treated as **equal**. Postman treats a missing auth param as
unset, and `brunoToPostman` drops empty params on export — so `state: ""` disappearing on round-trip is a
lossless no-op, not a diff. Collapsing this structurally (rather than whitelisting each empty field)
keeps the whitelist focused on real differences and avoids churn when a fixture's empty fields change.
Confirmed safe: Postman's importer defaults any missing auth param, so omitting empties never errors.

### `grantType` on oauth2 diffs

Each oauth2 diff is tagged with the node's grant type (from the original, falling back to the
round-tripped side). This is what lets grant-scoped-pruning whitelist entries be conditional — the diff
carries enough context to say "dropped `authUrl`, and this was a `client_credentials` grant, so it's
fine."

### Node-path walk

`collectAuthNodes` walks the whole collection — collection-level auth, folder-level auth, and
request-level auth — keying each by a stable path (`collection`, `collection/Folder`,
`collection/Folder/Request`). Comparison is per-node by path, so a request that gains or loses auth, or
inherits differently, is caught rather than averaged away.

---

## Running

```bash
# from packages/bruno-converters
npx jest tests/postman/round-trip/auth.spec.js
```

On failure, each un-whitelisted diff prints a readable line — `DROPPED` (Bruno lost a field),
`ADDED` (Bruno emitted a field Postman didn't), or `CHANGED` (value differs) — so you can tell at a
glance whether it's a new feature gap to whitelist or a real regression to fix.
