#!/usr/bin/env node

// TLS compatibility: keep working with older servers while advertising X25519MLKEM768.
//
// OpenSSL 3.5 may send a large hybrid key share in the first ClientHello. The string below
// advertises the group without including its key share up front (unsupported runtimes skip it).
// Electron cannot do this and retries instead; see bruno-requests/src/utils/hybrid-key-exchange.ts.
//
// WARNING (reaper): removing this is a BREAKING CHANGE. Mark that release as breaking, because
// requests to those older servers will start failing.
const tls = require('node:tls');

const groups = 'DEFAULT:-X25519MLKEM768:?X25519MLKEM768';
try {
  tls.createSecureContext({ ecdhCurve: groups });
  tls.DEFAULT_ECDH_CURVE = groups;
} catch {}

require('../src').run();
