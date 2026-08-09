# Step by step: how the post-pass repairs a broken sendRequest chain

Third doc in the series:

1. `sendrequest-promise-chain-translation.md` — the big picture: what the translator
   does, what broke, the shape of the fix.
2. `sendrequest-await-node-swap-step-by-step.md` — node-level walkthrough of how the
   *bug* happens (slots, the swap, the printer's parentheses).
3. **This doc** — the same node-level walkthrough for the *fix*: the new module
   `packages/bruno-converters/src/utils/send-request-chain-transformer.js`, function by
   function, on a real example.

It reuses the vocabulary from doc 2: a tree node is a box with named **slots**, a
**path** is a node plus how-you-got-here (so it knows its parent), and "replace a node"
means "change what's in its slot".

---

## Where the post-pass runs

One line was added to `translateCode()` in `postman-to-bruno-translator.js`:

```js
// Process all transformations in a single pass
processTransformations(ast, transformedNodes);

// Repair bru.sendRequest promise chains left mis-awaited by the pass above
transformSendRequestChains(j, ast);      // ← the new post-pass
```

Ordering is the whole point. `processTransformations` walks the tree and must not have
the ground shifted under it, so the transformer inside it can only replace its own
matched node (doc 2, step 4). By the time `transformSendRequestChains` runs, that walk
is **finished** — the tree is settled, and it's now safe to restructure nodes anywhere,
including ancestors.

## The running example

Postman input:

```js
pm.sendRequest(config)
  .then((res) => res.json())
  .catch((err) => console.error(err));
```

After the main pass (the broken intermediate from doc 2 — this is what the post-pass
receives):

```js
(await bru.sendRequest(config))
  .then((res) => res.json())
  .catch((err) => console.error(err));
```

As a tree (labels continue doc 2's convention):

```
ExpressionStatement
└── CallExpression (A2)                       ← .catch(...) — OUTERMOST call
    ├── callee: MemberExpression (B2)         "<...>.catch"
    │   ├── object: CallExpression (A1)       ← .then(...)
    │   │   ├── callee: MemberExpression (B1) "<...>.then"
    │   │   │   ├── object: AwaitExpression (E)     ← the misplaced await
    │   │   │   │   └── argument: CallExpression (F)
    │   │   │   │       ├── callee: Identifier "bru.sendRequest"   ← fingerprint
    │   │   │   │       └── arguments: [ config ]
    │   │   │   └── property: Identifier "then"
    │   │   └── arguments: [ (res) => res.json() ]
    │   └── property: Identifier "catch"
    └── arguments: [ (err) => console.error(err) ]
```

The post-pass must turn this into:

```js
await bru.sendRequest(config)
  .then((res) => res.data)
  .catch((err) => console.error(err));
```

Three edits: remove await (E) from inside the chain, rewrite `res.json()` in the `.then`
handler, wrap the outermost node (A2) in a new await. Here's how each happens.

---

## Step 1 — find the broken shape, and nothing else

```js
ast.find(j.AwaitExpression).forEach((awaitPath) => {
  const call = awaitPath.value.argument;
  if (!call || call.type !== 'CallExpression') return;
  if (call.callee.type !== 'Identifier' || call.callee.name !== 'bru.sendRequest') return;

  // only awaits that sit inside a promise chain are misplaced
  if (!getChainedPromiseMemberPath(awaitPath)) return;
  ...
```

The pass looks at every `await` in the script and keeps only those matching **three**
conditions. On our tree, testing node (E):

1. *Is the awaited thing a call?* — (E).argument is (F), a `CallExpression`. ✅
2. *Is it specifically the transformer's output?* — (F).callee is a **single Identifier
   whose name is the string `bru.sendRequest`**. Doc 2, step 3c: a parser can never
   produce a one-piece identifier containing a dot from real source (it would produce
   `bru` and `sendRequest` as two nodes). So this matches only nodes the transformer
   built — if the user's script contains their own `await somePromise` or even the text
   `bru.sendRequest(...)`, it parses differently and is skipped. ✅
3. *Is the await sitting inside a chain?* — this is `getChainedPromiseMemberPath`,
   worth reading closely:

```js
const getChainedPromiseMemberPath = (path) => {
  const parent = path.parent;
  if (!parent || parent.value.type !== 'MemberExpression') return null;
  if (parent.value.object !== path.value) return null;

  return PROMISE_CHAIN_METHODS.has(getStaticPropertyName(parent.value)) ? parent : null;
};
```

   In slot language: "is my parent a member expression, am I in its **object slot**
   (as opposed to, say, being an argument somewhere), and is the property one of
   `then` / `catch` / `finally`?" For (E): parent is (B1), (B1).object is (E) itself,
   property is `then`. ✅ — so (B1) is returned.

   Why check *which slot*? Compare `pm.sendRequest(a).then(h)` with
   `other.then(pm.sendRequest(a))`. In both, the await's parent chain contains a
   `.then` — but only in the first is the await the thing being chained *on*. The
   object-slot check tells them apart.

   The property check itself goes through `getStaticPropertyName`, which handles a
   subtlety: `x['then']` (a string in brackets) *is* statically the method `then`, but
   `x[then]` (a **variable** named `then` in brackets) is not — it's whatever that
   variable holds at runtime. Only statically-known names count.

A correct plain call — `await bru.sendRequest(config);` with no chain — passes checks 1
and 2 but fails check 3 (its parent is an `ExpressionStatement`, not a member), so the
post-pass leaves it completely alone. That's the guarantee that this pass can't damage
the already-correct outputs.

## Step 2 — unwrap: undo the bad swap

```js
// unwrap: (await bru.sendRequest(cfg)).then(...) -> bru.sendRequest(cfg).then(...)
const callPath = j(awaitPath).replaceWith(call).paths()[0];
```

Doc 2's bug was a slot swap: slot `(B1).object` got (E) instead of the call. This line
is the inverse swap — replace (E) with its own argument (F):

```
before:  (B1).object ──► AwaitExpression (E) ──► CallExpression (F)
after:   (B1).object ──► CallExpression (F)
```

Node (E) is discarded; everything else stays put. Printed right now the tree would read
`bru.sendRequest(config).then((res) => res.json()).catch(...)` — no more parentheses,
because there's no more await inside the member access for the printer to protect. But
we're not done: nothing awaits the chain yet, and the handler is still Postman-shaped.

One mechanical note: `replaceWith(...).paths()[0]` hands back the same path, now holding
(F) — so `callPath` is our live handle to the call at its position in the tree, ready
for the next two steps.

## Step 3 — rewrite the first `.then` handler

### 3a. Find the first `.then` — and only the first

```js
const rewriteFirstThenHandler = (j, callPath) => {
  let currentPath = callPath;

  for (let memberPath = getChainedPromiseMemberPath(currentPath); memberPath; ...) {
    const chainedCallPath = memberPath.parent;
    if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') return;

    if (getStaticPropertyName(memberPath.value) === 'then') {
      const handlerPath = chainedCallPath.get('arguments', 0);
      rewriteResponsePropertyAccess(j, handlerPath);
      return;                      // ← response consumed here; stop
    }

    currentPath = chainedCallPath; // it was .catch/.finally — keep walking outward
  }
};
```

This walks **outward** along the chain, one link at a time, reusing the same
object-slot test from step 1. On our example: from (F), the first link found is
`.then` at (B1)/(A1) — so the handler `(res) => res.json()` (slot `(A1).arguments[0]`)
is rewritten, and the walk **stops**.

The early `return` is a correctness rule, not laziness. Only the first `.then` receives
the HTTP response; every later handler receives whatever the previous one *returned*:

```js
bru.sendRequest(config)
  .then((res) => res.data)      // res  = the response       → rewrite ✅
  .then((data) => {
    console.log(data.status);   // data = the parsed body;
  });                           // its .status is the user's own field → hands off ✅
```

Note what the loop *skips over* versus what it *stops at*: a `.catch` or `.finally`
before the first `.then` is stepped over (their handlers get an error / nothing, never
the response, so there's nothing to rewrite in them — but the response is still waiting
for a later `.then`). A `.then` stops the walk even if its handler turns out to be
something unrewritable like a function name passed by reference — the response is
consumed there either way.

### 3b. Rewrite inside the handler — with a scope check

```js
const rewriteResponsePropertyAccess = (j, handlerPath) => {
  const handler = handlerPath.value;
  if (!handler) return;
  if (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression') return;
  if (handler.params[0]?.type !== 'Identifier') return;

  const responseVarName = handler.params[0].name;    // "res" in our example
  ...
```

The guards first: no handler at all (`.then()`), a handler passed by reference
(`.then(handleResponse)` — we can't see its body), or a destructured parameter
(`.then(({ code }) => ...)`) all bail out safely. Otherwise the first parameter's name
is the response variable.

Then the familiar search-and-replace from doc 1, section 1's table:

```js
  j(handlerPath).find(j.MemberExpression, {
    object: { type: 'Identifier', name: responseVarName }
  }).forEach((memberPath) => {
    ...
    const bruProperty = responsePropertyMap[property.name];   // json→data, code→status...
    if (!bruProperty) return;

    // skip references shadowed by a nested re-declaration of the name
    const declaringScope = memberPath.scope.lookup(responseVarName);
    if (!declaringScope || declaringScope.node !== handler) return;
```

That last check deserves a slow read. Finding "member expressions whose object is named
`res`" is a **name** match, but names can be reused by unrelated variables:

```js
.then((res) => {
  console.log(res.json());        // this res is the handler's parameter
  items.forEach((res) => {        // ← a DIFFERENT res: an array item
    console.log(res.json());      // must not be touched
  });
})
```

`memberPath.scope.lookup('res')` asks jscodeshift's scope tracker: *starting from this
expression and walking up through enclosing functions, which one **declared** the `res`
this reference resolves to?* For the first `res.json()` the answer is the `.then`
handler → rewrite. For the one inside `forEach` the answer is the inner arrow function
→ `declaringScope.node !== handler` → skip. Real JavaScript scoping rules make the
decision, not text matching.

Finally, the replacement itself has one branch:

```js
    const parentPath = memberPath.parent;
    if (parentPath.value.type === 'CallExpression' && parentPath.value.callee === memberPath.value) {
      j(parentPath).replaceWith(replacement);   // res.json()  → res.data   (call collapses)
    } else {
      j(memberPath).replaceWith(replacement);   // res.code    → res.status (plain property)
    }
```

`res.json` is a *method* in Postman but plain *data* in Bruno, so the call `res.json()`
must collapse to `res.data` — the parentheses go away, which means replacing the whole
`CallExpression`, one node higher. But that's only right when the member is the thing
**being called** (the callee slot). Counter-example: in `console.log(res.code)` the
member's parent is *also* a `CallExpression` — replacing the parent there would delete
the `console.log(...)` wrapper entirely. The `callee === memberPath.value` slot check
distinguishes "res.json **is called**" from "res.code **is an argument of** a call".

In our running example, `(res) => res.json()` becomes `(res) => res.data)`.

(Small aside for the curious: the search is rooted at the handler's *path*, not the
handler's *body*. For a concise arrow like `res => res.json()` the body **is** the
expression being replaced — rooting one level up guarantees the replaced node always has
a parent slot to splice into.)

## Step 4 — walk to the outermost link and await it there

```js
let outermostPath = callPath;
for (let memberPath = getChainedPromiseMemberPath(outermostPath); memberPath; ...) {
  const chainedCallPath = memberPath.parent;
  if (!chainedCallPath || chainedCallPath.value.type !== 'CallExpression') break;
  outermostPath = chainedCallPath;
}
```

Same outward walk a third time, but this one doesn't stop at `.then` — it rides every
link to the end. On our tree: (F) → `.then` call (A1) → `.catch` call (A2) → no more
links. `outermostPath` is (A2), the node whose value is the **entire chain** — and a
chain evaluates to a promise, so *this* is the node that deserves the await.

Two guards before wrapping:

```js
if (outermostPath.parent.value.type === 'AwaitExpression') return;
if (!isInAsyncContext(j, outermostPath)) return;

j(outermostPath).replaceWith(j.awaitExpression(outermostPath.value));
```

**Guard 1 — don't double-await.** If the user originally wrote
`await pm.sendRequest(config).then(...)`, that outer `await` wrapped the whole chain and
survived the main pass untouched (the transformer only saw the inner call). After our
unwrap in step 2, the code is already exactly right — wrapping again would print
`await await ...`.

**Guard 2 — don't emit illegal syntax.** `await` is only valid at the script's top
level (Bruno runs scripts in an async context) or inside an `async` function.
`isInAsyncContext` finds the nearest enclosing function; if there is one and it isn't
`async`, the chain is left un-awaited:

```js
function fetchData() {
  // stays exactly like this — awaiting here would be a SyntaxError,
  // and force-marking fetchData async would change it for every caller
  bru.sendRequest(config).then((res) => { console.log(res.data); });
}
```

That last clause is a deliberate contrast with the alternative fix (PR #8478), which
*mutated the user's function to `async`* to make its await legal — silently changing
what the function returns everywhere it's called. Leaving the chain un-awaited matches
how the code actually behaved in Postman.

The wrap itself is doc 2's step 4 performed *on the right node this time*: the slot
holding (A2) — here the `ExpressionStatement`'s expression slot — gets a new
`AwaitExpression` whose argument is (A2). And because this await is at the top of the
expression, nothing binds tighter around it, so the printer needs **no parentheses**:

```js
await bru.sendRequest(config)
  .then((res) => res.data)
  .catch((err) => console.error(err));
```

## Why the loop doesn't trip over its own edits

`ast.find(j.AwaitExpression)` collects its matches **before** the `forEach` starts
mutating. Two consequences worth knowing:

- The new `AwaitExpression` created in step 4 isn't in that pre-collected list, so it
  won't be revisited in this run. Even if it were, it would fail step 1's checks (its
  argument is the `.catch(...)` call, whose callee is a member expression — not the
  `bru.sendRequest` fingerprint) and be skipped. No infinite loops, no double-wrapping.
- Nested cases compose naturally. If a `.then` handler *itself* contains another
  translated sendRequest chain, that inner misplaced await is simply another entry in
  the same list and gets its own full repair — unwrap, rewrite, re-await (its
  enclosing function is the handler; if the handler is `async`, the inner chain gets
  its await too).

## Recap — the four steps on one screen

```
input     (await bru.sendRequest(config)).then((res) => res.json()).catch(h)

1. FIND     every await whose argument is the fingerprint call "bru.sendRequest"
            AND that sits in the object slot of a .then/.catch/.finally
            → matches only the transformer's misplaced awaits, nothing user-written

2. UNWRAP   put the call back in the slot, discard the await     (undo doc 2's swap)
            bru.sendRequest(config).then((res) => res.json()).catch(h)

3. REWRITE  walk outward to the FIRST .then only; inside its handler, remap
            res.json()→res.data etc., skipping shadowed names via scope lookup
            bru.sendRequest(config).then((res) => res.data).catch(h)

4. RE-AWAIT walk outward to the LAST link; wrap it in await —
            unless already awaited, or inside a non-async function
            await bru.sendRequest(config).then((res) => res.data).catch(h)
```

Each step is a small, checkable slot operation — which is exactly why the fix could
live entirely in one new file, with the original transformer left untouched.
