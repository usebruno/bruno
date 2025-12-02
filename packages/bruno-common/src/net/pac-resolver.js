const pac = require('pac-resolver');
const fetch = require('node-fetch');

// Prefer native/global AbortController when available, otherwise try to use
// fetch-provided AbortController or fall back to the 'abort-controller' package.
let AbortController = globalThis.AbortController || (fetch && fetch.AbortController) || null;
if (!AbortController) {
  try {
    // this package may not be installed in all environments
    // requiring it is best-effort — if it fails we'll use a safe noop fallback below
     
    AbortController = require('abort-controller');
  } catch (e) {
    AbortController = null;
  }
}
const crypto = require('crypto');

// Simple in-memory cache for compiled resolvers
const CACHE = new Map();

function hash(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function downloadPac(pacUrl, timeoutMs = 5000) {
  console.log(`Starting download of PAC from ${pacUrl} with timeout ${timeoutMs}ms`);
  // create a real AbortController when possible; otherwise provide a noop
  // controller so code can call `abort()` without throwing.
  let controller;
  if (AbortController) {
    controller = new AbortController();
  } else if (fetch && fetch.AbortController) {
    controller = new fetch.AbortController();
  } else {
    controller = { signal: undefined, abort: () => { } };
  }
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

  if (pacUrl) {
    const key = `url:${pacUrl}`;
    const now = Date.now();
    const cached = CACHE.get(key);
    if (cached && now - cached.ts < cacheTtlMs) {
      return cached.wrapper;
    }

    // download
    const script = await downloadPac(pacUrl, opts.timeoutMs || 5000);
    const resolverFn = pac(script);
    const wrapper = createWrapper(resolverFn);
    CACHE.set(key, { wrapper, ts: Date.now() });
    return wrapper;
  }
}

function createWrapper(resolverFn) {
  return {
    resolve: async (url) => {
      try {
        const u = new URL(url);
        const host = u.hostname;
        // resolverFn(url, host) => returns string like 'PROXY x:8080; DIRECT'
        const out = await resolverFn(url, host);
        if (!out || typeof out !== 'string') return [];
        return out.split(';').map(s => s.trim()).filter(Boolean);
      } catch (err) {
        throw err;
      }
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
