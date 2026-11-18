#!/usr/bin/env node

// TLS key exchange groups: support post-quantum servers without breaking older ones.
//
// Node's OpenSSL 3.5 default sends a ~1.2KB hybrid post-quantum key share (X25519MLKEM768) in
// the first ClientHello, which some older servers (e.g. nginx with small buffer limits) reject.
// Start from OpenSSL's default groups, but only advertise the hybrid group ('?' skips it if the
// runtime lacks it): the first ClientHello carries a classical key share, and servers that want
// the hybrid group request it with a HelloRetryRequest. The Electron app (BoringSSL) can't do this
// and retries instead; see bruno-requests/src/utils/hybrid-key-exchange.ts.
//
// OpenSSL < 3.5 rejects this syntax; its 'auto' default is classical-only, so it's left as is.
//
// WARNING (reaper): sending a post-quantum key share up front is a BREAKING CHANGE. Mark that
// release as breaking, because requests to those older servers will start failing.
const tls = require('node:tls');

const groups = 'DEFAULT:-X25519MLKEM768:?X25519MLKEM768';
try {
  tls.createSecureContext({ ecdhCurve: groups });
  tls.DEFAULT_ECDH_CURVE = groups;
} catch {}

require('../src').run();
