---
paths:
  - "packages/bruno-converters/src/utils/**"
  - "packages/bruno-converters/src/postman/postman-translations.js"
  - "packages/bruno-converters/tests/postman/postman-translations/**"
  - "packages/bruno-converters/tests/postman/round-trip/**"
  - "packages/bruno-converters/tests/bruno/bruno-to-postman-translations/**"
  - "packages/bruno-converters/tests/utils/semantic-registries.spec.js"
---

# Script Translation (Postman ↔ Bruno)

Pre-request and test scripts are rewritten with jscodeshift as collections are imported and
exported: `postman-to-bruno-translator.js` one way, `bruno-to-postman-translator.js` the other.
Both are **parity twins** — see `.claude/rules/feature-parity.md`.

There are four places a mapping can live, and picking the wrong one is the common mistake. A
mapping added to the flat map when it belonged in the registry will pass its own test and still
not fire on real scripts.

## Where a mapping goes

| Destination | For |
|---|---|
| `simpleTranslations` (both translators) | anything reachable by a **fixed dotted path** — `pm.environment.get` → `bru.getEnvVar` |
| `complexTransformations` (both translators) | anything needing **argument reshaping, several statements, or a condition** |
| `src/utils/semantic/*-registry.js` | **members of a value held in a variable or parameter**, where the receiver's name is arbitrary |
| `src/postman/postman-translations.js` regex map | **nothing new.** It is the fallback for scripts that fail to parse |

**The question that decides it: can you write a fixed dotted path that uniquely identifies this
translation?**

`pm.response.code` is always spelled that way — flat map. But a response that reached a variable
first is not:

```js
const r = await pm.sendRequest(q);
r.code        // no fixed path exists — `r` could be named anything
```

The flat map cannot match that, and the alias-inlining in `preprocessAliases` cannot help either:
it resolves aliases by substituting the aliased expression at every use site, which is only valid
for a side-effect-free global like `pm.response`. A call cannot be duplicated. Those members
belong to the registry, which types the binding instead of erasing it.

## Adding a registry entry

The registry vocabulary is deliberately two words — `to` (rename) and `call` (`'drop'` / `'add'`,
when a member is a method on one side and a plain property on the other). **Needing anything else
means it is not a registry entry**; that narrowness is what makes an entry safe to add without
reading the engine.

An addition is not finished until all five are done:

1. `producers` — if a new call yields a typed value
2. `types` — the member map
3. `params` — if a callback or handler receives the value
4. **the mirror entry in the other registry**
5. **a case in `tests/postman/round-trip/scripts.spec.js`**

Item 4 carries the weight, and nothing in the engine links the two registries — they are two
hand-written files describing one set of facts in opposite polarity. Two specs stand in for that
missing link, and both must stay green:

- `tests/utils/semantic-registries.spec.js` checks the registries against each other directly —
  that every type is paired, every `to` resolves back to the member it came from, and every `call`
  inverts (`drop` ↔ `add`). A one-sided or mis-polarised edit fails here, naming the member.
- `tests/postman/round-trip/scripts.spec.js` asserts a script survives Postman → Bruno → Postman
  byte-identical, which is what proves the engine agrees with the data.

A member that deliberately **does not** round trip — because it collapses onto one the other API
already has — belongs in `ONE_WAY_MEMBERS` in the invariant spec, with its reason. That list is
checked both ways: an undeclared collapse fails, and so does a stale exemption for a member that
has since gained a true inverse.

## Traps

- **Many-to-one mappings make the inverse ambiguous.** `json` and `text` both map to `data`, so
  the reverse direction has to *choose* which one `data` goes back to. Adding another collapsing
  pair means making that choice and declaring the losing member in `ONE_WAY_MEMBERS`.
- **A member carrying `call` is skipped by destructuring.** A pattern has no call site in reach,
  so `rewrite-patterns.js` leaves those properties alone — `const { json } = res` stays
  untranslated. Non-obvious, and it lives in a different file from the registry.
- **Never map to a member the target does not have.** Leaving it untranslated is the better
  failure: it stays visible in the output. A wrong mapping reads as working.
- **Entries are global to the type.** There is no per-call-site control.

## The two rewrite strategies

Both are driven from `applySemanticTypes` and read the same registry, but they differ in what
they have to track:

- **`rewrite-members.js`** rewrites `r.code` → `r.status`. It must resolve every reference
  through `path.scope.lookup`, comparing the declaring scope **node** against the binding's — a
  bare name is not enough, or a shadowed parameter gets rewritten with the real one.
- **`rewrite-patterns.js`** rewrites `{ code }` → `{ status: code }`. The rename stays inside the
  pattern and aliases back to the local name, so no reference is visited and no scope tracking is
  needed.

Matching nodes are **collected before any replacement is applied**. Maps rename one member onto
another member's name (`code → status` beside `status → statusText`), so a pass that replaced as
it walked would re-match its own output.

## When the value is uncertain, emit nothing

Every guard in `type-environment.js` resolves the same way, and new ones must too. A missed
translation leaves the original text in the output, where it is visible and greppable; a wrong one
silently changes what the script does.

Bindings are dropped — not guessed at — when the name is declared twice in one scope (the AST
library models function scope, not block scope, so a `const` inside an `if` is indistinguishable
from one beside it), when the binding is ever reassigned, when the initialiser is not a known
producer, or when a key is not statically known. Interprocedural flow is not supported at all.

## Checklist

- [ ] Mapping is in the destination the fixed-dotted-path question points to
- [ ] Mirror entry added to the other direction's registry or map, or its absence stated
- [ ] Round-trip case added when a registry type changed, and
      `tests/utils/semantic-registries.spec.js` still green
- [ ] Any new guard fails by leaving the source text alone, never by guessing
- [ ] Scope resolution compares scope **nodes**, never bare names
- [ ] `npm test --workspace=packages/bruno-converters` green — the existing suites are the
      safety net for every change in this area
