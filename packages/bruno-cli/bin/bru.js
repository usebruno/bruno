#!/usr/bin/env node

// TLS compatibility: keep working with older servers while advertising X25519MLKEM768.
//
// OpenSSL can advertise the group without a key share; BoringSSL cannot and retries instead.
// See configureHybridTlsDefaults in bruno-requests/src/utils/hybrid-key-exchange.ts.
//
// WARNING (reaper): removing this is a BREAKING CHANGE. Mark that release as breaking, because
// requests to those older servers will start failing.
const { configureHybridTlsDefaults } = require('@usebruno/requests');
configureHybridTlsDefaults();

require('../src').run();
