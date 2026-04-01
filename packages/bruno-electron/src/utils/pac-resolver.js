const axios = require('axios');
const https = require('node:https');
const { createPacResolver } = require('pac-resolver');
const { getQuickJS } = require('quickjs-emscripten');

// Simple in-memory cache for compiled resolvers
const CACHE = new Map();

// QuickJS singleton — initialized once, reused for all PAC compilations
let qjsPromise = null;
function getQJS() {
  if (!qjsPromise) qjsPromise = getQuickJS();
  return qjsPromise;
}

/**
 * Download a PAC file using axios with the same TLS configuration as regular requests.
 * The PAC file itself is always fetched directly (proxy: false) — using a proxy to
 * discover the proxy would be circular.
 *
 * Only CA/TLS validation options are forwarded (not client certs — the PAC server
 * does not need to authenticate the client).
 */
async function downloadPac(pacUrl, tlsOptions, timeoutMs) {
  const config = {
    timeout: timeoutMs,
    proxy: false,
    responseType: 'text',
    maxRedirects: 3
  };

  if (pacUrl.startsWith('https://')) {
    config.httpsAgent = new https.Agent({
      ca: tlsOptions.ca,
      rejectUnauthorized: tlsOptions.rejectUnauthorized,
      minVersion: tlsOptions.minVersion
    });
  }

  try {
    const response = await axios.get(pacUrl, config);
    return response.data;
  } catch (err) {
    // axios throws for non-2xx responses; surface a consistent error message
    if (err.response) {
      throw new Error(`Failed to fetch PAC (${err.response.status})`);
    }
    throw err;
  }
}

async function getPacResolver({ pacUrl, httpsAgentRequestFields = {}, opts = {} }) {
  /**
   * Get a resolver for a pacUrl.
   * Returns { resolve(url): Promise<string[]>, dispose(): void }
   *
   * @param {string} pacUrl - URL of the PAC file
   * @param {object} httpsAgentRequestFields - TLS options from the current request context
   *   (ca, rejectUnauthorized, minVersion). Used to validate the PAC server certificate.
   */
  if (!pacUrl) {
    throw new Error('pacUrl must be provided');
  }

  // 5 minutes default cache TTL
  const cacheTtlMs = opts.cacheTtlMs || 5 * 60 * 1000;
  const key = `url:${pacUrl}`;
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && now - cached.ts < cacheTtlMs) {
    return cached.wrapper;
  }

  const tlsOptions = {
    ca: httpsAgentRequestFields.ca,
    rejectUnauthorized: httpsAgentRequestFields.rejectUnauthorized,
    minVersion: httpsAgentRequestFields.minVersion
  };

  // download and compile using QuickJS sandbox (fixes CVE GHSA-9j49-mfvp-vmhm)
  // https://github.com/advisories/GHSA-9j49-mfvp-vmhm
  const script = await downloadPac(pacUrl, tlsOptions, opts.timeoutMs || 5000);
  const qjs = await getQJS();
  const resolverFn = createPacResolver(qjs, script);
  const wrapper = createWrapper(resolverFn);
  CACHE.set(key, { wrapper, ts: Date.now() });
  return wrapper;
}

function createWrapper(resolverFn) {
  return {
    resolve: async (url) => {
      const u = new URL(url);
      const host = u.hostname;
      // resolverFn(url, host) => returns string like 'PROXY x:8080; DIRECT'
      const out = await resolverFn(url, host);
      if (!out || typeof out !== 'string') return [];
      return out.split(';').map((s) => s.trim()).filter(Boolean);
    },
    dispose: () => {
      // noop — cache eviction handled globally via clearCache()
    }
  };
}

function clearCache(keyPrefix) {
  if (!keyPrefix) {
    CACHE.clear();
    return;
  }
  for (const key of Array.from(CACHE.keys())) {
    if (key.startsWith(keyPrefix)) CACHE.delete(key);
  }
}

module.exports = { getPacResolver, clearCache, _CACHE: CACHE };
