'use strict';
/*
 * HTTP/2 QA testbed for Bruno.
 *
 * One process exposes several servers so the collection can exercise ALPN, methods, bodies,
 * headers, responses, streaming, cookies, redirects, multiplexing, resilience (GOAWAY/RST_STREAM),
 * TLS/mTLS, a forward+CONNECT proxy, and the scripting API — over HTTP/2 and HTTP/1.1.
 *
 *   ./gen-certs.sh && node server.js
 *
 * Ports (see collection environments):
 *   dual   8443  TLS, ALPN offers h2 + http/1.1   (also answers SNI localhost / h2.localhost / proxied.localhost)
 *   h2only 8444  TLS, ALPN offers h2 only
 *   h1only 8445  TLS, ALPN offers http/1.1 only
 *   mtls   8446  TLS h2, requires + verifies a client certificate
 *   limited 8447 TLS h2, SETTINGS_MAX_CONCURRENT_STREAMS = 2
 *   badcert 8448 TLS, wrong-host self-signed cert (not from the CA)
 *   mtlsNoCert 8449 TLS h2, requires a client cert (used to prove the handshake fails without one)
 *   plain  8091  cleartext HTTP/1.1
 *   h2c    8090  cleartext HTTP/2 (prior knowledge) only  — Bruno can't reach this (expected)
 *   proxy  3128  forward + CONNECT proxy, Basic auth bruno/proxypass
 */
const http2 = require('node:http2');
const https = require('node:https');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const H = http2.constants;
const certDir = path.join(__dirname, 'certs');
const read = (f) => fs.readFileSync(path.join(certDir, f));
let tlsKey, tlsCert, caCert, badKey, badCert, clientCertPem;
try {
  tlsKey = read('server.key'); tlsCert = read('server.crt'); caCert = read('ca.crt');
  badKey = read('badcert.key'); badCert = read('badcert.crt');
} catch (e) {
  console.error('Missing certs — run ./gen-certs.sh first.\n', e.message);
  process.exit(1);
}

// ---- process-wide counters (exposed at /stats) ----
const stats = { sessions: 0, streams: 0, proxyTunnels: 0, goawaysSent: 0, rstStreamsSent: 0, pushStreams: 0 };
let connSeq = 0;

// ============================================================================
// Helpers shared by the HTTP/1.1 and HTTP/2 compatibility handlers
// ============================================================================
const isH2 = (req) => req.httpVersion === '2.0';
const proto = (req) => (isH2(req) ? '2.0' : '1.1');

const connId = (req) => {
  const s = req.socket;
  if (!s.__cid) s.__cid = 'conn-' + ++connSeq;
  return s.__cid;
};

const parseCookies = (raw) => {
  const out = {};
  if (!raw) return out;
  String(raw).split(/; */).forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[decodeURIComponent(p.slice(0, i).trim())] = decodeURIComponent(p.slice(i + 1));
  });
  return out;
};

const reqHeaders = (req) => {
  const h = {};
  for (const [k, v] of Object.entries(req.headers)) if (!k.startsWith(':')) h[k] = v;
  return h;
};

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const tlsInfo = (req) => {
  const s = req.socket;
  if (!s || !s.encrypted) return null;
  const cipher = s.getCipher ? s.getCipher() : {};
  const peer = s.getPeerCertificate ? s.getPeerCertificate() : null;
  let clientCertificate = null;
  if (peer && Object.keys(peer).length) {
    clientCertificate = { subject: peer.subject && peer.subject.CN, issuer: peer.issuer && peer.issuer.CN };
  }
  return {
    protocol: s.getProtocol ? s.getProtocol() : null,
    cipher: cipher && cipher.name,
    alpn: s.alpnProtocol || null,
    servername: s.servername || null,
    authorized: s.authorized === true,
    clientCertificate
  };
};

const parseForm = (text) => { const o = {}; new URLSearchParams(text).forEach((v, k) => { o[k] = v; }); return o; };

// Minimal multipart/form-data parser → [{ name, value?, filename?, contentType?, size, sha256 }]
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return undefined;
  const boundary = Buffer.from('\r\n--' + (m[1] || m[2]).trim());
  const data = Buffer.concat([Buffer.from('\r\n'), buf]);
  const parts = [];
  let start = data.indexOf(boundary, 0);
  while (start !== -1) {
    const next = data.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    const seg = data.slice(start + boundary.length, next);
    start = next;
    if (seg.slice(0, 2).toString() === '--') continue;     // closing boundary
    const hEnd = seg.indexOf('\r\n\r\n');
    if (hEnd === -1) continue;
    const rawH = seg.slice(2, hEnd).toString();
    const content = seg.slice(hEnd + 4);
    const headers = {};
    rawH.split('\r\n').forEach((line) => { const i = line.indexOf(':'); if (i > 0) headers[line.slice(0, i).toLowerCase().trim()] = line.slice(i + 1).trim(); });
    const cd = headers['content-disposition'] || '';
    const name = (/name="([^"]*)"/.exec(cd) || [])[1];
    const filename = (/filename="([^"]*)"/.exec(cd) || [])[1];
    const part = { name, size: content.length, sha256: sha256(content) };
    if (filename !== undefined) part.filename = filename;
    if (headers['content-type']) part.contentType = headers['content-type'];
    if (filename === undefined) part.value = content.toString('utf8');
    parts.push(part);
  }
  return parts;
}

// Rich request-body description the collection asserts on.
const TEXT_ECHO_LIMIT = 262144; // only echo raw text for bodies at/under this size
function buildBody(req, buf) {
  const ct = String(req.headers['content-type'] || '');
  const body = { contentType: req.headers['content-type'] || null, size: buf.length, sha256: sha256(buf) };
  if (buf.length) {
    if (ct.includes('json')) {
      try { body.json = JSON.parse(buf.toString('utf8')); } catch (_) { if (buf.length <= TEXT_ECHO_LIMIT) body.text = buf.toString('utf8'); }
    } else if (ct.includes('x-www-form-urlencoded')) {
      const t = buf.toString('utf8'); body.form = parseForm(t); if (buf.length <= TEXT_ECHO_LIMIT) body.text = t;
    } else if (ct.includes('multipart/form-data')) {
      body.multipart = parseMultipart(buf, ct);
    } else if (buf.length <= TEXT_ECHO_LIMIT && (ct.startsWith('text/') || ct.includes('xml') || ct.includes('graphql') || ct === '')) {
      body.text = buf.toString('utf8');
    }
    // binary / octet-stream / oversized: size + sha256 only (don't balloon the response)
  }
  return body;
}

const urlOf = (req) => {
  const authority = req.headers[':authority'] || req.headers.host || 'localhost';
  return new URL(req.url, 'https://' + authority);
};

const readBody = (req) =>
  new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.concat(chunks)));
  });

// Node exposes rawHeaders as a flat [name, value, name, value, ...] array; expose it as
// [[name, value], ...] pairs so tests can assert per-header-name casing.
const pairRawHeaders = (flat) => {
  const pairs = [];
  for (let i = 0; i + 1 < flat.length; i += 2) pairs.push([flat[i], flat[i + 1]]);
  return pairs;
};

const baseInfo = (req, server, buf) => {
  const u = urlOf(req);
  const pseudo = isH2(req) ? {
    ':authority': req.headers[':authority'],
    ':scheme': req.headers[':scheme'] || 'https',
    ':method': req.headers[':method'] || req.method,
    ':path': req.headers[':path'] || req.url
  } : undefined;
  return {
    protocol: proto(req),
    server,
    method: req.method,
    url: req.url,
    path: u.pathname,
    rawPath: req.url,
    query: Object.fromEntries(u.searchParams.entries()),
    rawQuery: u.search,                 // keeps the leading '?'
    authority: req.headers[':authority'] || req.headers.host || null,
    pseudoHeaders: pseudo,              // h2 only
    headers: reqHeaders(req),
    rawHeaders: pairRawHeaders(req.rawHeaders),
    cookies: parseCookies(req.headers.cookie),
    rawCookieHeader: req.headers.cookie || null,
    tls: tlsInfo(req),
    h2: isH2(req),
    via: req.headers['x-via-proxy'] || undefined,
    body: buildBody(req, buf || Buffer.alloc(0))
  };
};

const setCommon = (req, res, server) => {
  try {
    res.setHeader('x-protocol', proto(req));
    res.setHeader('x-connection-id', connId(req));
    res.setHeader('x-server', server);
    // Echo the proxy marker the forward proxy injected, so a request reached through
    // the proxy carries x-via-proxy:proxy on its RESPONSE (what the proxy tests read).
    if (req.headers['x-via-proxy']) res.setHeader('x-via-proxy', req.headers['x-via-proxy']);
    if (req.stream) res.setHeader('x-stream-id', String(req.stream.id));
  } catch (_) { /* headers already sent */ }
};

const sendJson = (req, res, server, obj, status = 200, extra) => {
  setCommon(req, res, server);
  if (extra) for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.writeHead(status);
  res.end(JSON.stringify(obj, null, 2));
};

const b64 = (s) => Buffer.from(s).toString('base64');

// ============================================================================
// Route table — one shared handler for h1 and h2 (compat API)
// ============================================================================
const ROUTES = [
  '/', '/echo', '/stats', '/json', '/xml', '/html', '/text', '/unicode', '/png', '/binary',
  '/empty', '/etag', '/trailers', '/early-hints', '/push', '/large-json', '/gzip', '/deflate', '/br',
  '/bytes/:n', '/content-length-mismatch', '/headers/response', '/headers/large-response', '/headers/multi',
  '/stream/:n', '/sse', '/drip', '/delay/:ms', '/slow-headers/:ms', '/hang',
  '/cookies', '/cookies/set', '/cookies/delete', '/cookies/set-and-redirect', '/session', '/destroy-session',
  '/rst', '/goaway', '/goaway-refuse', '/upload', '/anything/*',
  '/status/:code', '/redirect-to', '/redirect/:n', '/absolute-redirect/:n',
  '/basic-auth/:user/:pass', '/digest-auth/:user/:pass', '/bearer', '/api-key',
  '/oauth/token', '/oauth/protected'
];

async function handle(req, res, server) {
  const u = urlOf(req);
  const p = u.pathname;
  const seg = p.split('/').filter(Boolean);

  // ---- info / health ----
  if (p === '/') return sendJson(req, res, server, { ok: true, server, protocol: proto(req), routes: ROUTES });
  if (p === '/stats') return sendJson(req, res, server, { ...stats, protocol: proto(req), proxyTunnels: stats.proxyTunnels });

  if (p === '/echo') {
    const body = await readBody(req);
    return sendJson(req, res, server, baseInfo(req, server, body));
  }

  // ---- simple body types ----
  if (p === '/json') return sendJson(req, res, server, { protocol: proto(req), number: 42, unicode: 'héllo 世界 🐶', items: [1, 2, 3] });
  if (p === '/unicode') return sendJson(req, res, server, { protocol: proto(req), text: 'héllo 日本語 世界 🐶 ✅', unicode: 'héllo 日本語 世界 🐶 ✅' });
  if (p === '/large-json') {
    const n = Number(u.searchParams.get('items') || 1000);
    const items = Array.from({ length: n }, (_, i) => ({ i, v: 'item-' + i }));
    return sendJson(req, res, server, { protocol: proto(req), count: n, items });
  }
  if (p === '/xml') {
    setCommon(req, res, server); res.setHeader('content-type', 'application/xml');
    return res.end(`<?xml version="1.0"?><root protocol="${proto(req)}"><item>a</item></root>`);
  }
  if (p === '/html') {
    setCommon(req, res, server); res.setHeader('content-type', 'text/html; charset=utf-8');
    return res.end(`<!doctype html><title>testbed</title><h1>protocol ${proto(req)}</h1>`);
  }
  if (p === '/text') {
    setCommon(req, res, server); res.setHeader('content-type', 'text/plain; charset=utf-8');
    return res.end('plain text over HTTP/' + proto(req));
  }
  if (p === '/png' || p === '/binary') {
    // 1x1 transparent PNG
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360000002000154a24f3c0000000049454e44ae426082', 'hex');
    setCommon(req, res, server);
    res.setHeader('content-type', p === '/png' ? 'image/png' : 'application/octet-stream');
    return res.end(png);
  }
  if (p === '/empty') { setCommon(req, res, server); res.setHeader('content-length', '0'); res.writeHead(200); return res.end(); }

  // ---- compression ----
  if (p === '/gzip' || p === '/deflate' || p === '/br') {
    const payload = JSON.stringify({ protocol: proto(req), encoding: p.slice(1), filler: 'bruno-h2-marker-' + 'x'.repeat(2048) });
    setCommon(req, res, server);
    res.setHeader('content-type', 'application/json');
    res.setHeader('content-encoding', p === '/br' ? 'br' : p.slice(1));
    const enc = p === '/gzip' ? zlib.gzipSync(payload) : p === '/deflate' ? zlib.deflateSync(payload) : zlib.brotliCompressSync(payload);
    res.writeHead(200);
    return res.end(enc);
  }

  // ---- sizes / content-length ----
  if (seg[0] === 'bytes' && seg[1] !== undefined) {
    const n = Math.max(0, Number(seg[1]) || 0);
    setCommon(req, res, server);
    res.setHeader('content-type', 'application/octet-stream');
    res.setHeader('content-length', String(n));
    res.writeHead(200);
    const CH = 65536; let sent = 0;
    const pump = () => {
      while (sent < n) {
        const chunk = Buffer.alloc(Math.min(CH, n - sent), 0x61);
        sent += chunk.length;
        if (!res.write(chunk)) { res.once('drain', pump); return; }
      }
      res.end();
    };
    return pump();
  }
  if (p === '/content-length-mismatch') {
    // Advertise a longer body than we send, then close — the client should see a premature end,
    // not hang waiting for the missing bytes.
    setCommon(req, res, server);
    res.setHeader('content-type', 'text/plain');
    res.setHeader('content-length', '100');
    res.writeHead(200);
    res.write('short body');                         // 10 bytes of a claimed 100
    return setTimeout(() => { try { req.socket.destroy(); } catch (_) {} }, 50);
  }

  // ---- response headers ----
  if (p === '/headers/response') {
    const count = Number(u.searchParams.get('count') || 50);
    const size = Number(u.searchParams.get('size') || 20);
    setCommon(req, res, server);
    for (let i = 0; i < count; i++) res.setHeader('x-h-' + i, 'v'.repeat(size));
    return sendJson(req, res, server, { protocol: proto(req), count });
  }
  if (p === '/headers/large-response') {
    const size = Number(u.searchParams.get('size') || 12288);
    setCommon(req, res, server);
    res.setHeader('x-large', 'L'.repeat(size));
    return sendJson(req, res, server, { protocol: proto(req), filler: 'x'.repeat(size) });
  }
  if (p === '/headers/multi') {
    setCommon(req, res, server);
    res.setHeader('x-multi', ['first', 'second', 'third']);
    res.setHeader('set-cookie', ['multi_a=1; Path=/', 'multi_b=2; Path=/', 'multi_c=3; Path=/']);
    return sendJson(req, res, server, { protocol: proto(req) });
  }

  // ---- streaming ----
  if (seg[0] === 'stream' && seg[1] !== undefined) {
    const n = Number(seg[1]) || 10;
    const interval = Number(u.searchParams.get('interval') || 50);
    setCommon(req, res, server);
    res.setHeader('content-type', 'application/x-ndjson');
    res.writeHead(200);
    let i = 0;
    const tick = () => {
      if (i >= n) return res.end();
      res.write(JSON.stringify({ n: i, protocol: proto(req) }) + '\n');
      i++;
      setTimeout(tick, interval);
    };
    return tick();
  }
  if (p === '/sse') {
    const count = Number(u.searchParams.get('count') || 5);
    const interval = Number(u.searchParams.get('interval') || 300);
    setCommon(req, res, server);
    res.setHeader('content-type', 'text/event-stream');
    res.setHeader('cache-control', 'no-cache');
    res.writeHead(200);
    let i = 0;
    const tick = () => {
      if (count > 0 && i >= count) return res.end();
      res.write(`id: ${i}\nevent: tick\ndata: ${JSON.stringify({ i, protocol: proto(req) })}\n\n`);
      i++;
      setTimeout(tick, interval);
    };
    return tick();
  }
  if (p === '/drip') {
    const chunks = Number(u.searchParams.get('chunks') || 10);
    const interval = Number(u.searchParams.get('interval') || 300);
    const size = Number(u.searchParams.get('size') || 100);
    setCommon(req, res, server);
    res.setHeader('content-type', 'application/octet-stream');
    res.writeHead(200);
    let i = 0;
    const tick = () => {
      if (i >= chunks) return res.end();
      res.write(Buffer.alloc(size, 0x2e));
      i++;
      setTimeout(tick, interval);
    };
    return tick();
  }
  if (seg[0] === 'delay' && seg[1] !== undefined) {
    const ms = Number(seg[1]) || 0;
    const body = await readBody(req);
    return setTimeout(() => sendJson(req, res, server, baseInfo(req, server, body)), ms);
  }
  if (seg[0] === 'slow-headers' && seg[1] !== undefined) {
    const ms = Number(seg[1]) || 0;
    return setTimeout(() => sendJson(req, res, server, { protocol: proto(req), slowHeaders: ms }), ms);
  }
  if (p === '/hang') { /* never responds */ return; }

  // ---- cookies ----
  if (p === '/cookies') {
    return sendJson(req, res, server, { protocol: proto(req), cookies: parseCookies(req.headers.cookie), rawCookieHeader: req.headers.cookie || null });
  }
  if (p === '/cookies/set') {
    setCommon(req, res, server);
    const cookies = [];
    for (const [k, v] of u.searchParams.entries()) cookies.push(`${k}=${v}; Path=/`);
    if (!cookies.length) cookies.push('h2a=alpha; Path=/');
    res.setHeader('set-cookie', cookies);
    return sendJson(req, res, server, { protocol: proto(req), set: [...u.searchParams.keys()] });
  }
  if (p === '/cookies/delete') {
    const name = u.searchParams.get('name') || 'h2a';
    setCommon(req, res, server);
    res.setHeader('set-cookie', `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
    return sendJson(req, res, server, { protocol: proto(req), deleted: name });
  }
  if (p === '/cookies/set-and-redirect') {
    setCommon(req, res, server);
    res.setHeader('set-cookie', 'redir=yes; Path=/');
    res.setHeader('location', '/cookies');
    res.writeHead(302);
    return res.end();
  }
  if (p === '/session') {
    return sendJson(req, res, server, { ...baseInfo(req, server, Buffer.alloc(0)), connId: connId(req) });
  }
  if (p === '/destroy-session') {
    setCommon(req, res, server);
    res.setHeader('content-type', 'application/json');
    res.writeHead(200);
    res.write('{"protocol":"' + proto(req) + '","partial":true');   // deliberately incomplete, never end()
    setTimeout(() => { try { if (req.stream && req.stream.session) req.stream.session.destroy(); else req.socket.destroy(); } catch (_) {} }, 30);
    return;
  }

  // ---- h2 resilience: RST_STREAM / GOAWAY ----
  if (p === '/rst') {
    const codeName = (u.searchParams.get('code') || 'CANCEL').toUpperCase();
    const when = u.searchParams.get('when') || 'before';
    const code = H['NGHTTP2_' + codeName] != null ? H['NGHTTP2_' + codeName] : H.NGHTTP2_CANCEL;
    if (!req.stream) { // RST_STREAM is h2-only — on HTTP/1.1 just answer normally
      return sendJson(req, res, server, { protocol: proto(req), rst: codeName, note: 'RST_STREAM is h2-only; no-op on HTTP/1.1' });
    }
    stats.rstStreamsSent++;
    if (when === 'mid') {
      setCommon(req, res, server);
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.write('partial-body-before-reset');
      return setTimeout(() => { try { req.stream.close(code); } catch (_) {} }, 20);
    }
    return req.stream.close(code); // reset before any headers
  }
  if (p === '/goaway' || p === '/goaway-refuse') {
    if (!req.stream) return sendJson(req, res, server, { protocol: proto(req), note: 'goaway is h2-only' }, p === '/goaway-refuse' ? 400 : 200);
    const session = req.stream.session;
    if (p === '/goaway-refuse') {
      // Refuse THIS stream: GOAWAY with lastStreamID below this stream id, then no response.
      stats.goawaysSent++;
      try { session.goaway(H.NGHTTP2_NO_ERROR, Math.max(0, req.stream.id - 2)); } catch (_) {}
      return;
    }
    // Answer, then GOAWAY so the next request must open a new session.
    sendJson(req, res, server, { protocol: proto(req), goawayAfter: true });
    stats.goawaysSent++;
    return setTimeout(() => { try { session.goaway(H.NGHTTP2_NO_ERROR); } catch (_) {} }, 20);
  }

  // ---- upload / anything ----
  if (p === '/upload') {
    const body = await readBody(req);
    return sendJson(req, res, server, baseInfo(req, server, body));
  }
  if (seg[0] === 'anything') {
    const body = await readBody(req);
    return sendJson(req, res, server, baseInfo(req, server, body));
  }

  // ---- status codes ----
  if (seg[0] === 'status' && seg[1] !== undefined) {
    const code = Number(seg[1]) || 200;
    setCommon(req, res, server);
    if (code === 429) res.setHeader('retry-after', u.searchParams.get('retryAfter') || '30');
    if (code === 204 || code === 304) { res.writeHead(code); return res.end(); }
    return sendJson(req, res, server, { protocol: proto(req), status: code }, code);
  }

  // ---- etag / conditional ----
  if (p === '/etag') {
    const etag = '"bruno-h2-v1"';
    setCommon(req, res, server);
    if (req.headers['if-none-match'] === etag) { res.setHeader('etag', etag); res.writeHead(304); return res.end(); }
    res.setHeader('etag', etag);
    return sendJson(req, res, server, { protocol: proto(req), etag });
  }

  // ---- redirects ----
  if (p === '/redirect-to') {
    const status = Number(u.searchParams.get('status') || 302);
    const target = u.searchParams.get('url') || '/echo';
    setCommon(req, res, server);
    res.setHeader('location', target);
    res.writeHead(status);
    return res.end();
  }
  if (seg[0] === 'redirect' && seg[1] !== undefined) {
    const n = Number(seg[1]) || 1;
    setCommon(req, res, server);
    res.setHeader('location', n <= 1 ? '/echo' : '/redirect/' + (n - 1));
    res.writeHead(302);
    return res.end();
  }
  if (seg[0] === 'absolute-redirect' && seg[1] !== undefined) {
    const n = Number(seg[1]) || 1;
    const authority = req.headers[':authority'] || req.headers.host || 'localhost:8443';
    setCommon(req, res, server);
    res.setHeader('location', n <= 1 ? `https://${authority}/echo` : `https://${authority}/absolute-redirect/${n - 1}`);
    res.writeHead(302);
    return res.end();
  }

  // ---- 103 Early Hints ----
  if (p === '/early-hints') {
    if (req.stream) { try { req.stream.additionalHeaders({ ':status': 103, link: '</style.css>; rel=preload' }); } catch (_) {} }
    else if (res.writeEarlyHints) { try { res.writeEarlyHints({ link: '</style.css>; rel=preload' }); } catch (_) {} }
    return sendJson(req, res, server, { protocol: proto(req), sentEarlyHints: true });
  }

  // ---- trailers ----
  if (p === '/trailers') {
    setCommon(req, res, server);
    res.setHeader('content-type', 'application/json');
    if (!isH2(req)) res.setHeader('trailer', 'x-checksum, x-done'); // h1 must announce trailers up front
    res.writeHead(200);
    res.write(JSON.stringify({ protocol: proto(req), note: 'body then trailers' }));
    try { res.addTrailers({ 'x-checksum': 'abc123', 'x-done': 'true' }); } catch (_) { /* best effort */ }
    return res.end(); // always finish the response (missing this hung the runner)
  }

  // ---- server push (h2) ----
  if (p === '/push') {
    const pushAllowedByClient = req.stream ? !!req.stream.session.remoteSettings.enablePush : false;
    const pushed = [];
    if (req.stream && pushAllowedByClient) {
      for (const asset of ['/pushed.css', '/pushed.js']) {
        try {
          req.stream.pushStream({ ':path': asset, ':method': 'GET' }, (err, push) => {
            if (err) return;
            stats.pushStreams++;
            push.respond({ ':status': 200, 'content-type': asset.endsWith('.css') ? 'text/css' : 'application/javascript' });
            push.end('/* ' + asset + ' */');
          });
          pushed.push(asset);
        } catch (_) { /* client refused push */ }
      }
    }
    return sendJson(req, res, server, { protocol: proto(req), pushAllowedByClient, pushed });
  }

  // ---- auth ----
  if (seg[0] === 'basic-auth' && seg.length >= 3) {
    const user = decodeURIComponent(seg[1]); const pass = decodeURIComponent(seg.slice(2).join('/'));
    const want = 'Basic ' + b64(user + ':' + pass);
    if (req.headers.authorization !== want) {
      setCommon(req, res, server);
      res.setHeader('www-authenticate', 'Basic realm="testbed"');
      return sendJson(req, res, server, { protocol: proto(req), authenticated: false }, 401);
    }
    return sendJson(req, res, server, { protocol: proto(req), authenticated: true, user });
  }
  if (seg[0] === 'digest-auth' && seg.length >= 3) {
    return handleDigest(req, res, server, decodeURIComponent(seg[1]), decodeURIComponent(seg.slice(2).join('/')));
  }
  if (p === '/bearer') {
    const ok = /^Bearer\s+.+/.test(req.headers.authorization || '');
    if (!ok) { setCommon(req, res, server); res.setHeader('www-authenticate', 'Bearer'); return sendJson(req, res, server, { protocol: proto(req), authenticated: false }, 401); }
    return sendJson(req, res, server, { protocol: proto(req), authenticated: true, token: (req.headers.authorization || '').slice(7) });
  }
  if (p === '/api-key') {
    const hdr = req.headers['x-api-key'] || req.headers['apikey'] || req.headers['api-key'];
    const qp = u.searchParams.get('key') || u.searchParams.get('apikey') || u.searchParams.get('api_key') || u.searchParams.get('api-key');
    const via = hdr ? 'header' : (qp ? 'query' : null);
    const ok = !!(hdr || qp);
    return sendJson(req, res, server, { protocol: proto(req), authenticated: ok, via }, ok ? 200 : 401);
  }
  if (p === '/oauth/token') {
    const body = await readBody(req);
    return sendJson(req, res, server, {
      protocol: proto(req),
      access_token: 'testbed-token-' + Date.now(),
      token_type: 'Bearer',
      expires_in: 3600,
      tokenIssuedOver: proto(req)
    });
  }
  if (p === '/oauth/protected') {
    const ok = /^Bearer\s+testbed-token-/.test(req.headers.authorization || '');
    return sendJson(req, res, server, { protocol: proto(req), authenticated: ok }, ok ? 200 : 401);
  }

  // ---- fallback ----
  return sendJson(req, res, server, { protocol: proto(req), error: 'not found', path: p }, 404);
}

// Minimal RFC 2617 Digest (qop=auth, MD5) — enough for Bruno's digest flow.
const DIGEST_NONCES = new Set();
function handleDigest(req, res, server, user, pass) {
  const realm = 'testbed';
  const auth = req.headers.authorization || '';
  const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
  const parse = (h) => {
    const o = {};
    h.replace(/(\w+)=(?:"([^"]*)"|([^,]*))/g, (_, k, q, b) => { o[k] = q != null ? q : b; return ''; });
    return o;
  };
  if (!/^Digest /i.test(auth)) {
    const nonce = crypto.randomBytes(16).toString('hex');
    DIGEST_NONCES.add(nonce);
    setCommon(req, res, server);
    res.setHeader('www-authenticate', `Digest realm="${realm}", qop="auth", nonce="${nonce}", opaque="op"`);
    return sendJson(req, res, server, { protocol: proto(req), authenticated: false }, 401);
  }
  const d = parse(auth.replace(/^Digest /i, ''));
  const ha1 = md5(`${user}:${realm}:${pass}`);
  const ha2 = md5(`${req.method}:${d.uri}`);
  const expected = md5(`${ha1}:${d.nonce}:${d.nc}:${d.cnonce}:${d.qop}:${ha2}`);
  const ok = d.username === user && d.response === expected;
  return sendJson(req, res, server, { protocol: proto(req), authenticated: ok, user }, ok ? 200 : 401);
}

// ============================================================================
// Server factory
// ============================================================================
const onSession = (session) => {
  stats.sessions++;
  // Close a session after 30 s of inactivity (no streams/data), so a request made after a longer
  // idle gap lands on a NEW connection. setTimeout resets on activity, so active sessions stay open.
  if (session && typeof session.setTimeout === 'function') {
    session.setTimeout(30000, () => { try { session.close(); } catch (_) {} });
  }
};

// Clean HTTP/1.1 rejection for header-overflow (and other early parse errors): answer 431 so the
// oversized-header test sees a definite status instead of a bare socket hang-up.
function sendClientError(err, sock) {
  try {
    if (err && err.code === 'HPE_HEADER_OVERFLOW') {
      sock.end('HTTP/1.1 431 Request Header Fields Too Large\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    } else {
      sock.destroy();
    }
  } catch (_) {}
}

function makeH2Secure(name, extra = {}) {
  const { settings: extraSettings, ...rest } = extra;
  // 32 KiB: comfortably above any normal request, below the 80 KB oversized-header test,
  // so an oversized header list is rejected cleanly (RST/ENHANCE_YOUR_CALM) rather than echoed.
  const settings = { maxHeaderListSize: 32768, ...extraSettings };
  const srv = http2.createSecureServer({ key: tlsKey, cert: tlsCert, maxSessionMemory: 256, maxHeaderSize: 32768, settings, ...rest }, (req, res) => {
    handle(req, res, name).catch((e) => { try { res.writeHead(500); res.end(String(e && e.message)); } catch (_) {} });
  });
  srv.on('session', onSession);
  srv.on('stream', () => { stats.streams++; });
  srv.on('sessionError', () => {});
  srv.on('clientError', () => {});
  return srv;
}

function makeH1Secure(name, extra = {}) {
  // ALPNProtocols http/1.1 only — ALPN never selects h2 here.
  const srv = https.createServer({ key: tlsKey, cert: tlsCert, ALPNProtocols: ['http/1.1'], maxHeaderSize: 32768, ...extra }, (req, res) => {
    handle(req, res, name).catch((e) => { try { res.writeHead(500); res.end(String(e && e.message)); } catch (_) {} });
  });
  srv.on('clientError', sendClientError);
  return srv;
}

// ---- the servers ----
// dual: ALPN offers h2 AND http/1.1 (Node default for createSecureServer with allowHTTP1)
const dual = makeH2Secure('dual', { allowHTTP1: true });
// h2only: allowHTTP1 false → ALPN offers only h2
const h2only = makeH2Secure('h2only', { allowHTTP1: false });
// h1only: plain https server, ALPN http/1.1 only
const h1only = makeH1Secure('h1only');
// mtls: h2, require + verify client cert against our CA
const mtls = makeH2Secure('mtls', { allowHTTP1: true, requestCert: true, rejectUnauthorized: true, ca: caCert });
// mtlsNoCert: same mTLS requirement; used to prove the handshake fails when no client cert is sent
const mtlsNoCert = makeH2Secure('mtlsNoCert', { allowHTTP1: true, requestCert: true, rejectUnauthorized: true, ca: caCert });
// limited: h2 with MAX_CONCURRENT_STREAMS = 2
const limited = makeH2Secure('limited', { allowHTTP1: true, settings: { maxConcurrentStreams: 2 } });
// badcert: wrong-host self-signed cert, not from the CA
const badcert = makeH2Secure('badcert', { allowHTTP1: true, key: badKey, cert: badCert });
// plain: cleartext HTTP/1.1
const plain = http.createServer({ maxHeaderSize: 32768 }, (req, res) => {
  handle(req, res, 'plain').catch((e) => { try { res.writeHead(500); res.end(String(e && e.message)); } catch (_) {} });
});
plain.on('clientError', sendClientError);
// h2c: cleartext HTTP/2 prior-knowledge only
const h2c = http2.createServer((req, res) => {
  handle(req, res, 'h2c').catch((e) => { try { res.writeHead(500); res.end(String(e && e.message)); } catch (_) {} });
});
h2c.on('session', onSession);

// ============================================================================
// Forward + CONNECT proxy with Basic auth (bruno/proxypass)
// ============================================================================
const PROXY_USER = 'bruno', PROXY_PASS = 'proxypass';
const proxyAuthOk = (req) => {
  const h = req.headers['proxy-authorization'] || '';
  return h === 'Basic ' + b64(`${PROXY_USER}:${PROXY_PASS}`);
};
const resolveLoopback = (host) => (/^(localhost|.*\.localhost)$/i.test(host) ? '127.0.0.1' : host);

const proxyForwardHandler = (req, res) => {
  // Plain forward proxy (absolute-form URL for cleartext http targets)
  if (!proxyAuthOk(req)) {
    res.writeHead(407, { 'proxy-authenticate': 'Basic realm="proxy"' });
    return res.end('proxy auth required');
  }
  let target;
  try { target = new URL(req.url); } catch (_) { res.writeHead(400); return res.end('bad request'); }
  const upstream = http.request({
    host: resolveLoopback(target.hostname), port: target.port || 80, method: req.method,
    path: target.pathname + target.search,
    headers: { ...req.headers, host: target.host, 'x-via-proxy': 'proxy' }
  }, (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
  upstream.on('error', () => { try { res.writeHead(502); res.end('bad gateway'); } catch (_) {} });
  req.pipe(upstream);
};
const proxyConnectHandler = (req, clientSocket, head) => {
  if (!proxyAuthOk(req)) {
    clientSocket.write('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="proxy"\r\n\r\n');
    return clientSocket.end();
  }
  const [host, port] = req.url.split(':');
  stats.proxyTunnels++;
  const upstream = net.connect(Number(port), resolveLoopback(host), () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head && head.length) upstream.write(head);
    upstream.pipe(clientSocket); clientSocket.pipe(upstream);
  });
  upstream.on('error', () => { try { clientSocket.end(); } catch (_) {} });
  clientSocket.on('error', () => { try { upstream.end(); } catch (_) {} });
};

// Two identical auth-required proxies. The collection's default is 3128; the "Proxy requiring auth"
// tests point proxyPort at 3129 to prove auth works on a second instance (and fails with a bad pass).
const makeProxy = () => {
  const p = http.createServer(proxyForwardHandler);
  p.on('connect', proxyConnectHandler);
  return p;
};
const proxy = makeProxy();
const proxyAuth = makeProxy();

// ============================================================================
// Boot
// ============================================================================
const listen = (srv, port, label) => new Promise((r) => srv.listen(port, () => { console.log(`  ${label.padEnd(26)} :${port}`); r(); }));

(async () => {
  console.log('HTTP/2 QA testbed starting (Ctrl+C to stop):\n');
  await Promise.all([
    listen(dual, 8443, 'dual   (h2 + http/1.1 TLS)'),
    listen(h2only, 8444, 'h2only (h2 TLS)'),
    listen(h1only, 8445, 'h1only (http/1.1 TLS)'),
    listen(mtls, 8446, 'mtls   (h2 TLS, client cert)'),
    listen(limited, 8447, 'limited (h2, 2 streams)'),
    listen(badcert, 8448, 'badcert (wrong-host cert)'),
    listen(mtlsNoCert, 8449, 'mtlsNoCert (h2, needs cert)'),
    listen(plain, 8091, 'plain  (cleartext http/1.1)'),
    listen(h2c, 8090, 'h2c    (cleartext h2 only)'),
    listen(proxy, 3128, 'proxy  (forward + CONNECT)'),
    listen(proxyAuth, 3129, 'proxyAuth (auth-required)')
  ]);
  console.log('\n  Trust certs/ca.crt in Bruno (Preferences > General > Custom CA certificate).');
  console.log('  Add to /etc/hosts:  127.0.0.1 h2.localhost proxied.localhost\n');
})();

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
