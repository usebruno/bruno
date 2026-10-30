#!/usr/bin/env node
/**
 * Verifies the testbed itself behaves as documented, using Node's own clients (no Bruno involved).
 * Run with the server up:  node selftest.js
 * If a check here fails, the testbed is broken — don't file it as a Bruno bug.
 */
'use strict';

const http = require('node:http');
const https = require('node:https');
const http2 = require('node:http2');
const tls = require('node:tls');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const ca = fs.readFileSync(path.join(__dirname, 'certs', 'ca.crt'));
const clientCert = { cert: fs.readFileSync(path.join(__dirname, 'certs', 'client.crt')), key: fs.readFileSync(path.join(__dirname, 'certs', 'client.key')) };
const port = (name, def) => Number(process.env[`PORT_${name.toUpperCase()}`]) || def;
const P = { dual: port('dual', 8443), h2only: port('h2only', 8444), h1only: port('h1only', 8445), mtls: port('mtls', 8446), limited: port('limited', 8447), badcert: port('badcert', 8448), plain: port('plain', 8091), h2c: port('h2c', 8090), proxy: port('proxy', 3128), proxyauth: port('proxyauth', 3129) };

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✖ ${name}\n      ${e.message}`);
  }
}
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function alpn(p, protocols) {
  return new Promise((resolve, reject) => {
    const s = tls.connect({ host: 'localhost', port: p, ca, servername: 'localhost', ALPNProtocols: protocols }, () => {
      const a = s.alpnProtocol; s.destroy(); resolve(a);
    });
    s.on('error', reject);
  });
}

function h2request(session, reqPath, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const stream = session.request({ ':method': method, ':path': reqPath, ...headers });
    let resHeaders;
    let trailers = null;
    const chunks = [];
    stream.on('response', (h) => { resHeaders = h; });
    stream.on('trailers', (t) => { trailers = t; });
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve({ headers: resHeaders, trailers, body: Buffer.concat(chunks), stream }));
    stream.on('error', reject);
    if (body) stream.end(body); else stream.end();
  });
}

const h2connect = (p, extra = {}) => http2.connect(`https://localhost:${p}`, { ca, ...extra });

function h1get(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { ca, ...opts }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks), httpVersion: res.httpVersion }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('\nTestbed self-test\n');

  console.log('ALPN');
  await check('dual picks h2 when offered h2,http/1.1', async () => assert(await alpn(P.dual, ['h2', 'http/1.1']) === 'h2', 'expected h2'));
  await check('dual picks http/1.1 when offered only http/1.1', async () => assert(await alpn(P.dual, ['http/1.1']) === 'http/1.1', 'expected http/1.1'));
  await check('h1only picks http/1.1 even when h2 offered first', async () => assert(await alpn(P.h1only, ['h2', 'http/1.1']) === 'http/1.1', 'expected http/1.1'));
  await check('h1only rejects an h2-only offer', async () => {
    try {
      const a = await alpn(P.h1only, ['h2']); assert(a !== 'h2', `negotiated ${a}`);
    } catch (e) { /* handshake failure is the expected outcome */ }
  });
  await check('h2only rejects an http/1.1-only offer', async () => {
    let ok = false;
    try {
      const a = await alpn(P.h2only, ['http/1.1']); ok = a !== 'http/1.1';
    } catch (_) { ok = true; }
    assert(ok, 'h2only accepted http/1.1');
  });

  console.log('\nEcho & multiplexing (dual)');
  const s = h2connect(P.dual);
  await check('echo over h2 reports protocol 2.0 and pseudo-headers', async () => {
    const r = await h2request(s, '/echo?x=1');
    const b = JSON.parse(r.body);
    assert(b.protocol === '2.0', `protocol ${b.protocol}`);
    assert(b.pseudoHeaders[':authority'] === `localhost:${P.dual}`, `authority ${b.pseudoHeaders[':authority']}`);
    assert(r.headers['x-protocol'] === '2.0', 'x-protocol header');
  });
  await check('two requests share one connection id with increasing stream ids', async () => {
    const [a, b] = await Promise.all([h2request(s, '/echo'), h2request(s, '/echo')]);
    assert(a.headers['x-connection-id'] === b.headers['x-connection-id'], 'different connection ids');
    assert(a.headers['x-stream-id'] !== b.headers['x-stream-id'], 'same stream id');
  });
  await check('POST body echoed with sha256', async () => {
    const r = await h2request(s, '/echo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' });
    const b = JSON.parse(r.body);
    assert(b.body.json.a === 1 && b.body.size === 7, JSON.stringify(b.body));
  });
  await check('trailers delivered', async () => {
    const r = await h2request(s, '/trailers');
    assert(r.trailers && r.trailers['x-done'] === 'true', `trailers ${JSON.stringify(r.trailers)}`);
  });
  await check('gzip route sets content-encoding', async () => {
    const r = await h2request(s, '/gzip');
    assert(r.headers['content-encoding'] === 'gzip', 'no content-encoding');
  });
  await check('push route pushes when client allows', async () => {
    const pushed = [];
    s.on('stream', (ps, h) => {
      pushed.push(h[':path']); ps.resume();
    });
    const r = await h2request(s, '/push');
    const b = JSON.parse(r.body);
    assert(b.pushed.length === 2, `pushed ${JSON.stringify(b.pushed)}`);
  });
  await check('RST_STREAM REFUSED_STREAM surfaces as stream error', async () => {
    try {
      await h2request(s, '/rst?code=REFUSED_STREAM'); throw new Error('no error');
    } catch (e) { assert(/REFUSED_STREAM|code 7|NGHTTP2/i.test(e.message + e.code), e.message); }
  });
  await check('content-length mismatch surfaces as an error or short body', async () => {
    try {
      const r = await h2request(s, '/content-length-mismatch'); assert(r.body.length !== 100, 'got full length?');
    } catch (_) { /* error is acceptable */ }
  });
  await check('GOAWAY after /goaway closes the session', async () => {
    const s2 = h2connect(P.dual);
    const goaway = new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('no goaway')), 2000); s2.once('goaway', () => {
        clearTimeout(t); resolve();
      });
    });
    await h2request(s2, '/goaway');
    await goaway;
    s2.close();
  });
  s.close();

  console.log('\nOther listeners');
  await check('h1only serves HTTP/1.1', async () => {
    const r = await h1get(`https://localhost:${P.h1only}/echo`); assert(JSON.parse(r.body).protocol === '1.1', 'not 1.1');
  });
  await check('plain serves cleartext HTTP/1.1', async () => {
    const r = await h1get(`http://localhost:${P.plain}/echo`); assert(JSON.parse(r.body).protocol === '1.1', 'not 1.1');
  });
  await check('h2c serves prior-knowledge h2', async () => {
    const c = http2.connect(`http://localhost:${P.h2c}`);
    const r = await h2request(c, '/echo');
    c.close();
    assert(JSON.parse(r.body).protocol === '2.0', 'not 2.0');
  });
  await check('mtls rejects a client without a certificate', async () => {
    const c = h2connect(P.mtls);
    let rejected = false;
    try { await h2request(c, '/echo'); } catch (_) { rejected = true; }
    c.on('error', () => {});
    c.destroy();
    assert(rejected, 'request succeeded without a client cert');
  });
  await check('mtls accepts the client certificate and reports its CN', async () => {
    const c = h2connect(P.mtls, clientCert);
    const r = await h2request(c, '/echo');
    c.close();
    assert(JSON.parse(r.body).tls.clientCertificate.subject === 'bruno-qa-client', 'wrong CN');
  });
  await check('limited advertises MAX_CONCURRENT_STREAMS=2', async () => {
    const c = h2connect(P.limited);
    await new Promise((r) => c.once('remoteSettings', r));
    const max = c.remoteSettings.maxConcurrentStreams;
    c.close();
    assert(max === 2, `got ${max}`);
  });
  await check('badcert fails verification against the testbed CA', async () => {
    let failedVerify = false;
    try { await alpn(P.badcert, ['h2']); } catch (_) { failedVerify = true; }
    assert(failedVerify, 'verification passed');
  });

  console.log('\nProxies');
  const tunnel = (p, auth) => new Promise((resolve, reject) => {
    const sock = net.connect(p, '127.0.0.1', () => {
      sock.write(`CONNECT proxied.localhost:${P.dual} HTTP/1.1\r\nHost: proxied.localhost:${P.dual}\r\n${auth ? `Proxy-Authorization: Basic ${Buffer.from(auth).toString('base64')}\r\n` : ''}\r\n`);
    });
    sock.once('data', (d) => {
      sock.destroy(); resolve(d.toString().split('\r\n')[0]);
    });
    sock.on('error', reject);
  });
  await check('proxy (3128) opens CONNECT tunnel without auth', async () => assert(/ 200 /.test(await tunnel(P.proxy)), 'not 200'));
  await check('proxyauth (3129) returns 407 without credentials', async () => assert(/ 407 /.test(await tunnel(P.proxyauth)), 'not 407'));
  await check('proxyauth (3129) tunnels with bruno:proxypass', async () => assert(/ 200 /.test(await tunnel(P.proxyauth, 'bruno:proxypass')), 'not 200'));
  await check('proxyauth (3129) returns 407 for wrong password', async () => assert(/ 407 /.test(await tunnel(P.proxyauth, 'bruno:nope')), 'not 407'));

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
})();
