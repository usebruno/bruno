#!/usr/bin/env node
/**
 * Bruno HTTP/2 testbed — one process, many listeners, zero dependencies (Node >= 18).
 *
 *   dual      https://localhost:8443  h2 + http/1.1 via ALPN (the "normal" modern server)
 *   h2only    https://localhost:8444  ALPN h2 only — an HTTP/1.1 client fails the handshake
 *   h1only    https://localhost:8445  ALPN http/1.1 only — never speaks h2
 *   mtls      https://localhost:8446  h2 + h1, client certificate REQUIRED (signed by certs/ca.crt)
 *   limited   https://localhost:8447  h2 only, SETTINGS_MAX_CONCURRENT_STREAMS=2, small windows
 *   badcert   https://localhost:8448  h2 + h1, self-signed cert for "wrong.example"
 *   mtlsnocert https://localhost:8449 same as mtls; the collection has NO client cert for this port
 *   plain     http://localhost:8091   cleartext HTTP/1.1
 *   h2c       http://localhost:8090   cleartext HTTP/2 prior knowledge ONLY (no HTTP/1.1)
 *   proxy     http://localhost:3128   forward proxy (CONNECT + absolute-URI), auth optional
 *   proxyauth http://localhost:3129   forward proxy, Basic auth REQUIRED (bruno / proxypass)
 *
 * Every HTTP server answers the same routes (GET / lists them). Every response carries
 * x-server, x-protocol, x-connection-id and x-stream-id so reuse/multiplexing is observable.
 *
 *   node server.js            # all listeners
 *   PORT_DUAL=9443 node server.js   # move a listener (PORT_<NAME>)
 *   QUIET=1 node server.js    # no per-request log
 */
'use strict';

const http = require('node:http');
const https = require('node:https');
const http2 = require('node:http2');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const QUIET = process.env.QUIET === '1';
const CERT_DIR = path.join(__dirname, 'certs');
const read = (f) => fs.readFileSync(path.join(CERT_DIR, f));

if (!fs.existsSync(path.join(CERT_DIR, 'server.crt'))) {
  console.error('certs/ missing — run ./gen-certs.sh first');
  process.exit(1);
}

const TLS = { key: read('server.key'), cert: read('server.crt'), ca: read('ca.crt') };
const DEFAULT_PORTS = {
  dual: 8443, h2only: 8444, h1only: 8445, mtls: 8446, limited: 8447, badcert: 8448, mtlsnocert: 8449,
  plain: 8091, h2c: 8090, proxy: 3128, proxyauth: 3129, socks: 1080, socksauth: 1081
};
// Any port can be moved with PORT_<NAME>=..., e.g. PORT_H2C=9000 (update the collection environment to match).
const PORTS = Object.fromEntries(Object.entries(DEFAULT_PORTS).map(([k, v]) => [k, Number(process.env[`PORT_${k.toUpperCase()}`]) || v]));
const ORIGINS = {
  dual: `https://localhost:${PORTS.dual}`,
  h2only: `https://localhost:${PORTS.h2only}`,
  h1only: `https://localhost:${PORTS.h1only}`,
  mtls: `https://localhost:${PORTS.mtls}`,
  limited: `https://localhost:${PORTS.limited}`,
  badcert: `https://localhost:${PORTS.badcert}`,
  plain: `http://localhost:${PORTS.plain}`,
  h2c: `http://localhost:${PORTS.h2c}`
};

let nextConnId = 1;
const connMeta = new WeakMap(); // h2 session or h1 socket -> { id, requests, openedAt }
const stats = { connections: 0, sessions: 0, goawaysSent: 0, requests: 0, proxyTunnels: 0, proxyForwards: 0, proxyAuthSeen: 0, proxyRejected: 0, socksConnections: 0 };
const proxyLog = []; // last 50 proxy events

function metaFor(key) {
  let m = connMeta.get(key);
  if (!m) {
    m = { id: nextConnId++, requests: 0, openedAt: new Date().toISOString() };
    connMeta.set(key, m);
  }
  return m;
}

function connectionInfo(req) {
  const isH2 = req.httpVersionMajor === 2;
  const socket = isH2 ? req.stream.session.socket : req.socket;
  const m = metaFor(isH2 ? req.stream.session : req.socket);
  return {
    id: m.id,
    kind: isH2 ? 'h2-session' : 'h1-socket',
    streamId: isH2 ? req.stream.id : null,
    requestsOnConnection: m.requests,
    openedAt: m.openedAt,
    clientPort: socket ? socket.remotePort : null,
    clientAddress: socket ? socket.remoteAddress : null
  };
}

function tlsInfo(req) {
  const socket = req.httpVersionMajor === 2 ? req.stream.session.socket : req.socket;
  if (!socket || !socket.encrypted) return null;
  const peer = typeof socket.getPeerCertificate === 'function' ? socket.getPeerCertificate() : null;
  const cipher = socket.getCipher ? socket.getCipher() : null;
  return {
    alpn: socket.alpnProtocol || null,
    protocol: socket.getProtocol ? socket.getProtocol() : null,
    cipher: cipher ? cipher.name : null,
    servername: socket.servername || null,
    clientCertificate: peer && peer.subject ? { subject: peer.subject.CN, issuer: peer.issuer && peer.issuer.CN, authorized: socket.authorized } : null
  };
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

function readBody(req, limit = 512 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error('body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
    req.on('aborted', () => reject(new Error('client aborted')));
  });
}

/** Request headers without pseudo-headers, plus the raw (ordered, original-case on h1) list. */
function headerView(req) {
  const headers = {};
  const pseudo = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.startsWith(':')) pseudo[k] = v;
    else headers[k] = v;
  }
  const raw = [];
  for (let i = 0; i < req.rawHeaders.length; i += 2) raw.push([req.rawHeaders[i], req.rawHeaders[i + 1]]);
  return { headers, pseudo, raw };
}

function parseMultipart(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return null;
  const boundary = Buffer.from(`--${m[1] || m[2]}`);
  const parts = [];
  let start = body.indexOf(boundary);
  while (start !== -1) {
    start += boundary.length;
    if (body.slice(start, start + 2).toString() === '--') break;
    start += 2; // CRLF
    const next = body.indexOf(boundary, start);
    if (next === -1) break;
    const part = body.slice(start, next - 2);
    const sep = part.indexOf('\r\n\r\n');
    const headText = part.slice(0, sep).toString();
    const content = part.slice(sep + 4);
    const headers = {};
    headText.split('\r\n').forEach((line) => {
      const i = line.indexOf(':');
      if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    const disp = headers['content-disposition'] || '';
    const name = (/name="([^"]*)"/.exec(disp) || [])[1];
    const filename = (/filename="([^"]*)"/.exec(disp) || [])[1];
    parts.push({
      name,
      filename: filename || null,
      contentType: headers['content-type'] || null,
      size: content.length,
      sha256: sha256(content),
      value: filename ? undefined : content.toString('utf8').slice(0, 2000)
    });
    start = next;
  }
  return parts;
}

function describeBody(buf, contentType) {
  const ct = (contentType || '').toLowerCase();
  const out = { size: buf.length, sha256: sha256(buf), contentType: contentType || null };
  if (ct.includes('multipart/form-data')) out.multipart = parseMultipart(buf, contentType);
  else if (ct.includes('application/x-www-form-urlencoded')) out.form = Object.fromEntries(new URLSearchParams(buf.toString('utf8')));
  else if (ct.includes('json')) {
    try { out.json = JSON.parse(buf.toString('utf8')); } catch (e) { out.jsonError = e.message; }
  }
  if (buf.length && !out.multipart) {
    const text = buf.toString('utf8');
    out.text = text.length > 4096 ? `${text.slice(0, 4096)}…(${text.length - 4096} more chars)` : text;
  }
  return out;
}

function deterministicBytes(n) {
  const buf = Buffer.allocUnsafe(n);
  for (let i = 0; i < n; i++) buf[i] = (i * 31 + 7) & 0xff;
  return buf;
}

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

const digestNonces = new Set();
const oauthTokens = new Map(); // token -> { clientId, issuedAt }
const OAUTH_CLIENT = { id: 'bruno-client', secret: 'bruno-secret' };

function parseAuthParams(s) {
  const out = {};
  const re = /(\w+)=(?:"([^"]*)"|([^\s,]+))/g;
  let m;
  while ((m = re.exec(s))) out[m[1]] = m[2] !== undefined ? m[2] : m[3];
  return out;
}

const ROUTES_DOC = [
  ['ANY', '/echo, /anything/*', 'Echo method, path, query, headers (+raw), pseudo-headers, body (size/sha256/parsed), protocol, TLS, connection'],
  ['GET', '/status/:code', 'Respond with any status (100-199 rejected). 204/304 have no body. ?retryAfter=N'],
  ['GET', '/delay/:ms', 'Respond after ms'],
  ['GET', '/slow-headers/:ms', 'Send headers after ms, body immediately after'],
  ['GET', '/hang', 'Never respond (timeout / cancel tests)'],
  ['GET', '/bytes/:n', 'n deterministic bytes, x-sha256 header'],
  ['GET', '/large-json?items=N', 'Large JSON array'],
  ['GET', '/stream/:n', 'n newline-delimited JSON chunks'],
  ['GET', '/drip?chunks=&interval=&size=', 'Body trickled in chunks'],
  ['GET', '/sse?count=&interval=', 'Server-sent events (count=0 → endless)'],
  ['GET', '/gzip /deflate /br /identity', 'Compressed JSON with content-encoding'],
  ['GET', '/json /xml /html /text /png /binary /unicode /empty', 'Typed bodies'],
  ['GET', '/headers/response?count=&size=', 'Many response headers'],
  ['GET', '/headers/large-response?size=', 'One very large response header'],
  ['GET', '/headers/multi', 'Multi-valued response headers (set-cookie x3, x-multi)'],
  ['GET', '/cookies/set?k=v', 'Set cookies; /cookies echoes Cookie; /cookies/delete?name=; /cookies/set-and-redirect?k=v'],
  ['GET', '/redirect/:n', 'Relative redirect chain ending at /echo; /absolute-redirect/:n; /redirect-to?url=&status='],
  ['GET', '/basic-auth/:user/:pass', 'Basic auth'],
  ['GET', '/bearer?token=', 'Bearer auth'],
  ['GET', '/digest-auth/:user/:pass', 'Digest (MD5, qop=auth)'],
  ['GET', '/api-key?expected=', 'API key in x-api-key header or api_key query'],
  ['POST', '/oauth/token', 'OAuth2 client_credentials (bruno-client / bruno-secret); GET /oauth/protected'],
  ['GET', '/etag', 'ETag; If-None-Match → 304'],
  ['GET', '/early-hints', '103 Early Hints then 200'],
  ['GET', '/trailers', 'Response trailers (x-checksum, x-done)'],
  ['GET', '/push', 'h2 server push of /pushed.css + /pushed.js, then 200'],
  ['GET', '/goaway', 'Respond, then GOAWAY(NO_ERROR) the session (h1: Connection: close)'],
  ['GET', '/goaway-refuse', 'GOAWAY with lastStreamID below this stream — stream is refused, safe to retry'],
  ['GET', '/rst?code=&when=', 'RST_STREAM (REFUSED_STREAM|CANCEL|INTERNAL_ERROR|ENHANCE_YOUR_CALM|PROTOCOL_ERROR) when=before|mid'],
  ['GET', '/destroy-session', 'Abruptly destroy the session/socket'],
  ['GET', '/content-length-mismatch', 'content-length 100, body 5 bytes (malformed response)'],
  ['GET', '/session', 'This connection: id, stream ids, h2 settings'],
  ['GET', '/stats', 'Process-wide counters (connections, sessions, proxy tunnels…)'],
  ['POST', '/upload', 'Same as /echo, body-focused'],
  ['GET', '/', 'This list']
];

async function handle(req, res, serverName) {
  const started = Date.now();
  stats.requests++;
  const isH2 = req.httpVersionMajor === 2;
  const meta = metaFor(isH2 ? req.stream.session : req.socket);
  meta.requests++;
  const conn = connectionInfo(req);

  const authority = req.headers[':authority'] || req.headers.host;
  const scheme = req.headers[':scheme'] || (req.socket && req.socket.encrypted ? 'https' : 'http');
  const url = new URL(req.url, `${scheme}://${authority || 'localhost'}`);
  const p = url.pathname;
  const q = Object.fromEntries(url.searchParams);

  // Response headers identifying the server, protocol and connection on every route.
  const baseHeaders = {
    'x-server': serverName,
    'x-protocol': req.httpVersion,
    'x-connection-id': String(conn.id),
    'x-stream-id': conn.streamId == null ? 'n/a' : String(conn.streamId),
    'x-request-count-on-connection': String(conn.requestsOnConnection)
  };
  for (const [k, v] of Object.entries(baseHeaders)) res.setHeader(k, v);

  res.on('finish', () => {
    if (QUIET) return;
    const proto = isH2 ? `h2 s${conn.id}/#${conn.streamId}` : `h1 c${conn.id}`;
    console.log(`[${serverName.padEnd(10)}] ${proto.padEnd(14)} ${req.method.padEnd(7)} ${req.url.slice(0, 80).padEnd(50)} → ${res.statusCode} ${Date.now() - started}ms`);
  });

  const json = (status, obj, extra = {}) => {
    const body = Buffer.from(JSON.stringify(obj, null, 2));
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, ...extra });
    res.end(body);
  };

  const echoPayload = async () => {
    const body = await readBody(req);
    const hv = headerView(req);
    return {
      server: serverName,
      protocol: req.httpVersion,
      method: req.method,
      url: req.url,
      path: p,
      rawPath: req.url.split('?')[0],
      query: q,
      rawQuery: url.search,
      authority,
      scheme,
      headers: hv.headers,
      pseudoHeaders: hv.pseudo,
      rawHeaders: hv.raw,
      headerCount: hv.raw.length,
      body: describeBody(body, req.headers['content-type']),
      tls: tlsInfo(req),
      connection: conn
    };
  };

  try {
    // ----- echo -----
    if (p === '/echo' || p.startsWith('/anything') || p === '/upload') return json(200, await echoPayload());
    if (p === '/') return json(200, { server: serverName, protocol: req.httpVersion, origins: ORIGINS, routes: ROUTES_DOC.map(([m, r, d]) => `${m.padEnd(4)} ${r} — ${d}`) });
    if (p === '/stats') return json(200, { ...stats, proxyLog });

    // ----- connection introspection -----
    if (p === '/session') {
      const info = { server: serverName, protocol: req.httpVersion, connection: conn, tls: tlsInfo(req) };
      if (isH2) {
        const s = req.stream.session;
        info.h2 = { localSettings: s.localSettings, remoteSettings: s.remoteSettings, state: s.state };
      }
      return json(200, info);
    }

    // ----- status / timing -----
    let m;
    if ((m = /^\/status\/(\d{3})$/.exec(p))) {
      const code = Number(m[1]);
      if (code < 200) return json(400, { error: 'informational status codes are not final responses; use /early-hints' });
      const extra = {};
      if (q.retryAfter) extra['retry-after'] = q.retryAfter;
      if (code === 401) extra['www-authenticate'] = 'Basic realm="h2-testbed"';
      if ([301, 302, 303, 307, 308].includes(code)) extra.location = q.location || '/echo';
      if (code === 204 || code === 304) {
        res.writeHead(code, extra); return res.end();
      }
      return json(code, { status: code, server: serverName, protocol: req.httpVersion }, extra);
    }
    if ((m = /^\/delay\/(\d+)$/.exec(p))) {
      await new Promise((r) => setTimeout(r, Math.min(Number(m[1]), 120000)));
      return json(200, { delayedMs: Number(m[1]), protocol: req.httpVersion, connection: conn });
    }
    if ((m = /^\/slow-headers\/(\d+)$/.exec(p))) {
      await new Promise((r) => setTimeout(r, Math.min(Number(m[1]), 120000)));
      return json(200, { headersDelayedMs: Number(m[1]), protocol: req.httpVersion });
    }
    if (p === '/hang') return; // never answer; the client must time out or cancel

    // ----- sizes / streaming -----
    if ((m = /^\/bytes\/(\d+)$/.exec(p))) {
      const n = Math.min(Number(m[1]), 200 * 1024 * 1024);
      const buf = deterministicBytes(n);
      res.writeHead(200, { 'content-type': 'application/octet-stream', 'content-length': n, 'x-sha256': sha256(buf) });
      return res.end(buf);
    }
    if (p === '/large-json') {
      const items = Math.min(Number(q.items || 10000), 500000);
      const arr = Array.from({ length: items }, (_, i) => ({ id: i, name: `item-${i}`, tags: ['h2', 'bruno', 'qa'], nested: { even: i % 2 === 0, value: i * 1.5 } }));
      return json(200, { count: items, protocol: req.httpVersion, items: arr });
    }
    if ((m = /^\/stream\/(\d+)$/.exec(p))) {
      const n = Math.min(Number(m[1]), 10000);
      res.writeHead(200, { 'content-type': 'application/x-ndjson' });
      let i = 0;
      const tick = () => {
        if (i >= n) return res.end();
        res.write(`${JSON.stringify({ seq: i++, protocol: req.httpVersion, at: Date.now() })}\n`);
        setTimeout(tick, Number(q.interval || 10));
      };
      return tick();
    }
    if (p === '/drip') {
      const chunks = Number(q.chunks || 10);
      const interval = Number(q.interval || 200);
      const size = Number(q.size || 64);
      res.writeHead(200, { 'content-type': 'text/plain', 'content-length': chunks * size });
      let i = 0;
      const timer = setInterval(() => {
        if (res.destroyed || res.writableEnded) return clearInterval(timer);
        res.write(Buffer.alloc(size, 65 + (i % 26)));
        if (++i >= chunks) {
          clearInterval(timer); res.end();
        }
      }, interval);
      req.on('close', () => clearInterval(timer));
      return;
    }
    if (p === '/sse') {
      const count = Number(q.count ?? 5);
      const interval = Number(q.interval || 500);
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      let i = 0;
      const send = () => {
        i++;
        res.write(`id: ${i}\nevent: tick\ndata: ${JSON.stringify({ seq: i, protocol: req.httpVersion, at: new Date().toISOString() })}\n\n`);
        if (count && i >= count) {
          clearInterval(timer); res.end();
        }
      };
      const timer = setInterval(send, interval);
      req.on('close', () => clearInterval(timer));
      return;
    }

    // ----- encodings -----
    if (['/gzip', '/deflate', '/br', '/identity'].includes(p)) {
      const payload = Buffer.from(JSON.stringify({ encoding: p.slice(1), protocol: req.httpVersion, acceptEncoding: req.headers['accept-encoding'] || null, filler: 'bruno-h2 '.repeat(500) }));
      const enc = p.slice(1);
      const body = enc === 'gzip' ? zlib.gzipSync(payload) : enc === 'deflate' ? zlib.deflateSync(payload) : enc === 'br' ? zlib.brotliCompressSync(payload) : payload;
      const h = { 'content-type': 'application/json', 'content-length': body.length, 'x-uncompressed-length': payload.length };
      if (enc !== 'identity') h['content-encoding'] = enc;
      res.writeHead(200, h);
      return res.end(body);
    }

    // ----- typed bodies -----
    if (p === '/json') return json(200, { ok: true, protocol: req.httpVersion, number: 42, float: 3.14, bool: true, nil: null, arr: [1, 'two', { three: 3 }], unicode: 'héllo 世界 🐶' });
    if (p === '/xml') {
      res.writeHead(200, { 'content-type': 'application/xml' }); return res.end(`<?xml version="1.0"?><root><protocol>${req.httpVersion}</protocol><item id="1">Bruno</item></root>`);
    }
    if (p === '/html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(`<!doctype html><html><body><h1>HTTP ${req.httpVersion}</h1></body></html>`);
    }
    if (p === '/text') {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' }); return res.end(`plain text over HTTP/${req.httpVersion}`);
    }
    if (p === '/png') {
      res.writeHead(200, { 'content-type': 'image/png', 'content-length': PNG.length }); return res.end(PNG);
    }
    if (p === '/binary') {
      const b = deterministicBytes(4096); res.writeHead(200, { 'content-type': 'application/octet-stream', 'x-sha256': sha256(b) }); return res.end(b);
    }
    if (p === '/unicode') return json(200, { protocol: req.httpVersion, text: 'Ünïcödé — 日本語 — العربية — עברית — emoji 🐶🚀✅', rtl: 'مرحبا', combining: 'é' });
    if (p === '/empty') {
      res.writeHead(200, { 'content-length': 0 }); return res.end();
    }

    // ----- headers -----
    if (p === '/headers/response') {
      const count = Math.min(Number(q.count || 100), 2000);
      const size = Number(q.size || 16);
      const h = {};
      for (let i = 0; i < count; i++) h[`x-h-${i}`] = 'v'.repeat(size);
      return json(200, { count, size, protocol: req.httpVersion }, h);
    }
    if (p === '/headers/large-response') {
      const size = Math.min(Number(q.size || 8000), 1024 * 1024);
      return json(200, { size, protocol: req.httpVersion }, { 'x-large': 'L'.repeat(size) });
    }
    if (p === '/headers/multi') {
      res.setHeader('set-cookie', ['multi_a=1; Path=/', 'multi_b=2; Path=/; HttpOnly', 'multi_c=3; Path=/; SameSite=Lax']);
      res.setHeader('x-multi', ['first', 'second', 'third']);
      res.setHeader('cache-control', 'no-cache, no-store');
      return json(200, { protocol: req.httpVersion });
    }

    // ----- cookies -----
    if (p === '/cookies') {
      const cookies = Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map((c) => {
        const i = c.indexOf('='); return [c.slice(0, i), c.slice(i + 1)];
      }));
      return json(200, { protocol: req.httpVersion, rawCookieHeader: req.headers.cookie || null, cookies });
    }
    if (p === '/cookies/set' || p === '/cookies/set-and-redirect') {
      res.setHeader('set-cookie', Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}; Path=/`));
      if (p === '/cookies/set-and-redirect') {
        res.writeHead(302, { location: '/cookies' }); return res.end();
      }
      return json(200, { protocol: req.httpVersion, set: q });
    }
    if (p === '/cookies/delete') {
      res.setHeader('set-cookie', `${q.name}=; Path=/; Max-Age=0`);
      return json(200, { deleted: q.name });
    }

    // ----- redirects -----
    if ((m = /^\/(absolute-)?redirect\/(\d+)$/.exec(p))) {
      const n = Number(m[2]);
      const target = n <= 1 ? '/echo' : `/${m[1] || ''}redirect/${n - 1}`;
      const location = m[1] ? `${scheme}://${authority}${target}` : target;
      res.writeHead(Number(q.status || 302), { location });
      return res.end();
    }
    if (p === '/redirect-to') {
      res.writeHead(Number(q.status || 302), { location: q.url || '/echo' });
      return res.end();
    }

    // ----- auth -----
    if ((m = /^\/basic-auth\/([^/]+)\/([^/]+)$/.exec(p))) {
      const expected = `Basic ${Buffer.from(`${decodeURIComponent(m[1])}:${decodeURIComponent(m[2])}`).toString('base64')}`;
      const got = req.headers.authorization;
      if (got !== expected) return json(401, { authenticated: false, received: got || null, protocol: req.httpVersion }, { 'www-authenticate': 'Basic realm="h2-testbed"' });
      return json(200, { authenticated: true, user: decodeURIComponent(m[1]), protocol: req.httpVersion });
    }
    if (p === '/bearer') {
      const got = req.headers.authorization || '';
      const ok = got.startsWith('Bearer ') && (!q.token || got.slice(7) === q.token);
      return json(ok ? 200 : 401, { authenticated: ok, token: got.slice(7) || null, protocol: req.httpVersion }, ok ? {} : { 'www-authenticate': 'Bearer' });
    }
    if ((m = /^\/digest-auth\/([^/]+)\/([^/]+)$/.exec(p))) {
      const [user, pass] = [m[1], m[2]];
      const realm = 'h2-testbed';
      const got = req.headers.authorization || '';
      if (got.startsWith('Digest ')) {
        const a = parseAuthParams(got.slice(7));
        const ha1 = md5(`${a.username}:${realm}:${pass}`);
        const ha2 = md5(`${req.method}:${a.uri}`);
        const expected = a.qop ? md5(`${ha1}:${a.nonce}:${a.nc}:${a.cnonce}:${a.qop}:${ha2}`) : md5(`${ha1}:${a.nonce}:${ha2}`);
        if (a.username === user && digestNonces.has(a.nonce) && a.response === expected) {
          return json(200, { authenticated: true, user, protocol: req.httpVersion });
        }
      }
      const nonce = crypto.randomBytes(16).toString('hex');
      digestNonces.add(nonce);
      return json(401, { authenticated: false, protocol: req.httpVersion }, { 'www-authenticate': `Digest realm="${realm}", qop="auth", nonce="${nonce}", opaque="${md5(realm)}", algorithm=MD5` });
    }
    if (p === '/api-key') {
      const got = req.headers['x-api-key'] || q.api_key;
      const ok = got && (!q.expected || got === q.expected);
      return json(ok ? 200 : 401, { authenticated: !!ok, received: got || null, via: req.headers['x-api-key'] ? 'header' : q.api_key ? 'query' : null, protocol: req.httpVersion });
    }
    if (p === '/oauth/token' && req.method === 'POST') {
      const body = await readBody(req);
      const form = Object.fromEntries(new URLSearchParams(body.toString('utf8')));
      let { client_id: id, client_secret: secret } = form;
      const auth = req.headers.authorization || '';
      if (auth.startsWith('Basic ')) [id, secret] = Buffer.from(auth.slice(6), 'base64').toString().split(':').map(decodeURIComponent);
      if (form.grant_type !== 'client_credentials') return json(400, { error: 'unsupported_grant_type', received: form.grant_type || null });
      if (id !== OAUTH_CLIENT.id || secret !== OAUTH_CLIENT.secret) return json(401, { error: 'invalid_client' });
      const token = `h2tok_${crypto.randomBytes(12).toString('hex')}`;
      oauthTokens.set(token, { clientId: id, issuedAt: Date.now(), protocol: req.httpVersion });
      return json(200, { access_token: token, token_type: 'Bearer', expires_in: 2, scope: form.scope || 'read', issued_over: req.httpVersion });
    }
    if (p === '/oauth/protected') {
      const got = (req.headers.authorization || '').replace(/^Bearer /, '');
      const t = oauthTokens.get(got);
      return t ? json(200, { authenticated: true, clientId: t.clientId, tokenIssuedOver: t.protocol, protocol: req.httpVersion }) : json(401, { authenticated: false, received: got || null });
    }

    // ----- caching -----
    if (p === '/etag') {
      const tag = '"bruno-h2-v1"';
      if (req.headers['if-none-match'] === tag) {
        res.writeHead(304, { etag: tag }); return res.end();
      }
      return json(200, { protocol: req.httpVersion, etag: tag }, { 'etag': tag, 'cache-control': 'max-age=0, must-revalidate' });
    }

    // ----- h2-specific behaviour -----
    if (p === '/early-hints') {
      if (typeof res.writeEarlyHints === 'function') res.writeEarlyHints({ link: '</style.css>; rel=preload; as=style' });
      return json(200, { protocol: req.httpVersion, sentEarlyHints: typeof res.writeEarlyHints === 'function' });
    }
    if (p === '/trailers') {
      const body = Buffer.from(JSON.stringify({ protocol: req.httpVersion, note: 'check response trailers x-checksum / x-done' }));
      if (isH2) {
        res.writeHead(200, { 'content-type': 'application/json', 'trailer': 'x-checksum, x-done' });
      } else {
        res.writeHead(200, { 'content-type': 'application/json', 'trailer': 'x-checksum, x-done', 'transfer-encoding': 'chunked' });
      }
      res.write(body);
      res.addTrailers({ 'x-checksum': sha256(body), 'x-done': 'true' });
      return res.end();
    }
    if (p === '/push') {
      const pushed = [];
      if (isH2 && req.stream.pushAllowed) {
        for (const [pushPath, type, content] of [['/pushed.css', 'text/css', 'body{color:#f80}'], ['/pushed.js', 'application/javascript', 'console.log("pushed")']]) {
          try {
            res.createPushResponse({ ':path': pushPath }, (err, pushRes) => {
              if (err) return;
              pushRes.writeHead(200, { 'content-type': type });
              pushRes.end(content);
            });
            pushed.push(pushPath);
          } catch (_) { /* client disabled push mid-flight */ }
        }
      }
      return json(200, { protocol: req.httpVersion, pushAllowedByClient: isH2 ? req.stream.pushAllowed : null, pushed });
    }
    if (p === '/goaway') {
      if (isH2) {
        // The stream detaches from its session once finished, so hold the session now.
        const session = req.stream.session;
        res.on('finish', () => setImmediate(() => {
          if (session.destroyed || session.closed) return;
          stats.goawaysSent++;
          session.goaway(http2.constants.NGHTTP2_NO_ERROR);
        }));
        return json(200, { protocol: req.httpVersion, note: 'GOAWAY(NO_ERROR) sent after this response; the next request must open a NEW connection', connection: conn });
      }
      return json(200, { protocol: req.httpVersion, note: 'HTTP/1.1: Connection: close sent', connection: conn }, { connection: 'close' });
    }
    if (p === '/goaway-refuse') {
      if (!isH2) return json(400, { error: 'h2 only', protocol: req.httpVersion });
      stats.goawaysSent++;
      req.stream.session.goaway(http2.constants.NGHTTP2_NO_ERROR, Math.max(0, req.stream.id - 2));
      req.stream.close(http2.constants.NGHTTP2_REFUSED_STREAM);
      return;
    }
    if (p === '/rst') {
      const code = String(q.code || 'INTERNAL_ERROR').toUpperCase();
      const when = q.when || 'before';
      if (!isH2) {
        req.socket.destroy(); return;
      }
      const num = http2.constants[`NGHTTP2_${code}`];
      if (num === undefined) return json(400, { error: `unknown code ${code}` });
      if (when === 'mid') {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.write('partial body before RST_STREAM… '.repeat(32));
        const stream = req.stream;
        setTimeout(() => { if (!stream.destroyed) stream.close(num); }, 150);
        return;
      }
      req.stream.close(num);
      return;
    }
    if (p === '/destroy-session') {
      if (isH2) {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.write('about to destroy the whole session… ');
        const session = req.stream.session;
        setTimeout(() => session.destroy(), 100);
      } else {
        req.socket.destroy();
      }
      return;
    }
    if (p === '/content-length-mismatch') {
      if (isH2) {
        // Bypass the compat layer so Node does not "fix" the framing for us.
        req.stream.respond({ ':status': 200, 'content-type': 'text/plain', 'content-length': '100', ...baseHeaders });
        req.stream.end('short');
        return;
      }
      req.socket.write('HTTP/1.1 200 OK\r\ncontent-type: text/plain\r\ncontent-length: 100\r\n\r\nshort');
      setTimeout(() => req.socket.destroy(), 100);
      return;
    }

    return json(404, { error: 'no such route', path: p, hint: 'GET / lists routes' });
  } catch (err) {
    if (!res.headersSent) return json(err.status || 500, { error: err.message });
    res.destroy(err);
  }
}

// ---------------------------------------------------------------------------
// Listeners
// ---------------------------------------------------------------------------

function trackSessions(server, name) {
  server.on('session', (session) => {
    stats.sessions++;
    const m = metaFor(session);
    if (!QUIET) console.log(`[${name.padEnd(10)}] ◆ new h2 session s${m.id}`);
    session.on('close', () => { if (!QUIET) console.log(`[${name.padEnd(10)}] ◇ h2 session s${m.id} closed after ${m.requests} request(s)`); });
    session.on('error', () => {});
  });
  const onConn = (socket) => {
    stats.connections++;
    socket.on('error', () => {});
  };
  server.on('connection', onConn);
  server.on('secureConnection', onConn);
  server.on('tlsClientError', (err) => { if (!QUIET) console.log(`[${name.padEnd(10)}] ✖ TLS client error: ${err.code || ''} ${err.message}`); });
  server.on('sessionError', () => {});
  server.on('clientError', (err, socket) => { try { socket.destroy(); } catch (_) {} });
}

function listen(server, port, name, desc) {
  server.on('error', (err) => {
    console.error(`[${name}] failed to listen on ${port}: ${err.message}`);
  });
  server.listen(port, () => console.log(`  ${name.padEnd(11)} ${desc.padEnd(58)} :${port}`));
}

console.log('\nBruno HTTP/2 testbed\n');

const handler = (name) => (req, res) => { handle(req, res, name); };

// dual: h2 + h1 via ALPN
const dual = http2.createSecureServer({ ...TLS, allowHTTP1: true }, handler('dual'));
trackSessions(dual, 'dual');
listen(dual, PORTS.dual, 'dual', 'https  ALPN h2 + http/1.1');

// h2only
const h2only = http2.createSecureServer({ ...TLS, allowHTTP1: false }, handler('h2only'));
trackSessions(h2only, 'h2only');
// Node's default for a non-h2 client is a bare 403; a real h2-only endpoint just drops the connection.
h2only.on('unknownProtocol', (socket) => {
  if (!QUIET) console.log(`[h2only    ] ✖ non-h2 client (ALPN ${socket.alpnProtocol || 'none'}) — connection closed`);
  socket.destroy();
});
listen(h2only, PORTS.h2only, 'h2only', 'https  ALPN h2 only (HTTP/1.1 clients rejected)');

// h1only
const h1only = https.createServer({ ...TLS, ALPNProtocols: ['http/1.1'] }, handler('h1only'));
h1only.on('secureConnection', (s) => {
  stats.connections++; s.on('error', () => {});
});
h1only.on('tlsClientError', (err) => { if (!QUIET) console.log(`[h1only    ] ✖ TLS client error: ${err.code || ''} ${err.message}`); });
listen(h1only, PORTS.h1only, 'h1only', 'https  ALPN http/1.1 only (never h2)');

// mtls (+ a second port the collection deliberately has no client cert for)
for (const [name, port] of [['mtls', PORTS.mtls], ['mtlsnocert', PORTS.mtlsnocert]]) {
  const s = http2.createSecureServer({ ...TLS, allowHTTP1: true, requestCert: true, rejectUnauthorized: true }, handler(name));
  trackSessions(s, name);
  listen(s, port, name, `https  h2 + http/1.1, client cert REQUIRED${name === 'mtlsnocert' ? ' (no cert configured)' : ''}`);
}

// limited: tiny concurrency + flow-control windows
const limited = http2.createSecureServer({
  ...TLS,
  allowHTTP1: false,
  settings: { maxConcurrentStreams: 2, initialWindowSize: 16384, maxFrameSize: 16384, headerTableSize: 256 }
}, handler('limited'));
trackSessions(limited, 'limited');
listen(limited, PORTS.limited, 'limited', 'https  h2 only, MAX_CONCURRENT_STREAMS=2, 16KB window');

// badcert
const badcert = http2.createSecureServer({ key: read('wronghost.key'), cert: read('wronghost.crt'), allowHTTP1: true }, handler('badcert'));
trackSessions(badcert, 'badcert');
listen(badcert, PORTS.badcert, 'badcert', 'https  self-signed cert for wrong.example');

// plain h1
const plain = http.createServer(handler('plain'));
plain.on('connection', (s) => {
  stats.connections++; s.on('error', () => {});
});
listen(plain, PORTS.plain, 'plain', 'http   cleartext HTTP/1.1');

// h2c prior knowledge
const h2c = http2.createServer({}, handler('h2c'));
trackSessions(h2c, 'h2c');
listen(h2c, PORTS.h2c, 'h2c', 'http   cleartext HTTP/2 prior knowledge only');

// ---------------------------------------------------------------------------
// Forward proxies
// ---------------------------------------------------------------------------

const PROXY_CREDS = { user: 'bruno', pass: 'proxypass' };

function resolveTargetHost(host) {
  // Let *.localhost (e.g. proxied.localhost) reach this machine regardless of OS resolver.
  return host === 'localhost' || host.endsWith('.localhost') ? '127.0.0.1' : host;
}

function logProxy(entry) {
  proxyLog.push({ at: new Date().toISOString(), ...entry });
  if (proxyLog.length > 50) proxyLog.shift();
  if (!QUIET) console.log(`[${entry.proxy.padEnd(10)}] ${entry.type} ${entry.target} auth=${entry.auth} → ${entry.result}`);
}

function makeProxy(name, requireAuth) {
  const checkAuth = (req) => {
    const h = req.headers['proxy-authorization'];
    if (!h) return { presented: false, ok: !requireAuth };
    stats.proxyAuthSeen++;
    const [u, pw] = Buffer.from(h.replace(/^Basic /, ''), 'base64').toString().split(':');
    const valid = u === PROXY_CREDS.user && pw === PROXY_CREDS.pass;
    return { presented: true, user: u, ok: requireAuth ? valid : true, valid };
  };

  const server = http.createServer((req, res) => {
    // Absolute-URI forwarding (plain http:// through the proxy)
    const auth = checkAuth(req);
    if (!auth.ok) {
      stats.proxyRejected++;
      logProxy({ proxy: name, type: 'FORWARD', target: req.url, auth: auth.presented ? auth.user : 'none', result: '407' });
      res.writeHead(407, { 'proxy-authenticate': 'Basic realm="h2-testbed-proxy"' });
      return res.end('proxy auth required');
    }
    let target;
    try { target = new URL(req.url); } catch (_) {
      res.writeHead(400); return res.end('absolute URI required');
    }
    stats.proxyForwards++;
    const headers = { ...req.headers, 'x-forwarded-by': name };
    delete headers['proxy-authorization'];
    delete headers['proxy-connection'];
    const up = http.request({ host: resolveTargetHost(target.hostname), port: target.port || 80, path: target.pathname + target.search, method: req.method, headers }, (upRes) => {
      logProxy({ proxy: name, type: 'FORWARD', target: req.url, auth: auth.presented ? auth.user : 'none', result: String(upRes.statusCode) });
      res.writeHead(upRes.statusCode, { ...upRes.headers, 'x-via-proxy': name });
      upRes.pipe(res);
    });
    up.on('error', (e) => {
      res.writeHead(502); res.end(`upstream error: ${e.message}`);
    });
    req.pipe(up);
  });

  server.on('connect', (req, clientSocket, head) => {
    const auth = checkAuth(req);
    clientSocket.on('error', () => {});
    if (!auth.ok) {
      stats.proxyRejected++;
      logProxy({ proxy: name, type: 'CONNECT', target: req.url, auth: auth.presented ? auth.user : 'none', result: '407' });
      clientSocket.end('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="h2-testbed-proxy"\r\nContent-Length: 0\r\n\r\n');
      return;
    }
    const [host, port] = req.url.split(':');
    const upstream = net.connect(Number(port) || 443, resolveTargetHost(host), () => {
      stats.proxyTunnels++;
      logProxy({ proxy: name, type: 'CONNECT', target: req.url, auth: auth.presented ? auth.user : 'none', result: '200 tunnel' });
      clientSocket.write('HTTP/1.1 200 Connection Established\r\nProxy-Agent: bruno-h2-testbed\r\n\r\n');
      if (head && head.length) upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.on('error', (e) => {
      logProxy({ proxy: name, type: 'CONNECT', target: req.url, auth: auth.presented ? auth.user : 'none', result: `502 ${e.code}` });
      clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    });
  });
  return server;
}

// SOCKS4/4a + SOCKS5 proxy on one port (version auto-detected by the first byte).
// `requireAuth` gates SOCKS5 username/password (bruno/proxypass); SOCKS4 carries a
// userId only. Resolves *.localhost itself, so it supports SOCKS4a hostnames (which a
// bare SOCKS4 proxy cannot). Used to verify Bruno's SOCKS-over-HTTP/2 transport.
function makeSocksServer(name, requireAuth) {
  const relay = (client, host, port, version, user) => {
    const upstream = net.connect(Number(port), resolveTargetHost(host), () => {
      stats.socksConnections++;
      logProxy({ proxy: name, type: version, target: `${host}:${port}`, auth: user || 'none', result: 'open' });
      if (version === 'SOCKS5') client.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 0, 0, 0, 0, 0, 0]));
      else client.write(Buffer.from([0x00, 0x5a, 0, 0, 0, 0, 0, 0]));
      upstream.pipe(client); client.pipe(upstream);
    });
    upstream.on('error', (e) => {
      logProxy({ proxy: name, type: version, target: `${host}:${port}`, auth: user || 'none', result: `502 ${e.code || ''}` });
      if (version === 'SOCKS5') { try { client.write(Buffer.from([0x05, 0x01, 0x00, 0x01, 0, 0, 0, 0, 0, 0])); } catch (_) {} } else { try { client.write(Buffer.from([0x00, 0x5b, 0, 0, 0, 0, 0, 0])); } catch (_) {} }
      client.destroy();
    });
  };

  const socks5Connect = (client, user) => (req) => {
    const atyp = req[3];
    let host, off;
    if (atyp === 0x01) {
      host = `${req[4]}.${req[5]}.${req[6]}.${req[7]}`; off = 8;
    } else if (atyp === 0x03) {
      const len = req[4]; host = req.slice(5, 5 + len).toString(); off = 5 + len;
    } else {
      client.destroy(); return;
    } // IPv6 unused by the testbed
    relay(client, host, req.readUInt16BE(off), 'SOCKS5', user);
  };

  return net.createServer((client) => {
    client.on('error', () => {});
    client.once('data', (greeting) => {
      if (greeting[0] === 0x05) {
        if (requireAuth) {
          client.write(Buffer.from([0x05, 0x02])); // demand username/password
          client.once('data', (a) => {
            const ulen = a[1];
            const user = a.slice(2, 2 + ulen).toString();
            const plen = a[2 + ulen];
            const pass = a.slice(3 + ulen, 3 + ulen + plen).toString();
            if (user === PROXY_CREDS.user && pass === PROXY_CREDS.pass) {
              client.write(Buffer.from([0x01, 0x00]));
              client.once('data', socks5Connect(client, user));
            } else {
              stats.proxyRejected++;
              logProxy({ proxy: name, type: 'SOCKS5', target: '-', auth: user, result: '403 auth' });
              client.write(Buffer.from([0x01, 0x01]));
              client.destroy();
            }
          });
        } else {
          client.write(Buffer.from([0x05, 0x00])); // no auth
          client.once('data', socks5Connect(client, null));
        }
      } else if (greeting[0] === 0x04) {
        const req = greeting; // SOCKS4/4a request arrives whole
        const port = req.readUInt16BE(2);
        const socks4a = req[4] === 0 && req[5] === 0 && req[6] === 0 && req[7] !== 0;
        let i = 8; while (i < req.length && req[i] !== 0x00) i++;
        const userId = req.slice(8, i).toString() || null;
        i++; // skip the null terminating userId
        let host;
        if (socks4a) {
          let j = i; while (j < req.length && req[j] !== 0x00) j++; host = req.slice(i, j).toString();
        } else host = `${req[4]}.${req[5]}.${req[6]}.${req[7]}`;
        relay(client, host, port, 'SOCKS4', userId);
      } else {
        client.destroy();
      }
    });
  });
}

listen(makeProxy('proxy', false), PORTS.proxy, 'proxy', 'http   forward proxy, CONNECT + absolute-URI, auth optional');
listen(makeProxy('proxyauth', true), PORTS.proxyauth, 'proxyauth', 'http   forward proxy, Basic auth required (bruno/proxypass)');
listen(makeSocksServer('socks', false), PORTS.socks, 'socks', 'socks  SOCKS4/4a + SOCKS5, no auth');
listen(makeSocksServer('socksauth', true), PORTS.socksauth, 'socksauth', 'socks  SOCKS5, Basic auth required (bruno/proxypass)');

setTimeout(() => console.log('\nCA certificate for Bruno: ' + path.join(CERT_DIR, 'ca.crt') + '\nGET https://localhost:8443/ lists every route. Ctrl+C to stop.\n'), 200);

process.on('uncaughtException', (err) => console.error('uncaught:', err.message));
