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
mapping added to the flat map when it belonged in the correspondence table will pass its own test
and still not fire on real scripts.

## Where a mapping goes

| Destination | For |
|---|---|
| `simpleTranslations` (both translators) | anything reachable by a **fixed dotted path** — `pm.environment.get` → `bru.getEnvVar` |
| `complexTransformations` (both translators) | anything needing **argument reshaping, several statements, or a condition** |
| `src/utils/semantic/correspondence.js` | **members of a value held in a variable or parameter**, where the receiver's name is arbitrary |
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
belong to the correspondence table, which types the binding instead of erasing it.

## One table, two registries

`correspondence.js` is the only place either direction's facts are written. `derive.js` builds
`POSTMAN_REGISTRY` and `BRUNO_REGISTRY` from it, so the two directions **cannot disagree about
which members pair up** — the inverse property holds by construction, not by a spec keeping two
hand-written files matched. An addition is one row, not two.

A row pairs the two names and says how else the sides differ:

| Key | Meaning |
|---|---|
| `pm` / `bru` | the member name on each side |
| `pmKind` / `bruKind` | `'method'` or `'property'` — given together, and only when they differ |
| `direction` | `'pm->bru'` or `'bru->pm'` when the row applies one way only |
| `pmToBru` / `bruToPm` | what becomes of the value the member yields, in that direction |
| `unsupported` | on a row naming **one** side: why that member has no counterpart |

`pmToBru` / `bruToPm` carry exactly one of `{ coerce: '<name>' }` — an expression from
`coercions.js` recovers the shape the source expects — or `{ lost: '<reason>' }`, when nothing
bridges the two shapes and the statement is flagged instead.

`derive.js` throws on a row outside that vocabulary. A malformed row is a mistake in the table
rather than a condition to translate around, so it fails at import instead of quietly dropping
the member.

## Adding a row

1. Add the row to the right type pair in `correspondence.js`
2. If a new call brings a typed value into a script, add an `ENTRY_POINTS` entry
3. If the member's result has a different shape on the two sides, say so with `coerce` or `lost`
4. **A case in `tests/postman/round-trip/scripts.spec.js`**

There is no mirror entry to remember and no `ONE_WAY_MEMBERS` list: a member that translates only
one way says `direction` on its own row. `tests/utils/semantic-registries.spec.js` checks that the
derivation still inverts, that the vocabulary stays within what the engine implements, and that a
malformed row is rejected.

## Three rewrite strategies

`applySemanticTypes` drives all three over the bindings `type-environment.js` collects.
`rewriteMembers` and `rewritePattern` are **also called directly** by
`send-request-transformer.js` and `bruno-send-request-transformer.js`, which type a handler's
parameter without going through binding collection — a change to either has two sets of callers.

- **`rewrite-yields.js`** adapts what a member *produces*, where the value is produced rather than
  at every later read, so no reference needs visiting:
  `await jar.get(u, n)` → `(await jar.get(u, n)).value`. It acts only where the result is observed;
  a discarded result needs no adaptation. Two shapes leave nowhere to hang an expression and are
  flagged instead: a callback, where the value arrives as a parameter, and a plain property, which
  has no call at all.
- **`rewrite-members.js`** rewrites `r.code` → `r.status`. It must resolve every reference through
  `path.scope.lookup`, comparing the declaring scope **node** against the binding's — a bare name
  is not enough, or a shadowed parameter gets rewritten along with the real one. It also preserves
  `?.`: the parser spells an optional access as a MemberExpression carrying `optional`, so the flag
  is copied rather than the builder swapped.
- **`rewrite-patterns.js`** rewrites `{ code }` → `{ status: code }`. The rename stays inside the
  pattern and aliases back to the local name, so no reference is visited and no scope tracking is
  needed.

Matching nodes are **collected before any replacement is applied**. Maps rename one member onto
another member's name (`code → status` beside `status → statusText`), so a pass that replaced as
it walked would re-match its own output.

## Traps

- **Many-to-one mappings make the inverse ambiguous.** `json` and `text` both map to `data`, so the
  reverse direction has to *choose* which one `data` goes back to. The losing member carries
  `direction: 'pm->bru'`.
- **An unsupported member can collide with a rename target.** Bruno's `deleteCookies` becomes
  Postman's `clear`, while Bruno's own `clear` has no counterpart — both read as `clear` in the
  output, and only the warning comment tells them apart. The known collisions are pinned in
  `tests/utils/semantic-registries.spec.js`; a new one has to be looked at, because the comment is
  load-bearing from then on.
- **A member carrying `call` is skipped by destructuring.** A pattern has no call site in reach, so
  `rewrite-patterns.js` leaves those properties alone — `const { json } = res` stays untranslated.
  Non-obvious, and it lives in a different file from the table.
- **Never map to a member the target does not have.** Leaving it untranslated is the better
  failure: it stays visible in the output. A wrong mapping reads as working.
- **Entries are global to the type.** There is no per-call-site control.
- **Member inventories are not yet exhaustive.** `BrunoCookieJar` is complete against the jar
  handle in `@usebruno/requests`; `PostmanResponse` is not. A member absent from a type is one
  nobody has classified, and it passes through silently — which is what `unsupported` exists to
  stop, one member at a time.
- **`params.then` is derived for both directions but read by only one.**
  `send-request-transformer.js` walks promise chains; its Bruno twin handles the callback form
  alone, so `bru.sendRequest(q).then(res => res.status)` is still untranslated going back.

## When the value is uncertain, emit nothing

A missed translation leaves the original text in the output, where it is visible and greppable; a
wrong one silently changes what the script does. New guards must resolve the same way.

`type-environment.js` drops a binding — rather than guessing — when the name is declared twice in
one scope (the AST library models function scope, not block scope, so a `const` inside an `if` is
indistinguishable from one beside it), when the binding is ever reassigned, or when the initialiser
is not a known producer. Members reached through a key that is not statically known are skipped
separately, by `rewrite-members.js` and `rewrite-patterns.js`. Interprocedural flow is not
supported at all.

## Checklist

- [ ] Mapping is in the destination the fixed-dotted-path question points to
- [ ] One row in `correspondence.js`, not an edit to each direction
- [ ] A shape difference in what a member yields declared with `coerce` or `lost`, never left silent
- [ ] Round-trip case added when a type pair changed, and
      `tests/utils/semantic-registries.spec.js` still green
- [ ] Any new guard fails by leaving the source text alone, never by guessing
- [ ] Scope resolution compares scope **nodes**, never bare names
- [ ] `npm test --workspace=packages/bruno-converters` green — the existing suites are the
      safety net for every change in this area
