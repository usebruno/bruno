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
| `yields` | how the two sides' values relate — **one** bidirectional fact, not two mirrored ones |
| `unsupported` | on a row naming **one** side: why that member has no counterpart |

`yields` carries exactly one of:

| Yield | Means |
|---|---|
| `{ type: '<pair>' }` | both sides yield that pair, so its own members translate in turn |
| `{ type: '<pair>', pmProjects: '<member>' }`<br>or `bruProjects` | that side yields only this member of what the other side yields whole |
| `{ differs: '<reason>' }` | the shapes are incomparable; the call is still renamed and the occurrence reported |

**It is one field, not a `pmToBru`/`bruToPm` pair, and that is the point.** A member's two values
relate in exactly one way; `derive.js` works out what each direction must do about it. Writing the
fact twice is how the names used to drift, one level down from where the table fixed it.

A **projection** is the asymmetric case, and the one that earns the single-field shape. Declaring
`{ type: 'Cookie', pmProjects: 'value' }` on `get`/`getCookie` derives both directions at once:
translating towards the whole value appends the member, and translating away from it cannot rebuild
what was never there, so that reason is *generated* rather than written by hand.

**A projection always names the pair it projects from**, and the member is spelled as the
*projecting* side spells it. `derive.js` resolves it to the other side's spelling when it appends,
and rejects a member the pair does not declare — so the appended name is checked at import instead
of reaching the output verbatim. It is the same rule every other type reference follows: point at a
declared pair, never at a bare string.

Three shapes a value difference can take, worth telling apart before reaching for a key:

- **projection** — typed value → one of its members. `type` plus `pmProjects` / `bruProjects`.
- **construction** — untyped value → a typed one (wrapping an array into a list). Not expressible
  yet; it would need a builder alongside `type`, and nothing needs it.
- **incomparable** — neither bridges the other. `differs`.

Nothing is written into the translated script. `reportUntranslated` in `ast-utils.js` is the only
consumer of a `differs` reason and an `unsupported` reason — they reach the console and nowhere else.

### Every type reference is `{ type: '<pair>' }`

Not only member yields — a producer and a handler parameter name their type the same way, so the
shape means one thing everywhere in the file:

```js
const ENTRY_POINTS = [
  {
    pm: 'pm.sendRequest',
    bru: 'bru.sendRequest',
    yields: { type: 'Response' },
    handlers: { callback: [null, { type: 'Response' }] }
  }
];
```

A `null` handler slot is a position that receives nothing — the `err` of `(err, res)`.

**`handlers` declares only the callback forms.** A promise handler is not declared: `.then`
receives whatever the call yields, which `yields` already says, and that is promise semantics
rather than a fact about either API. Declaring it would be the same type written twice.

A producer and a parameter can only say `{ type }`, though. Neither has a second side to differ
from, so `differs` and the projection keys are rejected there; a value worth no type is one to
leave the slot empty for. `derive.js` names the slot that broke:

```
correspondence: entry point pm.x callback[1] yields type 'Nope', which is not a declared type pair
correspondence: entry point pm.x then[0] yields differs; expected a type
```

**Nesting is supported but unexercised.** `{ type }` is live on the producers and on `get`'s
projection, but no member yields a pair whose members then translate in turn — so the chain
`collectBindings` can follow has never been walked by a real row.
`tests/utils/semantic-registries.spec.js` pins it directly, which is the only thing keeping it
honest until one exists.

`derive.js` throws on a row outside that vocabulary. A malformed row is a mistake in the table
rather than a condition to translate around, so it fails at import instead of quietly dropping
the member.

## Adding a row

1. Add the row to the right type pair in `correspondence.js`
2. If a new call brings a typed value into a script, add an `ENTRY_POINTS` entry with
   `yields: { type: '<pair>' }` — **and** a `simpleTranslations` row, because the table types the
   result while the flat map renames the call. One without the other leaves correctly-renamed
   members hanging off a call that still says `pm`
3. If the member's result has a different shape on the two sides, say so with one `yields`
4. **A case in `tests/postman/round-trip/scripts.spec.js`**

There is no mirror entry to remember and no `ONE_WAY_MEMBERS` list: a member that translates only
one way says `direction` on its own row. `tests/utils/semantic-registries.spec.js` checks that the
derivation still inverts, that the vocabulary stays within what the engine implements, and that a
malformed row is rejected.

## Two binding producers, three rewrite strategies

A typed value reaches a script by one of two routes, and each has a producer emitting the same
`{ name, scopeNode, typeName }` record for the rewriters to consume:

| Producer | Types values reaching | Lives in |
|---|---|---|
| `collectBindings` | variable declarations — `const r = await pm.sendRequest(q)` | `type-environment.js` |
| `collectAllChainBindings` | handler parameters of a promise chain — `.then(r => ...)` | `promise-chain.js` |
| `collectCallbackBindings` | parameters of a declared callback — `(err, res) => ...` | `promise-chain.js` |

A chain's **head** is whatever it hangs off, which is not always the call: `const p = pm.sendRequest(q); p.then(...)` hangs off a name. Both producers type an *expression*, so neither cares which. A call bound to a name used as a promise is also left un-awaited — `const p = await bru.sendRequest(q)` would leave the chain nothing to attach to.

`promise-chain.js` holds **no fact about either API** — `.then` forwards iff its handler returns
its parameter, `.catch` may replace, `.finally` always forwards. That is why one implementation
serves both directions, and why it is driven by the *type of the chain's head* rather than by a
known call: nothing in it names `sendRequest`, so any producer or member that comes to yield a
type is chainable without a change here.

A callback's slots **are** declared, in `handlers`, because nothing about a call's yielded type
says that `(err, res)` carries it second and an error first. Its *position* is not: the callback is
the call's trailing function argument, a convention that holds across the surface (`sendRequest`
arg 1, `jar.get` arg 2, `jar.set` arg 3).

All three producers run inside `applySemanticTypes`, so **no transformer types anything**. The
transformers shape output only — reshaping the request config, marking a callback `async`, placing
the `await`.

- **`rewrite-yields.js`** adapts what a member *produces*, where the value is produced rather than
  at every later read, so no reference needs visiting:
  `await jar.get(u, n)` → `(await jar.get(u, n)).value`, the member coming from the row's
  projection. It acts only where the result is observed;
  a discarded result needs no adaptation. Two shapes leave nowhere to hang an expression and are
  reported instead: a callback, where the value arrives as a parameter, and a plain property, which
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
  output, and only the console warning tells them apart. The known collisions are pinned in
  `tests/utils/semantic-registries.spec.js`; a new one has to be looked at, because the warning is
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
- **A projection cannot be placed on a promise.** `rewrite-yields.js` appends the projected member
  to the *resolved* value, so an un-awaited call entering a chain is reported rather than rewritten:
  `jar.get(u, n).value.then(...)` would read `.value` off a Promise. The member is still renamed.

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
- [ ] A shape difference declared as one `yields`, never as two mirrored halves
- [ ] Every type named as `{ type: '<pair>' }` — in a member yield, a producer, or a handler slot
- [ ] A projection names the pair it projects from, so the member is checked rather than copied
- [ ] Round-trip case added when a type pair changed, and
      `tests/utils/semantic-registries.spec.js` still green
- [ ] Any new guard fails by leaving the source text alone, never by guessing
- [ ] Scope resolution compares scope **nodes**, never bare names
- [ ] `npm test --workspace=packages/bruno-converters` green — the existing suites are the
      safety net for every change in this area
