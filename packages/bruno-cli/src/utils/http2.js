/**
 * HTTP/2 for `bru run` via the custom transport (POC).
 *
 * Scope: `--http-version http1|http2`. `http2` is prior knowledge (forced) — it fails against an
 * HTTP/1.1-only server, like the desktop http2 mode. `auto` (ALPN negotiation + fallback) is a
 * follow-up; it is the only part that needs an async probe, so it is intentionally left out here.
 * Direct requests only for the POC — a proxied request in http2 falls back to HTTP/1.1.
 */
const { URL } = require('url');
const { createHttp2Transport } = require('@usebruno/requests');

const applyBasicAuthHeader = (config) => {
  if (!config) return false;
  let username;
  let password;
  if (config.auth && typeof config.auth === 'object') {
    username = config.auth.username || '';
    password = config.auth.password || '';
  } else if (typeof config.url === 'string') {
    try {
      const parsed = new URL(config.url);
      if (parsed.username || parsed.password) {
        username = decodeURIComponent(parsed.username);
        password = decodeURIComponent(parsed.password);
        parsed.username = '';
        parsed.password = '';
        config.url = parsed.toString();
      }
    } catch (_) {
      return false;
    }
  }
  if (username === undefined) return false;
  const value = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  if (config.headers && typeof config.headers.set === 'function') config.headers.set('Authorization', value);
  else config.headers = { ...(config.headers || {}), Authorization: value };
  delete config.auth;
  return true;
};

/**
 * Attach the custom HTTP/2 transport to the axios config when `mode` is http2 and the URL is https.
 * Synchronous (no ALPN probe). Clears config.transport otherwise, so a redirect hop to an h1 URL
 * does not keep a previous hop's transport.
 */
const applyHttp2Transport = ({ config, mode }) => {
  if (mode !== 'http2') {
    return;
  }
  let parsed;
  try {
    parsed = new URL(config.url);
  } catch (_) {
    delete config.transport;
    return;
  }
  // No h2c: cleartext stays HTTP/1.1. Proxied h2 is a CLI follow-up.
  if (parsed.protocol !== 'https:' || (config.httpsAgent && config.httpsAgent.proxy)) {
    delete config.transport;
    return;
  }
  const agentOptions = (config.httpsAgent && config.httpsAgent.options) || {};
  config.transport = createHttp2Transport({ tlsOptions: agentOptions, mode: 'http2', lookup: config.lookup });
  applyBasicAuthHeader(config);
};

module.exports = { applyHttp2Transport };
