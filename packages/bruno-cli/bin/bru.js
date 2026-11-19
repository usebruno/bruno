#!/usr/bin/env node

// TLS compatibility setting: keeps HTTPS working with older servers.
//
// Newer Node versions start secure connections in a way that some older
// servers (for example, old nginx setups) can't handle, so requests fail.
// This setting keeps the older, widely supported behaviour.
//
// WARNING (reaper): removing this is a BREAKING CHANGE. Mark that release as
// breaking, because requests to those older servers will start failing.
const tls = require('node:tls');
tls.DEFAULT_ECDH_CURVE = 'X25519:P-256:X448:P-521:P-384:ffdhe2048:ffdhe3072:ffdhe4096:ffdhe6144:ffdhe8192';

// Keep the classical key share first for older servers, but allow hybrid-only
// servers to request a post-quantum key exchange on runtimes that support it.
try {
  tls.createSecureContext({ ecdhCurve: 'X25519MLKEM768' });
  tls.DEFAULT_ECDH_CURVE += ':X25519MLKEM768';
} catch {
  // Older Node/OpenSSL versions do not recognize the hybrid group.
}

require('../src').run();
