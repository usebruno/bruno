/**
 * HTTP/2 for `bru run` on the axios-native path (POC).
 *
 * Mirrors the desktop native wiring (installHttp2NativePatch + config.httpVersion = 2), reusing the
 * electron modules directly since they have no electron dependency. `--http-version http1|http2|auto`.
 * `http2` is forced (prior knowledge); `auto` probes ALPN per origin and falls back to HTTP/1.1.
 * Direct requests only for the POC — a proxied request in http2/auto falls back to HTTP/1.1.
 */
const {
  installHttp2NativePatch,
  buildHttp2Options,
  applyBasicAuthHeader,
  stripConnectionHeaders
} = require('../../../bruno-electron/src/ipc/network/http2-native');
const { resolveHttpVersion } = require('../../../bruno-electron/src/ipc/network/http2-resolver');
const { proxyKeyFor } = require('../../../bruno-electron/src/ipc/network/http2-proxy');

const applyHttp2Native = async ({ config, mode }) => {
  if (mode !== 'http2' && mode !== 'auto') return;
  installHttp2NativePatch();

  const agentOptions = (config.httpsAgent && config.httpsAgent.options) || {};

  // POC: proxied requests over h2 are not wired in the CLI yet — use HTTP/1.1.
  if (proxyKeyFor(config.httpsAgent)) {
    delete config.httpVersion;
    delete config.http2Options;
    return;
  }

  const resolved = await resolveHttpVersion({
    url: config.url,
    mode,
    tlsOptions: agentOptions,
    lookup: config.lookup
  });

  // The redirect loop reuses this config; an h1 decision must undo an earlier hop's h2.
  if (resolved.httpVersion !== 2) {
    delete config.httpVersion;
    delete config.http2Options;
    return;
  }

  config.httpVersion = 2;
  config.http2Options = buildHttp2Options(agentOptions, config.lookup, null);
  applyBasicAuthHeader(config);
  stripConnectionHeaders(config.headers);
};

module.exports = { applyHttp2Native };
