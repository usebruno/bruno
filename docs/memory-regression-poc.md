# Runner Memory Regression — Profiling Report & Root-Cause Analysis

**Scope:** CLI + Desktop runner consuming memory proportional to the number of
requests executed in v3.4.x (vs flat in v3.3.0).
**Related issues:** [#8137](https://github.com/usebruno/bruno/issues/8137),
[#8065](https://github.com/usebruno/bruno/issues/8065#issuecomment-4612555864),
[#7558](https://github.com/usebruno/bruno/issues/7558#issuecomment-4563338353).
**Out of scope:** large-response handling — [BRU-1071](https://usebruno.atlassian.net/browse/BRU-1071).

---

## 1. Summary

The runner leaked memory because **every script, assertion and test evaluation
created a QuickJS (WASM) context that was never disposed.** QuickJS runs inside a
WebAssembly module; its contexts live in WASM *linear memory*, which is invisible
to V8's garbage collector. Without an explicit `vm.dispose()`, that memory grew on
every executed request and was never reclaimed — eventually exhausting the
container/heap budget (CLI: ~300 MB → 1.4+ GB; Desktop: crash with *"memory
access out of bounds"*).

The fix disposes each context after use. Because a context can only be disposed
once **all handles created inside it are also disposed**, the change is twofold:

1. Dispose the context (`vm.dispose()` in a `finally`) in both sandbox entry points.
2. Dispose the handles that were previously leaked (in `marshallToVm`, in the
   variable-injection loop, in shim container objects, and in setup `evalCode`
   results) so that disposal succeeds instead of aborting.

**Result:** WASM ("external") memory growth over 300 same-request runs went from
**+690 MB → ~0 MB** (async script path) and **+31 MB → ~0 MB** (sync assertion
path). All 510 bruno-js tests pass.

---

## 2. Profiling — what is growing

Measured with `scripts/memory-profile.js` (Node `--expose-gc`, GC forced before and
after the run), driving the real bruno-js runtimes over 300 executions of the same
request.

### Async script path (`ScriptRuntime.runResponseScript` → `executeQuickJsVmAsync`)

| Metric | Before fix (300 req) | After fix (300 req) |
| --- | --- | --- |
| RSS growth | **+231 MB** | ~flat (−18 MB / GC noise) |
| **external (WASM) growth** | **+690 MB** | **−0.5 MB (flat)** |
| V8 heap growth | +6 MB | +0.7 MB |

Timeline (before fix) — `external` climbs monotonically while the V8 heap is flat:

```
iter   rss      heapUsed   external
  0    143.8     35.2        20.0
 100   352.5     37.4       251.7
 200   294.9     45.8       432.5
 300   378.0     45.8       710.5   <- external never stops growing
```

### Sync assertion path (`AssertRuntime.runAssertions` → `executeQuickJsVm`)

| Metric | Before fix (300 req) | After fix (1000 req) |
| --- | --- | --- |
| RSS growth | +58 MB | +26 MB (plateaus) |
| **external (WASM) growth** | **+31 MB** | **−0.5 MB (flat)** |
| V8 heap growth | +7 MB | +0.6 MB |

### Key observations

- The growth is in **`external`** (WASM linear memory), **not** the V8 heap.
- **Forcing GC reclaims nothing** — confirming the memory is native, not
  JS-heap garbage. This matches the report's *"GC does not reclaim it."*
- The async path leaks ~22× more per request than the sync path because each
  async context additionally loads the full bundled library code (chai, ajv,
  axios, crypto, uuid, etc.) — ~2 MB of WASM allocations per leaked context.

---

## 3. Root cause

### 3.1 The leak mechanism

`packages/bruno-js/src/sandbox/quickjs/index.js` exposes two entry points:

- `executeQuickJsVm` (sync) — used for **assertions** (LHS/RHS expression eval).
- `executeQuickJsVmAsync` (async) — used for **pre/post-response scripts and tests**.

Both create a context (`module.newContext()`), wire in shims, evaluate the user
code, and return. Neither disposed the context:

- the async path had `// vm.dispose();` **commented out**;
- the sync path never called `vm.dispose()` at all.

QuickJS contexts are WebAssembly objects. Their memory is owned by the WASM
instance and is **not** tracked or freed by V8's GC. The only way to release it is
`context.dispose()`. Leaving contexts undisposed means each executed request
permanently grows WASM memory — a textbook native leak.

### 3.2 Why it surfaced as a *regression* (v3.3.0 → v3.4.x)

The undisposed-context bug is **latent and old** — `// vm.dispose()` has been
present since the safe-mode QuickJS work (commit `753a576c3`), and `safe`/`quickjs`
was already the default sandbox in v3.3.0. So why did v3.3.0 stay flat?

What changed in v3.4.x is the **amount of work routed through the leaking path and
the size retained per leaked context**:

- v3.4.x added the in-sandbox **`test()` runner** (`shims/test.js`, new) and
  expanded assertion/Postman-parity helpers (`assert-runtime.js`,
  `bruno-request`/`bruno-response` shims, `property-list-bridge`). Tests and richer
  assertions now execute through the QuickJS sandbox, each spinning up a context
  loaded with the full bundled library bundle.
- The result: more contexts per request **and** a much larger footprint per
  leaked context. A leak that was a slow trickle in v3.3.0 became a per-request
  multi-MB leak in v3.4.x, large enough to OOM a single collection run.

This is why the profiling shows the async (script/test) path dominating at
+690 MB while the older sync (assertion) path leaks a comparatively small +31 MB.

### 3.3 Why disposal wasn't simply "turned back on"

Naively re-enabling `vm.dispose()` **crashes**:

```
Aborted(Assertion failed: list_empty(&rt->gc_obj_list), at: quickjs.c:2036, JS_FreeRuntime)
```

QuickJS refuses to free a context that still holds **live, undisposed handles**
(this check is compiled into the `RELEASE_SYNC` variant Bruno uses, not just debug
builds). The shims and `marshallToVm` created handles that were never disposed, so
calling `vm.dispose()` aborted the WASM instance and freed nothing — which is the
likely reason the original author commented it out rather than fixing it. A correct
fix therefore had to dispose **all** created handles first.

---

## 4. The fix

All changes are in `packages/bruno-js/src/sandbox/quickjs/`.

1. **Dispose the context** — `vm.dispose()` in a `finally` block in both
   `executeQuickJsVm` and `executeQuickJsVmAsync`, so the context is freed even on
   script error.

2. **`marshallToVm` (`utils/index.js`)** — dispose each nested child handle after
   `vm.setProp` (setProp does not consume the handle). Disposing static handles
   (`undefined`/`null`/`true`/`false`) is a safe no-op, so no special-casing.

3. **Variable injection (`executeQuickJsVm`)** — dispose the top-level marshalled
   handle after attaching it to global.

4. **Setup `evalCode` results** — a new `evalCodeAndDispose(vm, code)` helper
   (`utils/index.js`) runs wiring code and disposes the returned result handle.
   Applied across `shims/test.js`, `shims/lib/{axios,nanoid,uuid,jwt,path,crypto-utils}.js`,
   and the bru/req/res shims. These results were previously discarded (leaked).

5. **`shims/bru.js`** — dispose the `bruRunnerObject` container (it was attached to
   `bru.runner` but never disposed) and the `sendRequest`/cookies setup eval result.

### Validation

- **Unit tests:** `packages/bruno-js` — **510/510 pass**.
- **Isolation check:** each shim builds into a context that now disposes cleanly
  (no `JS_FreeRuntime` abort).
- **Memory:** see §2 — WASM growth is flat after the fix over 1000 iterations.

---

## 5. Regression guard — memory benchmark

`tests/benchmarks/memory/runner-memory.js` (run via `npm run test:benchmark:memory`,
wired into `.github/actions/tests/run-benchmark-tests`, i.e. the existing
Benchmarks CI workflow).

- Sends the **same request 100 and 300 times** through both the script and
  assertion paths (the user-reported scenario).
- Measures **external (WASM) growth** (the low-noise leak signal) with GC forced.
- **Hard, deterministic thresholds** — fails the build (exit 1) if external growth
  exceeds the per-scenario cap (15 MB @100, 25 MB @300). Post-fix growth is ~0 MB;
  the pre-fix leak was +228 MB / +650 MB.

Verified both directions:

```
# with fix
quickjs-scripts-300     external +0.0 MB  -> ok
quickjs-assertions-300  external +0.0 MB  -> ok

# leak reintroduced (fix stashed)
quickjs-scripts-100     external +228.9 MB -> FAIL
quickjs-scripts-300     external +650.9 MB -> FAIL   (exit 1)
```

---

## 6. Reproduction

```bash
# Profiling timeline (per-path):
MODE=script ITERATIONS=300 node --expose-gc scripts/memory-profile.js
MODE=assert ITERATIONS=300 node --expose-gc scripts/memory-profile.js

# Regression guard:
npm run test:benchmark:memory
```
