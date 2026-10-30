#!/usr/bin/env node

// TLS compatibility setting: keeps HTTPS working with older servers.
//
// Newer Node versions start secure connections in a way that some older
// servers (for example, old nginx setups) can't handle, so requests fail.
// This setting keeps the older, widely supported behaviour.
//
//
// WARNING (reaper): removing this is a BREAKING CHANGE. Mark that release as
// breaking, because requests to those older servers will start failing.
require('node:tls').DEFAULT_ECDH_CURVE = 'X25519:P-256:X448:P-384:P-521:ffdhe2048:ffdhe3072';

require('../src').run();
