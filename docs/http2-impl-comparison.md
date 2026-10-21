# HTTP/2 implementation comparison — custom transport vs `http2-wrapper`

Two complete HTTP/2 implementations exist for Bruno, and this document compares them problem-by-problem
so we can decide what to ship.

- **Custom transport** — in `bruno-forked`, built directly on Node's `node:http2`. We own ALPN,
  the session pool, lifecycle, proxy CONNECT/SOCKS, and the readiness gate.
  Code: `packages/bruno-requests/src/utils/http2/`.
- **`http2-wrapper` transport** — in `bruno`, built on the [`http2-wrapper`](https://github.com/szmarczak/http2-wrapper)
  library (`~2.2.1`). It reuses the library's `Agent` (pool), `auto.resolveProtocol` (ALPN) and
  `proxies.*` (proxy tunnels), and patches around the gaps.
  Code: `packages/bruno-requests/src/http2/`.

The problem spine below mirrors `docs/http2-build-plan.md` (the phases). For each problem we show how
each implementation solves it, what `http2-wrapper` gives us for free, and what it forces us to patch
or cannot do at all.

---

## TL;DR — recommendation

**Ship the custom transport.**

It is a feature superset of the wrapper implementation, it has no third-party transport dependency to
track and patch around, and its correctness-critical behavior (GOAWAY/RST lifecycle, proxying) is
handled natively rather than bolted onto a library that was not designed for an interactive API client.
Crucially, its test suite was **ported from `http2-wrapper`'s own test suite**, so every behavior the
library guarantees is also asserted against our code.

The one thing we "pay" is lines of code: ~1180 LOC we own vs ~698 LOC plus the library. But those 698
LOC are *mostly patches around the library* (socket guard, GOAWAY poisoning, SOCKS subclass, IPv6
servername workaround, bypassing the library's own `ClientRequest`), so the wrapper path does not buy
us the "someone else maintains it" benefit it appears to — we maintain the workarounds regardless, and
we are coupled to the library's internals (e.g. its private ALPN-cache key format).

| | Custom (`bruno-forked`) | `http2-wrapper` (`bruno`) |
|---|---|---|
| Base | `node:http2` directly | `http2-wrapper ~2.2.1` |
| Axios integration seam | `config.adapter` (replaces the adapter) | `config.transport` (axios transport hook) |
| Source size | ~1180 LOC | ~698 LOC **+ library** |
| Unit tests | 10 files / **118** cases (ported from the wrapper suite) | 9 files / **94** cases |
| ALPN probe + cache | own (`alpn.ts`) | **library** (`auto.resolveProtocol` + `auto.protocolCache`) |
| Session pool | own (`session-pool.ts`) | **library** (`Agent`) + patches |
| GOAWAY-safe reuse | native (`drainSession`) | **patched** (poison flag + deferred destroy + acquire-retry) |
| Node-22 stuck-socket guard | not needed (own connect path) | **patched** (`withSocketGuard`) |
| HTTP / HTTPS proxy | own CONNECT tunnel | **library** (`proxies.Http2OverHttp/Https`) |
| SOCKS proxy | own (`SocksClient`, 4/4a/5) | **patched** (subclass + `socks-proxy-agent`) |
| Cleartext HTTP/2 (`http://`, h2c) | ✅ prior knowledge | ❌ **not supported** ("requires TLS") |
| IPv6 literal servername | handled in TLS-option builder | **patched** (`checkServerIdentity` override) |
| Request layer | own adapter → `sendHttp2Request` | **bypasses** the library's `ClientRequest` (incompatible with axios) |

---

## 1. HTTP-version preference + the integration seam (Phase 1)

**Problem:** users pick the version (`auto | http1.1 | http2`), and there must be one place where HTTP/2
plugs into the request pipeline with zero behavior change by default.

- **Custom:** `resolveHttpVersion(request, collectionHttpVersion, fallback)` (shared in `bruno-requests`),
  `canUseHttp2(mode)`, and `attachHttp2Adapter({ config, requestedHttpVersion, tlsOptions, proxyUri })`
  which sets `config.adapter`. The precedence (request > collection > app/flag) is shared by the desktop
  app and the CLI.
- **Wrapper:** `resolveHttpVersion(...)`, `canUseHttp2(...)`, and `applyHttp2Transport({ config,
  httpVersionPreference, tlsOptions, proxyInfo })` which sets `config.transport`.

**Difference — the seam.** The custom impl replaces the whole axios **adapter**; the wrapper impl plugs
into axios's **transport** hook (`config.transport.request(options, cb)`, the same contract as
`http.request`). The transport hook keeps more of axios's native flow (redirect loop, decompression)
running, but it means the wrapper impl must hand axios a stream that *looks like* an HTTP/1.1
`IncomingMessage` (see §8). Both are valid; neither is clearly better. The decision logic is essentially
the same in both.

## 2. ALPN negotiation + protocol cache (Phase 2)

**Problem:** HTTP/2 over TLS is an ALPN decision made *before* the request (axios's native h2 is
prior-knowledge only and cannot fall back). We need one TLS probe and a per-origin cache.

- **Custom:** hand-rolled. `negotiateHttpVersion()` opens one `tls.connect` offering `h2,http/1.1`,
  reads `socket.alpnProtocol`, and caches the result in an own `Map` keyed by **origin + TLS identity +
  proxy** (`cache-key.ts`). Different client certs or CAs get different cache entries.
- **Wrapper:** **`http2-wrapper` provides this for free** — `auto.resolveProtocol` is the probe and
  `auto.protocolCache` is the cache. The impl just maps preference → decision and reuses the cache.

**What the library gives us:** the whole ALPN probe + cache (~a few hundred lines we would otherwise
write). **What it costs:** the wrapper impl is **coupled to the library's private cache-key format** —
it reconstructs the key by hand (`` `${host}:${port}:${ALPNProtocols.sort().join(',')}` ``) to invalidate
entries. If the library changes that format, invalidation silently breaks. Also, the library's key is
**host:port:alpn only** — it ignores TLS identity, so two requests to the same host with *different
client certificates* share one ALPN result. The custom cache keys on TLS identity too, which is more
correct (though ALPN rarely depends on the client cert in practice).

## 3. HTTP/1.1 → HTTP/2 header translation (Phase 3)

**Problem:** axios hands an HTTP/1.1-shaped request; HTTP/2 needs pseudo-headers (`:method`/`:scheme`/
`:authority`/`:path`), lowercase names, dropped connection-specific headers, `Host`→`:authority`, and
`te: trailers` only.

Both implementations **hand-roll this identically** (`headers.ts` in each). `http2-wrapper`'s own header
handling is *not* reused — the library's request layer is bypassed (see §4/§8). So this is a wash: same
code, same edge cases (pseudo-header drop, `te`, `http2-settings` strip), written twice.

## 4. The request/response transport (Phases 3 & 7)

**Problem:** turn one axios request into one HTTP/2 stream and shape the response back.

- **Custom:** `http2-adapter.ts` is a full axios adapter calling `sendHttp2Request()` (`send-request.ts`),
  which owns the `session.request()`, body piping (string/Buffer/Readable/FormData), buffering, and
  error mapping, returning a normalized response.
- **Wrapper:** `transport.ts` returns `{ request(options, cb) }` using the **raw** `session.request()`.

**Key finding — the library's main abstraction is unusable here.** The wrapper impl explicitly
**avoids `http2-wrapper`'s `ClientRequest`** because "its `socket` event makes Axios call
`setKeepAlive()`, which HTTP/2 doesn't support." So the one thing a wrapper library is *for* — a
`http.ClientRequest`-compatible object — is thrown away, and the impl drives the raw Node stream itself.
At that point both implementations are doing the same low-level work; the library only still provides the
*pool* and the *ALPN probe*.

Both then manually shape the stream into an HTTP/1-looking response (`statusCode`, `statusMessage` from
`STATUS_CODES`, `httpVersion='2.0'`, `protocol/host/path` so `res.getUrl()` works) and both keep the
writable side open (`endStream:false`) to avoid `ERR_STREAM_WRITE_AFTER_END` on GET/DELETE.

## 5. Session pool — reuse & keying (Phase 4)

**Problem:** one connection per request wastes multiplexing and leaks sockets; pool by origin (+ TLS
identity) and close when idle.

- **Custom:** own `session-pool.ts` — `acquireSession` keyed by origin + TLS identity + proxy, idle
  timer, `closeAllSessions`, concurrent-acquire dedup.
- **Wrapper:** **`http2-wrapper`'s `Agent` provides the pool.** `new SessionAgent({ timeout })`,
  `agent.getSession(origin, options)`.

**What the library gives us:** session pooling + reuse + multiplex readiness (§6) for free. **What it
costs:** the pool is not safe for an interactive client out of the box — see §6 and §7.

## 6. Multiplexing & readiness gating (Phase 6)

**Problem:** opening streams before the peer's SETTINGS arrive makes Node send them optimistically and
the server REFUSEs the excess; the first burst must wait on `remoteSettings`.

- **Custom:** explicit `whenReady()` (resolves on `remoteSettings`) + a connecting-dedup map so a
  fresh-origin burst shares one session and queues past `MAX_CONCURRENT_STREAMS`.
- **Wrapper:** **free** — `http2-wrapper`'s `Agent` is built for multiplexing; it dedups concurrent
  `getSession` and relies on Node's post-SETTINGS queue. This is the cleanest win for the library path:
  we write nothing.

## 7. Lifecycle & resilience — GOAWAY / RST / early-close (Phase 5)

**Problem:** real servers send GOAWAY and RST_STREAM; the client must not hang, cascade, or reuse a dead
session. This is the hardest-won correctness and where pooled h2 usually breaks.

- **Custom:** native to the own pool. `goaway` → `drainSession` (retire `DRAINING`, stop handing out,
  record `lastStreamId`); `close`/`error` → retire `CLOSED`; a reuse guard (`isReusable` = `!closed &&
  !destroyed`); an early-close guard in `send-request.ts` (RST CANCEL/NO_ERROR before headers → surface
  an error, never hang).
- **Wrapper — this is the biggest patch burden.** `http2-wrapper`'s pool only skips sessions whose
  `destroyed` flag is set, so a session that received a **GOAWAY but is not yet destroyed keeps being
  handed to new requests**, which then throw *"New streams cannot be created after receiving a GOAWAY."*
  The impl bolts on, in `session.ts`:
  1. `hookGoaway` — on `goaway`, mark the session **poisoned synchronously** and **defer `destroy()` to
     the next tick** (a synchronous destroy would swallow the in-flight stream's own error and hang the
     triggering request);
  2. `acquireFreshH2Session` — at acquire time, if the pool returns a poisoned session, destroy it and
     ask again (depth-bounded to 5).

  The early-close guard in `transport.ts` is the same idea as the custom one.

**Takeaway:** the library's pool is *not* GOAWAY-safe for a client; the correctness we most care about is
exactly the part we have to patch. The custom pool handles it as a first-class concern.

## 8. Client-semantics parity (Phase 7)

Both manually fill the axios/`res`-visible fields (`statusMessage`, `getUrl` via `protocol/host/path`,
`endStream:false` for GET/DELETE bodies, `maxHeaderListPairs` so many-header responses are accepted).
Equivalent effort on both sides; the wrapper impl does slightly more of it inline because it must dress a
raw stream up as an `IncomingMessage` for axios (a consequence of §4).

## 9. Proxy — CONNECT tunnel + SOCKS (Phase 8)

**Problem:** route h2 through forward proxies via CONNECT and reuse the tunnel.

- **Custom:** own `http2-proxy.ts` — `connectThroughProxy` does CONNECT (with Basic auth) for
  HTTP/HTTPS proxies and `SocksClient` for **SOCKS 4/4a/5**, returns a raw tunnel socket, then layers
  origin TLS (ALPN h2) + `http2.connect`. One implementation covers every proxy kind.
- **Wrapper:** **`http2-wrapper` provides HTTP/HTTPS proxy tunneling** via `proxies.Http2OverHttp` and
  `Http2OverHttps` — used directly. **But the library has no SOCKS support**, so the impl **patches** by
  subclassing `Http2OverHttp` and overriding `_getProxyStream` to open the tunnel with `socks-proxy-agent`.
  Every proxy agent is also wrapped in `withSocketGuard`.

**What the library gives us:** HTTP/HTTPS proxy tunnels. **What it doesn't:** SOCKS (patched in), and
cleartext (see §10).

## 10. Cleartext HTTP/2 — h2c (feature gap)

**The clearest functional difference.**

- **Custom:** supports **h2c prior knowledge**. On an `http://` URL with HTTP/2 selected, it speaks HTTP/2
  directly over the cleartext socket (`http2.connect` on an `http:` authority — the connection preface,
  RFC 7540 §3.4). Verified end-to-end (desktop and CLI) against the testbed's h2c server.
- **Wrapper:** **does not support h2c at all.** `alpn.ts` returns HTTP/1.1 for any cleartext URL
  ("cleartext URL; HTTP/2 requires TLS"), and the proxy path returns HTTP/1.1 for cleartext
  ("HTTP/2 requires TLS"). ALPN requires TLS, and the impl has no prior-knowledge path.

If h2c (gRPC-style cleartext, internal services, local dev servers) matters, only the custom transport
delivers it.

## 11. IPv6 literal hosts

- **Custom:** `buildTlsConnectOptions` strips the `[...]` brackets from host and servername so the cert's
  IP SAN check passes — handled in the TLS-option builder for every connection.
- **Wrapper:** **patched** in `select-transport.ts`: `http2-wrapper` *couples origin and servername* and
  throws *"Origin [::1] differs from servername ::1"* if you override `servername`, so the impl injects a
  custom `checkServerIdentity` that strips brackets. A workaround specific to the library's coupling.

## 12. Timing, streaming, cookies, redirects (Phase 9)

Both make `responseTime` reflect body-complete, stream request/response bodies, and keep cookies and
cross-protocol redirects working. The wrapper impl inherits some of this from axios's native flow (because
it integrates at `config.transport`, axios's redirect/cookie/decompress interceptors still run); the
custom impl guarantees the same via the interceptors that wrap its adapter. No material difference in
capability.

## 13. `bru.sendRequest` + CLI (Phases 10–11)

- **Custom:** scripting (`bru.sendRequest`) and the **CLI (`bru run`) are wired** — the CLI shares the
  same `bruno-requests` core (one pool, one resolver), with `--http-version`/`--http2` flags, h2 over
  TLS, **h2c over cleartext**, and **h2 through an authenticated proxy**, all verified against the
  testbed via the real `bru run`.
- **Wrapper:** targets the same surfaces; CLI parity depends on that repo's wiring.

---

## What `http2-wrapper` gives us for free vs. what we patch

| Concern | Library provides | We still patch / it can't do |
|---|---|---|
| ALPN probe + cache | ✅ `auto.resolveProtocol` / `auto.protocolCache` | Coupled to its private cache-key format; key ignores TLS identity |
| Session pool + reuse | ✅ `Agent.getSession` | GOAWAY'd sessions still handed out → **poison + deferred-destroy + acquire-retry patch** |
| Multiplex readiness | ✅ (built for it) | — (the clean win) |
| HTTP/HTTPS proxy tunnel | ✅ `proxies.Http2OverHttp/Https` | — |
| SOCKS proxy | ❌ | **Subclass `Http2OverHttp` + `socks-proxy-agent`** |
| `ClientRequest` request object | ✅ (exists) | **Unusable** — triggers axios `setKeepAlive()`; we drive the raw stream instead |
| Node-22 stuck TLS socket | ❌ | **`withSocketGuard` on every agent** |
| IPv6 literal servername | ❌ (actively fights it) | **`checkServerIdentity` override workaround** |
| Cleartext h2c | ❌ | **Not supported at all** |
| Header translation | ❌ (bypassed) | Hand-rolled (same as custom) |

Net: the library meaningfully saves us the ALPN probe/cache and the base pool/multiplex machinery. It
does **not** save us the parts that are hardest and most client-specific — GOAWAY safety, SOCKS, cleartext
h2c, IPv6, and the request object itself — all of which we write or patch anyway, while taking on a
dependency and a coupling to its internals.

## Test coverage & parity

The custom transport's unit suite (**10 files / 118 cases**) was **ported from `http2-wrapper`'s own test
suite** — the pool tests from its `agent.js`, transport tests from `request.js`/`response.js`/`headers.js`,
the resolver tests from `auto.js`, and the proxy tests from `proxies.js` (see the "Parity test checklist"
in `docs/http2-build-plan.md`). The ClientRequest-shim tests were intentionally not ported (we don't use
that layer). This means **the behaviors `http2-wrapper` is battle-tested for are asserted against our
code**, so moving off the library does not move us off its guarantees — we kept the guarantees and dropped
the dependency. On top of that, the custom suite adds cases the library has no reason to cover: h2c prior
knowledge, per-request/collection/app version precedence, and the Bruno-specific adapter/response shaping.
The wrapper impl has its own **94-case** suite (including a `lab-server` integration spec).

## Dependency & maintenance risk

`http2-wrapper` is not an independently-governed, general-purpose HTTP/2 library — it is effectively the
**HTTP/2 layer of [`got`](https://github.com/sindresorhus/got)**, written by a `got` maintainer
(szmarczak) to give `got` an HTTP/2 client behind the familiar `https`/`http.request` API. Two
consequences matter for us:

- **Its adoption is mostly transitive, via `got`.** The large npm download counts come overwhelmingly
  from `got` pulling it in as a dependency, not from projects choosing `http2-wrapper` directly for an
  interactive API client. "Popular, battle-tested package" is misleading here — it largely measures
  `got`'s popularity, not real-world exercise of the exact surface *we* lean on.
- **Its roadmap follows `got`, not us.** Releases are tuned for `got`'s needs and `got`'s request model
  — including the `ClientRequest`/`https`-style API we already **can't** use. A change that is perfectly
  correct for `got` can silently break the workarounds we depend on: the GOAWAY poison / deferred-destroy
  patch, the bypass of its `ClientRequest`, the reconstruction of its **private** ALPN cache-key format,
  and the IPv6 origin/servername coupling workaround all reach into behavior the library never promised
  us. Every version bump becomes an audit of those seams.

So the dependency insulates us less than it appears: we carry the patches **and** the upgrade risk, on a
library whose direction is set by a different product. The custom transport has neither — its surface is
ours, pinned to `node:http2` (a stable platform API), not to another product's release cadence.

## Recommendation

**Ship the custom transport**, because:

1. **Feature superset.** It does everything the wrapper impl does **plus** cleartext h2c and native SOCKS
   — with no capability we'd lose.
2. **The correctness-critical parts are native, not bolted on.** GOAWAY/RST lifecycle is a first-class
   concern in our pool rather than a poison-flag race worked around a black-box pool.
3. **No dependency, no internal coupling.** We don't track `http2-wrapper` releases, we don't reconstruct
   its private ALPN-cache key, and we don't fight its origin/servername coupling. The wrapper path's 698
   LOC are largely those workarounds, so it doesn't actually hand maintenance to a third party.
4. **Equal (or better) tested.** Its suite is ported from `http2-wrapper`'s, so the library's guarantees
   are preserved, with extra coverage for our own features.
5. **No third-party release risk.** `http2-wrapper` is `got`'s HTTP/2 layer; its direction tracks `got`,
   not an interactive API client, so a future release tuned for `got` could break our patches. The custom
   transport depends only on Node's stable `node:http2`.

The honest cost is ~500 more lines of first-party code and the usual "we own the transport" burden. Given
that the wrapper path already forces us to own the request object, the GOAWAY handling, SOCKS, cleartext,
and IPv6 anyway, that burden is smaller in practice than the LOC gap suggests — and it buys a cleaner,
dependency-free, feature-complete transport.

> Scope note: the only known non-goal shared by both is **cleartext h2c *through a forward proxy*** (both
> keep proxied cleartext on HTTP/1.1). Direct cleartext h2c is custom-only. Transparent retry of
> GOAWAY-refused streams is deferred in the custom impl (prototype built and reverted; see Phase 12).
