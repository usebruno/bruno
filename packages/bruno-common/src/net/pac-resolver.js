const { createPacResolver } = require('pac-resolver');
const { getQuickJS } = require('quickjs-emscripten');
const fetch = require('node-fetch');

let AbortController = globalThis.AbortController;

// Simple in-memory cache for compiled resolvers
const CACHE = new Map();

// QuickJS singleton — initialized once, reused for all PAC compilations
let qjsPromise = null;
function getQJS() {
  if (!qjsPromise) qjsPromise = getQuickJS();
  return qjsPromise;
}

async function downloadPac(pacUrl, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(pacUrl, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Failed to fetch PAC (${res.status})`);
    return await res.text();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function getPacResolver({ pacUrl, opts = {} }) {
  /**
  * Get a resolver for a pacUrl.
  * Returns { resolve(url): Promise<string[]>, dispose(): void }
  */

  // 5 minutes default cache TTL
  const cacheTtlMs = opts.cacheTtlMs || 5 * 60 * 1000;

  if (!pacUrl) {
    throw new Error('pacUrl must be provided');
  }

  const key = `url:${pacUrl}`;
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && now - cached.ts < cacheTtlMs) {
    return cached.wrapper;
  }

  // download and compile using QuickJS sandbox (fixes CVE GHSA-9j49-mfvp-vmhm)
  // https://github.com/advisories/GHSA-9j49-mfvp-vmhm
  const script = await downloadPac(pacUrl, opts.timeoutMs || 5000);
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
      return out.split(';').map(s => s.trim()).filter(Boolean);
    },
    dispose: () => {
      // noop for now — cache eviction handled globally
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
