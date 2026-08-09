# Step by step: how `(await bru.sendRequest(config)).then(...)` comes to exist

Companion to `sendrequest-promise-chain-translation.md`. That doc says the old
transformer produced `(await ...).then(...)` — this one shows *exactly* how, one step at
a time, at the level of tree nodes. No step is skipped.

The input script for the whole walkthrough:

```js
pm.sendRequest(config).then((res) => {
  console.log(res.json());
});
```

---

## Step 1 — the code becomes a tree

Before any transformation, jscodeshift parses the script. Parsing works inside-out: to
know what `X.then(...)` is, the parser first has to understand `X`. So the *inner* call
ends up as a child node deep inside the *outer* call.

Here is the actual tree for our line (trimmed to what matters):

```
ExpressionStatement                          the whole line
└── CallExpression                (A)        ....then( handler )   ← OUTER call
    ├── callee: MemberExpression  (B)        "<something>.then"
    │   ├── object:  CallExpression (C)      pm.sendRequest(config)  ← INNER call
    │   │   ├── callee: MemberExpression (D) "pm.sendRequest"
    │   │   │   ├── object:   Identifier "pm"
    │   │   │   └── property: Identifier "sendRequest"
    │   │   └── arguments: [ Identifier "config" ]
    │   └── property: Identifier "then"
    └── arguments: [ ArrowFunctionExpression ]        the (res) => {...} handler
```

Read it bottom-up, the way the parser built it:

- **(D)** `pm.sendRequest` is a `MemberExpression` — "the `sendRequest` property of `pm`".
- **(C)** calling (D) with `config` makes a `CallExpression`. This node *is*
  `pm.sendRequest(config)`.
- **(B)** `.then` hangs off (C): another `MemberExpression` — "the `then` property of
  **whatever (C) evaluates to**". Note carefully: **(C) is stored inside (B), in its
  `object` slot.** This one fact drives everything that follows.
- **(A)** calling (B) with the arrow function makes the outer `CallExpression`.

The mental model to keep: a tree node is a box with named **slots**, and each slot holds
another node. `(B).object` is a slot, and right now the node sitting in that slot is (C).

## Step 2 — the walker finds `pm.sendRequest`

`processTransformations` walks every `MemberExpression` in the tree and computes its
dotted string. When it reaches node **(D)**, the string is `"pm.sendRequest"` — a match.
The registered transformer for that pattern is called.

Two things about *how* it is called:

- It receives the **path** to (D). A path is a node plus how-you-got-here — so the
  transformer can also see `path.parent`, which is the inner call (C).
- The walker's rule for call patterns is:

  ```js
  // simplified from processTransformations
  const replacement = transform(path, j);
  j(path.parent).replaceWith(replacement);   // path.parent === node (C)
  ```

  Whatever the transformer returns will be put **where node (C) currently is** — i.e.
  into slot `(B).object`. Nothing above (C) is shown to the transformer, and nothing
  above (C) will be touched.

## Step 3 — the transformer builds its replacement (as a detached mini-tree)

Inside `sendRequestTransformer`, step by step:

**3a.** It looks at the call's arguments: `[config]`. One argument, no callback.

**3b.** It checks "was I already awaited?":

```js
const wasAwaited = path.parent.parent.value.type === 'AwaitExpression';
```

Walk that by hand on our tree: `path` is (D), `path.parent` is (C), `path.parent.parent`
is **(B)** — a `MemberExpression`, not an `AwaitExpression`. So `wasAwaited` is `false`.

This is the exact line where the bug is *decided*. The check only asks about the
immediate ancestors; a `MemberExpression` there actually means "I'm inside a chain", but
the old code had no branch for that case — anything other than `AwaitExpression` fell
through to "not awaited, so I must add the await myself".

**3c.** It constructs new nodes, floating in memory, not attached to the tree yet:

```js
const sendRequestCall = j.callExpression(        // new CallExpression node
  j.identifier('bru.sendRequest'),               //   callee: ONE Identifier whose name
  [requestOptions]                               //   is the string "bru.sendRequest"
);
return j.awaitExpression(sendRequestCall);       // wrap it: new AwaitExpression node
```

The returned mini-tree:

```
AwaitExpression               (E)   ← this is what gets returned
└── argument: CallExpression  (F)
    ├── callee: Identifier "bru.sendRequest"
    └── arguments: [ Identifier "config" ]
```

(Aside: that one-piece `"bru.sendRequest"` identifier is the "fingerprint" the fix later
uses to recognize transformer output — a real parser would never make a single
identifier with a dot in it.)

## Step 4 — the swap: one slot changes, nothing else moves

Now the walker executes `j(path.parent).replaceWith(replacement)` — "replace node (C)
with node (E)". Concretely that means: **find the slot that holds (C), and store (E) in
it instead.** That slot is `(B).object`.

Before the swap:

```
CallExpression (A)  ....then(handler)
└── callee: MemberExpression (B)
    ├── object:  ──►  CallExpression (C)  pm.sendRequest(config)
    └── property: Identifier "then"
```

After the swap:

```
CallExpression (A)  ....then(handler)          ← UNCHANGED
└── callee: MemberExpression (B)               ← UNCHANGED
    ├── object:  ──►  AwaitExpression (E)      ← ONLY THIS SLOT CHANGED
    │                 └── CallExpression (F)  bru.sendRequest(config)
    └── property: Identifier "then"            ← UNCHANGED
```

This is the moment the strange shape is born, and notice there is nothing strange about
it *as a tree operation*. Node (B) never meant "call `.then` on `pm.sendRequest(config)`";
it always meant "call `.then` on **whatever is in my `object` slot**". The transformer
changed what's in the slot from "a call" to "an await of a call". The `.then` structure
around it wasn't rearranged — it was never looked at.

So the bug is not that an `await` node was "inserted into the middle of the chain" by
some faulty motion. Every step behaved exactly as designed. The bug is a *blind spot*:
the decision in step 3b ("no await above me → wrap myself") is only correct when the
matched call is the whole expression. When the call is the `object` of a chain, wrapping
*yourself* puts the await *inside* the chain — because yourself is inside the chain.

## Step 5 — printing: where the parentheses come from

The tree has no parentheses anywhere — parens are not nodes. They appear only at the
final step, when jscodeshift prints the tree back to source text (`ast.toSource()`).

The printer's job is: produce text that *parses back into this exact tree*. When it
prints node (B) — "member access on an `AwaitExpression`" — it checks operator
precedence:

- Member access (`.`) binds **tighter** than `await`.
- So the naive text `await bru.sendRequest(config).then` would re-parse as
  `await (bru.sendRequest(config).then)` — the `.then` would attach to the call, and the
  `await` would wrap the whole thing. That's a *different tree* than the one in memory
  (ironically, it's the tree we *wished* we had).
- To keep the text faithful to the actual tree — await first, then member access — the
  printer must force the order with parentheses:

```js
(await bru.sendRequest(config)).then((res) => {
  console.log(res.json());
});
```

So the parentheses are the printer *faithfully preserving the broken structure*. They're
the visible symptom, not the cause.

## Step 6 — why the handler still says `res.json()`

One line of the output still looks untouched: `console.log(res.json())`. That's because
the arrow function lives in `(A).arguments` — the *outer* call's argument list. The
transformer's response-rewriting logic only ever ran on the **second argument of
`pm.sendRequest` itself** (callback style). Our arrow function is an argument of
`.then(...)`, a node the transformer never received. Nobody ever visited it, so nobody
rewrote it.

## Recap — the six steps on one screen

```
1. PARSE      pm.sendRequest(config).then(h)
              → outer call (A) › member .then (B) › object slot holds inner call (C)

2. MATCH      walker finds MemberExpression "pm.sendRequest" (D), calls transformer
              with the path to (D); will replace path.parent = (C)

3. DECIDE     transformer checks parent.parent → sees MemberExpression, not Await
              → wasAwaited = false → builds  await bru.sendRequest(config)  (E)

4. SWAP       slot (B).object: (C) is taken out, (E) is put in
              → the await is now INSIDE the chain, because (C) was inside the chain

5. PRINT      printer must keep "await before .then" true in text
              → forced parens:  (await bru.sendRequest(config)).then(h)

6. LEFTOVER   handler h belongs to the outer call (A), which nobody transformed
              → res.json() survives untouched
```

And the fix from the main doc now reads naturally in these terms: after the walk is
over, find every `AwaitExpression` sitting in a `.then`/`.catch`/`.finally` **object
slot** (step 4's tell-tale shape, identified via the fingerprint from step 3c), put its
argument back into the slot (undoing step 4), rewrite the first `.then` handler (doing
what step 6 never did), and wrap the **outermost** chain node in a new `AwaitExpression`
— the node that wrapping-yourself should have targeted all along.
