# HTTP/2 (custom transport) — from-scratch build plan

Bruno is an API **client**. Goal: add first-class HTTP/2 **without** depending on `http2-wrapper`,
by owning session pooling, ALPN negotiation, proxy CONNECT, and lifecycle ourselves on top of
Node's built-in `http2`. We build it in small phases. **Each phase is discussed before it is written**
(why it exists, what each piece does), ships with unit tests, and is verifiable from the **UI** against
the `HTTP2 QA` collection before the next phase starts.

## Ground rules
- Build on `node:http2` directly. No `http2-wrapper`.
- Every phase keeps the app runnable; a phase never leaves HTTP/1.1 worse than before.
- Three surfaces reach parity: **desktop app**, **`bru.sendRequest`** (scripting), **CLI** (`bru run`).
- Concurrency model: **one session per origin + a readiness gate**, no hand-built queue. A fresh-origin
  burst dedups on the synchronous `acquireSession` (first caller connects + pools, rest reuse), waits on
  the session's `ready` promise (peer SETTINGS), then relies on Node's own post-SETTINGS stream queue for
  `maxConcurrentStreams`. No multi-session packing (h2 is one connection per origin, like browsers).
- Non-goals (documented, not built): TLS session-resumption cache, ORIGIN-frame multi-origin
  coverage, `maxSessions`/`maxFreeSessions` caps. These are optimizations an API client does not need.
- Tests: **Jest unit specs per module** are the per-phase gate. Real-network/UI **e2e is deferred** —
  validated manually from the UI against the testbed each phase (the `HTTP2 QA` collection), with an
  automated pass revisited at the Phase 12 final gate.

## Where code will live
- `packages/bruno-requests/src/utils/http2/` — `connect-tls.ts`, `headers.ts`, `session-pool.ts`,
  `transport.ts`, `index.ts` (the transport-agnostic core).
- `packages/bruno-electron/src/ipc/network/` — `http2-resolver.js` (ALPN), `http2-proxy.js` (CONNECT),
  `http2-transport.js` (version decision + wiring), plus `axios-instance.js` / `index.js` integration.
- `packages/bruno-cli/src/utils/http2.js` — CLI wiring.
- Preference: `httpVersion` = `auto | http1 | http2`.

---

## Phase 0 — Test harness  *(no product code)*
**Why:** every later phase needs a fast, deterministic h2/h1 server to test against, in-process, with
no app or ports fuss. Build this first so each phase lands with tests.
**Build:** `packages/bruno-requests/src/utils/http2/__tests__/helpers/h2-server.ts` — spins a
`http2.createSecureServer` (ALPN h2+h1), a `https` h1-only server, self-signed certs in-memory, with
knobs for: `maxConcurrentStreams`, GOAWAY, RST(code, when), slow/drip, header count/size, trailers.
Plus a tiny h2 client helper for assertions.
**Tests:** a smoke spec that boots the harness and asserts h2 + h1 both answer.
**UI check:** none (harness only).
**Commit:** `test(http2): add in-process h2/h1 test harness`

## Phase 1 — HTTP-version preference + decision seam
**Why:** users must choose the version, and we need the single integration point where h2 plugs into
the request pipeline — introduced with **zero behavior change** (default routes HTTP/1.1).
**Decisions (locked):**
- Preference enum `auto | http1.1 | http2`, **default `http1.1`** (h2 is opt-in). The string is
  `http1.1`, not `http1`, everywhere (pref, resolver, later per-request inherit). Dropdown labels:
  Auto / HTTP/1.1 / HTTP/2.
- **Global preference only** for now. Precedence lives in one helper `resolveHttpVersionMode(request,
  globalPref)` that already checks `request.settings.httpVersion` first (undefined until the
  per-request phase), so request-level override is additive later.
- Seam signature: `applyHttp2Transport({ config, mode, agentOptions, timeline })`.
**Build:**
- `bruno-electron/src/store/preferences.js`: default `request.httpVersion: 'http1.1'`; Yup
  `httpVersion: Yup.string().oneOf(['auto','http1.1','http2'])`; `preferencesUtil.getHttpVersion()`.
- `bruno-app/.../Preferences/General`: the dropdown.
- `bruno-electron/.../ipc/network/http2-transport.js`: `resolveHttpVersionMode()` + `applyHttp2Transport()`
  **stub** (reads mode, pushes a timeline line, attaches no transport); `canUseHttp2(mode)`.
- Wire the seam into `axios-instance.js` right after `setupProxyAgents`.
**Tests:** unit — `getHttpVersion()` default `'http1.1'`; `resolveHttpVersionMode` precedence; stub
leaves `config.transport` undefined for every mode.
**UI check:** Preferences shows the selector; flipping it changes nothing functionally (all HTTP/1.1);
timeline shows the selected-version line.
**Commit:** `feat(http2): http-version preference and request-pipeline seam`

## Phase 2 — TLS connect options + ALPN resolver (auto mode)
**Why:** HTTP/2 selection is an ALPN decision made **before** the request (axios's native h2 is
prior-knowledge only and can't fall back). Get TLS options + one ALPN probe right first.
**Build:** `connect-tls.ts` (`buildTlsConnectOptions`: ca/cert/key/rejectUnauthorized/servername,
IPv6 bracket-strip, custom `*.localhost` lookup). `http2-resolver.js` (`probeAlpn` over one TLS socket
offering `h2,http/1.1`; per-origin protocol cache). Wire into the decision — auto probes and logs, but
still routes HTTP/1.1 (no transport yet).
**Tests:** `resolver.spec.ts` (h2 negotiated, h1-only falls back, IPv6 literal, cache hit, timeout).
**UI check:** **01 Protocol negotiation** — timeline shows offered/accepted ALPN; requests still succeed.
**Commit:** `feat(http2): TLS options + ALPN resolver with protocol cache`

## Phase 3 — Header translation + minimal single-session transport
**Why:** prove one real h2 request end-to-end before adding pooling. Simplest correct path first.
**Build (bruno-requests, pure + harness-tested):**
- `headers.ts` — `toHttp2Headers(method, url, headers)` (pseudo-headers `:method`/`:scheme`/`:authority`/`:path`;
  lower-case names; drop connection-specific `connection`/`keep-alive`/`proxy-connection`/`transfer-encoding`/`upgrade`
  and fold `Host`→`:authority`; `:path` = pathname+search only) and `fromHttp2Headers(h2headers)` → `{ status, headers }`.
- `transport.ts` — `sendHttp2Request(config)` opens **one** `http2.connect` session per request, one stream,
  writes the body honoring GET/DELETE `endStream` (no write-after-end), **buffers** the full response, maps errors,
  and **closes the session** in `finally`. Returns a normalized `{ status, headers, data }` — no axios types.
**Build (bruno-electron, thin wiring):**
- `http2-adapter.js` — axios custom adapter bridging `config` ↔ `sendHttp2Request`, shaping an axios response back
  (`statusText` from `http.STATUS_CODES`; `responseType` honored minimally — `arraybuffer`→Buffer else decode to
  string and let `transformResponse` parse; axios-shaped errors with `response` when headers arrived).
- `applyHttp2Transport` sets `config.adapter = http2Adapter` when `versionDecision.httpVersion === 2` (replaces the
  "attaches in a later step" log). `:path` comes straight from `config.url` — Bruno bakes the full query string into
  the URL upstream (query params + query-param auth reassign `request.url`); axios config carries no `.params`/`baseURL`,
  so no `buildFullPath`/`paramsSerializer` replication.
**Deferred to Phase 9:** *true incremental* streaming **response** bodies (SSE backpressure) only.
**Streaming request bodies + multipart/FormData are now done** (pulled forward): `send-request` pipes a
Readable body (form-data stream / `fs.createReadStream`) instead of writing string/Buffer only.
Also fixed here: strip `http2-settings` (Node rejects it), and map a `Host` header override to `:authority`.
**Note:** Bruno's pipeline is stream-first (it forces `responseType: 'stream'` and reads `response.data`
via `promisifyStream`), so the adapter must return a Node Readable. We buffer the full body and wrap it
in a `PassThrough` (emit once, end) — correct for normal responses; real-time incremental SSE is Phase 9.
**Tests:** `headers.spec.ts` (translation, stripping, lower-case, `:authority`, `:path`, `:status` split).
`transport.spec.ts` (GET/POST → 200, protocol 2.0, body echo, session closed; h1-only path never reaches h2).
Electron: adapter sets `config.adapter` only when h2 and shapes the response (transport mocked).
**UI check:** **02 Methods** basic GET/POST to the dual server over h2.
**Commit:** `feat(http2): h1→h2 header translation + minimal transport`

## Phase 4 — Session pool (reuse, keying, idle)
**Why:** one connection per request wastes the whole point of h2 (multiplexing) and leaks sockets.
Pool by origin + TLS identity + mode, reuse, and close when idle.
**Build:** `session-pool.ts` — `SessionEntry` (state `CONNECTING/ACTIVE`, `activeStreams`, idle timer),
`acquireSession`/`getSessionKey`/`closeAllSessions`. Transport switches to the pool.
**Tests:** `session-pool.spec.ts` — reuse same key; distinct per origin/TLS identity; idle close;
`closeAllSessions`. (Parity: wrapper `agent.js` #4,5,6,7,13,23,43.)
**UI check:** **11 Connection reuse** — second request reuses the session.
**Commit:** `feat(http2): pooled h2 sessions keyed by origin + TLS identity`

## Phase 5 — Stream lifecycle & resilience
**Why:** real servers send GOAWAY and RST_STREAM; a client must not hang, cascade, or reuse a dead
session. This is the hardest-won correctness and where hand-rolled pools usually break.
**Build:** `goaway` → retire `DRAINING` + record `lastStreamId`; `close`/`error` → retire `CLOSED`;
early-close guard in `transport.ts` (RST CANCEL/NO_ERROR before headers → surface an error, don't hang);
reuse guard (never hand out a session Node has `closed`/`destroyed`); non-negative stream accounting.
**Tests:** `session-pool.spec.ts` (GOAWAY → fresh session; destroyed/closed not reused; count never < 0),
`transport.spec.ts` (early-close errors, not hang). (Parity: wrapper `agent.js` #11,12,29,31,45,47,48.)
**UI check:** **12 Resilience** + **16 Stream reset** — expected *errors*, zero hangs.
**Commit:** `feat(http2): session lifecycle — GOAWAY/RST/early-close/stale-session guards`

## Phase 6 — Multiplexing & readiness gating
**Why:** opening streams before the peer's SETTINGS arrive makes Node send them optimistically and the
server REFUSEs the excess; we must gate the first burst on `remoteSettings` so Node queues them.
**Build:** `whenReady()` (resolves on `remoteSettings`) + pre-warm in `applyHttp2Transport`; concurrent
acquire dedup (one session for a fresh-origin burst).
**Tests:** `session-pool.spec.ts` — N concurrent → one session; **queue past MAX_CONCURRENT_STREAMS**,
none refused; free-on-remoteSettings. (Parity: wrapper `agent.js` #14–20,42.)
**UI check:** **11** `MAX_CONCURRENT_STREAMS=2 queues extra streams`.
**Commit:** `feat(http2): readiness gating + multiplex stream queuing`

## Phase 7 — Client-semantics details
**Why:** parity with the HTTP/1.1 path so scripts/tests behave identically.
**Build:** `endStream:false` so GET/DELETE bodies send; set `protocol/host/path` on the response
(`res.getUrl()`); fill `statusMessage` from the status code (`res.getStatusText()`); raise
`maxHeaderListPairs` on connect (accept many-header responses); confirm connection-header + pseudo drop.
**Tests:** `transport.spec.ts` (GET/DELETE body, getUrl, statusText), many-header response accepted.
**UI check:** **04 Request headers**, **07 Responses**, **15 Scripting** `res API shape`.
**Commit:** `fix(http2): request/response client-semantics parity`

## Phase 8 — Proxy (CONNECT tunnel + reuse)
**Why:** enterprise users route through proxies; h2 must tunnel via CONNECT and reuse the tunnel.
**Build:** `http2-proxy.js` (`connectThroughProxy`: CONNECT, Basic auth, ALPN over the tunnel);
`hasLiveSession` pool check so a second request to the same origin reuses the session instead of
opening a new tunnel; integrate both direct and proxied paths in `applyHttp2Transport`.
**Tests:** `proxy.spec.ts` — tunnel to h2 via HTTP/HTTPS proxy; 403/auth; unreachable; insecure;
**second request reuses the tunnel**. (Parity: wrapper `proxies.js`.)
**UI check:** **14 Proxy**.
**Commit:** `feat(http2): proxy CONNECT tunnel with session reuse`

## Phase 9 — Response timing, streaming & remaining body families
**Why:** `responseTime` must reflect the full response (h2 resolves at headers while the body streams);
cookies and redirects must work across h2/h1; and the body families deferred from Phase 3 land here.
**Build:** measure `responseTime` to body-complete on **both** send paths (single-request + runner);
verify cookies and cross-protocol redirects (h2→h1-only and back); **streaming request bodies**,
**streaming response bodies** (`responseType: 'stream'`, drip timing), and **multipart/FormData** request
bodies over h2 (deferred from Phase 3).
**Tests:** timing basis in `transport.spec.ts`; redirect/cookie e2e.
**UI check:** **08 Streaming** (drip timing), **09 Cookies**, **10 Redirects**.
**Commit:** `fix(http2): responseTime to body-complete; cookies/redirects over h2`

## Phase 10 — `bru.sendRequest` over HTTP/2
**Why:** scripted requests use a separate axios instance; they must get the same h2 treatment.
**Build:** `createScriptedRequestPreparer` — resolve version + attach transport for the scripting axios
instance; thread the h2 preference.
**Tests:** scripting unit + e2e.
**UI check:** **15 Scripting API** `bru.sendRequest over h2`.
**Commit:** `feat(http2): bru.sendRequest over HTTP/2`

## Phase 11 — CLI (`bru run`) over HTTP/2
**Why:** CLI parity with the app for CI/automation.
**Build:** `bruno-cli/src/utils/http2.js` + proxy-util + a `--http2`/preference flag; reuse the same
`bruno-requests` core (no duplicate pool).
**Tests:** CLI unit + a scripted run of the collection.
**UI/CLI check:** `bru run "HTTP2 QA" --env "HTTP2 forced"` matches the app's results.
**Commit:** `feat(http2): HTTP/2 support in the CLI`

## Phase 12 — Known findings, non-goals, final gate
**Why:** close out and lock the suite.
**Build:** decide `Session destroyed mid-response` truncation (fix via `rstCode`-at-end detection, or
document); **decide transparent retry of GOAWAY-refused streams** (see below); write the non-goals note.
**Tests:** full `npm test --workspace=packages/bruno-requests` green; QA collection in all 3 envs with
only expected/manual residuals.
**Commit / PR:** assemble the phase commits; link this plan.

### Decision item — transparent retry of refused streams (deferred here from Phase 5)
RFC 9113 §8.7: a stream whose id is above a GOAWAY's Last-Stream-ID was never processed, so it is
safe to retry on a fresh connection. The testbed invites this: `12 ↳ verify: GOAWAY refusing this
stream` accepts either a clean error **or** a transparent retry-to-success ("Bruno retried
transparently — nice"). The design, if we adopt it:
- Retry **only** when the session received a **GOAWAY** (the connection is gone → pool retires it →
  retry lands on a new session). A **bare RST_STREAM REFUSED_STREAM on a live session is terminal** —
  `12 ↳ verify: RST_STREAM REFUSED_STREAM` expects `ok === false` and the same connection id next, so
  it must **not** be retried. Both surface as `NGHTTP2_REFUSED_STREAM`; distinguish by a per-session
  `goawayReceived` flag.
- Retry **re-sendable bodies only** (no consumed request-body stream) and **cap** the attempts (e.g. 2)
  so a persistently-refusing peer can't loop.
- A prototype of exactly this was built and reverted on 2026-10-21 pending this decision; re-apply from
  the session transcript if adopted.

---

## Phase 3.5 (deferred) — Per-request HTTP version override
**Why:** a request can pin its own version regardless of the global default — Bruno's standard
per-request `settings` + `inherit` pattern (mirrors `settings.timeout`). Slotted **after Phase 3**
so the toggle actually switches something observable.
**Build:** `.bru` `settings { httpVersion: inherit }` (`inherit | auto | http1.1 | http2`) — parse in
`bruno-lang` `bruToJson` (serialize already generic); add to `bruno-schema` settings; dropdown in the
request **Settings** tab; resolution via the existing `resolveHttpVersionMode` helper (request wins
unless `inherit`); same in `bruno-cli` (app↔CLI parity). Backward-compat: old Bruno ignores the
unknown key and round-trips it (safe).
**Tests:** DSL round-trip, schema, precedence (request vs global), CLI parity.
**UI check:** set a single request to HTTP/2 while the global default stays HTTP/1.1.
**Commit:** `feat(http2): per-request HTTP version override (settings.httpVersion)`

## Parity test checklist (ported from http2-wrapper's suite, minus its ClientRequest-shim tests)
- **Pool** (`agent.js`): key string/URL; per origin/identity; servername mismatch; idle timeout;
  destroyed/closed not reused; overloading→queue; free-on-maxConcurrent-update; new-when-none-free;
  graceful close; no negative count; throws pre-SETTINGS; connect error; request() error; destroy.
- **Transport** (`request.js`/`response.js`/`headers.js`): invalid/http protocol; GET/DELETE body;
  response-after-write; server-abort/early-close error; connection headers; `:authority`; IPv6
  servername; statusText; trailers; pause/resume/highWaterMark; end/close/aborted; pseudo/te/invalid.
- **Resolver** (`auto.js`): h2; h2-via-IP/IPv6; h1 fallback; cache; errors; invalid ALPN; timeout;
  new socket on early server close.
- **Proxy** (`proxies.js`): h2 via HTTP/HTTPS proxy; 403/auth; unreachable; insecure; tunnel reuse.
- **Non-goals (not ported):** TLS-session cache; covered/authoritative sessions; maxSessions caps;
  empty-session management; HTTP/1.1 TLS-socket reuse.
