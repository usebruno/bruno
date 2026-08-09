# How Bruno translates `pm.sendRequest` scripts — the promise-chain bug and its fix

This doc explains, for someone new to ASTs, how the Postman → Bruno **script translation**
works, what was broken for promise chains, and how the fix works. It only covers the
scripting area (`packages/bruno-converters`), not the rest of the importer.

---

## 1. Background: what the translator does

When you import a Postman collection, every script in it (pre-request scripts, test
scripts) is written against **Postman's API** (`pm.*`). Bruno has its own API (`bru.*`),
so the importer rewrites the code:

```js
// Postman script (input)
pm.sendRequest({ url: 'https://example.com' }, (err, res) => {
  console.log(res.json());
});

// Bruno script (output)
await bru.sendRequest({ url: 'https://example.com' }, async function(err, res) {
  console.log(res.data);
});
```

Two things changed there, and they matter for the rest of this doc:

1. **The function call**: `pm.sendRequest` → `await bru.sendRequest`. Bruno's version
   returns a promise, so the translator adds `await` (Bruno runs scripts in an async
   context, so top-level `await` is legal).
2. **The response object's shape**: Postman's response has *methods* like `res.json()`
   and properties like `res.code`. Bruno's response is axios-shaped: the parsed body is
   already there as `res.data`, the HTTP code is `res.status`. So inside any function
   that receives the response, the translator remaps:

   | Postman        | Bruno            |
   |----------------|------------------|
   | `res.json()`   | `res.data`       |
   | `res.text()`   | `res.data`       |
   | `res.code`     | `res.status`     |
   | `res.status`   | `res.statusText` |

---

## 2. Background: how the rewriting is done (AST in 2 minutes)

You can't do this safely with string find-and-replace — `res.json()` might appear inside
a string, a comment, or belong to a completely different variable that happens to be
called `res`. So the translator uses an **AST (Abstract Syntax Tree)**.

An AST is just the code parsed into a tree of typed nodes. For example:

```js
pm.sendRequest(config).then(handler);
```

parses into (simplified):

```
CallExpression                      ← the outer call: ....then(handler)
├── callee: MemberExpression        ← the ".then" part
│   ├── object: CallExpression      ← the inner call: pm.sendRequest(config)
│   │   ├── callee: MemberExpression← "pm.sendRequest"
│   │   └── arguments: [config]
│   └── property: Identifier "then"
└── arguments: [handler]
```

The library used is **jscodeshift**: you search the tree for nodes matching a pattern
("find every `MemberExpression` whose object is the identifier `res`"), and you *replace
nodes* with new ones. At the end the tree is printed back to source code. Because you
work on real syntax nodes, a `res` inside a string literal or a different scope can be
told apart from the one you mean.

The entry point is `translateCode()` in
`packages/bruno-converters/src/utils/postman-to-bruno-translator.js`. Its core step,
`processTransformations()`, walks **every `MemberExpression` in the script once** and,
when one matches a known pattern like `pm.sendRequest`, calls that pattern's transformer.

**The key contract** (this is where the bug comes from): the transformer for a pattern
returns a *replacement node*, and `processTransformations` swaps it in **in place of the
matched call only** — it does not get to touch the code *around* the call.

---

## 3. How `pm.sendRequest` was translated before the fix

The transformer (`send-request-transformer.js`) does, in order:

1. Rewrites the request config (Postman's `header:` array → Bruno's `headers:` object,
   `body: { mode: 'raw', raw: ... }` → `data: ...`), following variables if the config
   was passed by name.
2. If there's a **callback** argument, rewrites the response accesses inside it
   (the table above) and marks it `async`.
3. Builds the replacement call `bru.sendRequest(...)` and — unless the original call was
   already directly under an `await` — **wraps it in `await`**:

```js
return wasAwaited ? sendRequestCall : j.awaitExpression(sendRequestCall);
```

For the two usage styles it was designed around, this is exactly right:

```js
// style 1: fire and forget                      // becomes
pm.sendRequest(config);                          await bru.sendRequest(config);

// style 2: node-style callback                  // becomes
pm.sendRequest(config, (err, res) => {           await bru.sendRequest(config, async function(err, res) {
  console.log(res.json());                         console.log(res.data);
});                                              });
```

---

## 4. The bug: promise chains

Postman's `pm.sendRequest` *also* returns a promise, so plenty of real-world scripts use
the third style:

```js
pm.sendRequest(config)
  .then((res) => {
    console.log(res.json());
  })
  .catch((err) => {
    console.error(err);
  });
```

Now walk through what the old transformer did to this. Remember the contract: it only
gets to replace the **inner** `pm.sendRequest(config)` node. It has no idea a `.then` is
hanging off it — and it wraps its replacement in `await` unconditionally. So the tree
after transformation, printed back to code, was:

```js
(await bru.sendRequest(config))     // ① await in the WRONG place
  .then((res) => {
    console.log(res.json());        // ② handler never rewritten
  })
  .catch((err) => {
    console.error(err);
  });
```

Two distinct problems:

**① The `await` lands on the wrong node.** `await bru.sendRequest(config)` resolves the
promise and gives you the **response object** — and then the script calls `.then(...)`
**on the response**, which has no `.then` method. At runtime this throws
`TypeError: ....then is not a function` and the imported script is simply broken.

What you actually want is the `await` around the *whole chain*, because the chain as a
unit is a promise:

```js
await bru.sendRequest(config).then(...).catch(...);   // ✅ correct
```

**② The handler kept Postman's response shape.** The response-remapping logic only ran
on *callback-style* second arguments. A `.then` handler is not an argument of
`pm.sendRequest` — it's an argument of the outer `.then(...)` call, which the transformer
never looked at. So even if the `await` had been right, `res.json()` would still be
called on a Bruno response, where `json` doesn't exist.

Why couldn't the transformer just fix this itself? Because of the contract from §2: it
returns a replacement for the matched node only. The `.then(...)` call is the matched
node's **parent** — mutating your own ancestors while `processTransformations` is still
walking the tree risks the walker holding stale references (this is exactly the unsafe
thing an earlier attempt, PR #8478, did).

---

## 5. The fix: a repair pass that runs after the main walk

Instead of changing the transformer (it stays byte-for-byte untouched), the fix adds a
**post-pass**: a new module `send-request-chain-transformer.js`, called from
`translateCode()` right after `processTransformations()` finishes. By then the tree walk
is done, so it's safe to restructure anything.

The post-pass finds the broken shape the transformer left behind and repairs it in three
steps.

### Step 0 — find the broken chains, and only them

How do you find "an `await` the transformer put in the wrong place" without ever touching
user-written code? By a fingerprint: the transformer builds its callee as a **single
identifier whose name is literally the string `bru.sendRequest`** — one node with a dot
in its name. A parser reading real source code would *never* produce that (it would
produce `bru` and `sendRequest` as two nodes in a `MemberExpression`). So:

```
find every AwaitExpression whose argument is a call
  to the single identifier "bru.sendRequest"
  AND which sits as the object of a .then / .catch / .finally member
```

matches exactly the transformer's output inside a chain — zero false positives — and
skips correct output like a plain `await bru.sendRequest(config);` (no chain around it).

### Step 1 — unwrap the misplaced `await`

```js
(await bru.sendRequest(config)).then(...)   →   bru.sendRequest(config).then(...)
```

In AST terms: replace the `AwaitExpression` node with its own argument. One node swap.

### Step 2 — rewrite the response accesses in the first `.then` handler

Walk outward along the chain (`.then`/`.catch`/`.finally` links) and find the **first
`.then`**. Its first argument is the function that receives the response, so the same
remapping table from §1 is applied inside it:

```js
.then((res) => {                    .then((res) => {
  console.log(res.json());    →       console.log(res.data);
  console.log(res.code);              console.log(res.status);
})                                  })
```

Only the *first* `.then` — and this is a correctness point, not a shortcut. Later
handlers don't receive the response; they receive whatever the previous handler returned:

```js
pm.sendRequest(config)
  .then((res) => res.json())     // res IS the response  → rewrite → res.data
  .then((data) => {
    console.log(data.status);    // data is the parsed BODY, its .status is the
  });                            // user's own field → must NOT become .statusText
```

There's one more subtlety: **shadowing**. Matching by the name `res` alone is not enough,
because a nested function can declare its own `res` that has nothing to do with the
response:

```js
.then((res) => {
  console.log(res.json());        // outer res = the response      → rewrite ✅
  items.forEach((res) => {        // inner res = an array item!
    console.log(res.json());      // different variable            → leave alone ✅
  });
})
```

The post-pass asks jscodeshift's scope tracker "which function *declared* the `res` this
expression refers to?" and only rewrites when the answer is the `.then` handler itself.
That's real JavaScript scoping rules doing the work, not name matching.

### Step 3 — put the `await` where it belongs

Walk to the **outermost** link of the chain and wrap that in `await`:

```js
await bru.sendRequest(config)
  .then((res) => { console.log(res.data); })
  .catch((err) => { console.error(err); });
```

…with two guards:

- **Don't double-await.** If the user had already written
  `await pm.sendRequest(config).then(...)`, the outermost link already sits under an
  `await` — skip.
- **Don't emit invalid syntax.** `await` is only legal at the script's top level or
  inside an `async` function. If the chain lives inside a plain (non-async) function, the
  post-pass leaves it un-awaited rather than either producing a syntax error or silently
  changing the user's function to `async` (which would change what that function returns
  for every caller):

  ```js
  function fetchData() {
    // no await added here — the chain still runs, just isn't waited on,
    // exactly as it behaved in Postman
    bru.sendRequest(config).then((res) => { console.log(res.data); });
  }
  ```

### End-to-end example

```js
// INPUT (Postman)
pm.sendRequest({ url: 'https://example.com', header: { 'X-Api': '1' } })
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

// after the MAIN PASS (broken intermediate — never shown to the user)
(await bru.sendRequest({ url: 'https://example.com', headers: { 'X-Api': '1' } }))
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

// after the POST-PASS (final output)
await bru.sendRequest({ url: 'https://example.com', headers: { 'X-Api': '1' } })
  .then((res) => res.data)
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
```

(Note the config rewrite `header:` → `headers:` was already handled by the main pass —
the post-pass only fixes the chain-specific parts.)

---

## 6. Why fix it this way?

- **The existing transformer is untouched.** Its contract with the tree walker
  (`replace the matched node only`) stays intact, so nothing about callback-style or
  plain calls can regress. The whole fix is one new file plus a one-line call in
  `translateCode()`.
- **No mutating ancestors mid-walk.** The post-pass runs on a settled tree, avoiding the
  stale-reference hazard of restructuring the chain from inside the walker.
- **Loosely coupled.** If the transformer is someday taught to not await chained calls
  itself, the post-pass finds nothing to unwrap and becomes a no-op instead of breaking.

## 7. Where the code lives

| What | Where |
|------|-------|
| Post-pass (the fix) | `packages/bruno-converters/src/utils/send-request-chain-transformer.js` |
| Hook that runs it | `translateCode()` in `postman-to-bruno-translator.js`, right after `processTransformations()` |
| Original transformer (unchanged) | `packages/bruno-converters/src/utils/send-request-transformer.js` |
| Tests (`Promise chains` describe block) | `packages/bruno-converters/tests/postman/postman-translations/transpiler-tests/transformers/send-request.test.js` |
