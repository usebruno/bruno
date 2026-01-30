import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import type { Agent as HttpAgent } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';
import { createTimelineAgentClass, createTimelineHttpAgentClass, type TimelineEntry, type AgentOptions, type HttpAgentOptions, type AgentClass, type HttpAgentClass } from './timeline-agent';

/**
 * Agent cache for SSL session reuse.
 * Agents are cached by their configuration to enable TLS session resumption,
 * which significantly reduces SSL handshake time for repeated requests.
 */
const agentCache = new Map<string, HttpAgent | HttpsAgent>();

/**
 * Maximum number of agents to cache.
 * 100 provides a good balance between memory usage and SSL session reuse.
 * Each agent maintains persistent connections, so higher values increase memory.
 * Lower values may reduce SSL session hits for users with many different TLS configs.
 */
const MAX_AGENT_CACHE_SIZE = 100;

/**
 * Cache for timeline-wrapped HTTPS agent classes.
 * Prevents creating new class definitions on every call.
 */
const timelineClassCache = new WeakMap<any, AgentClass>();

/**
 * Cache for timeline-wrapped HTTP agent classes.
 * Prevents creating new class definitions on every call.
 */
const timelineHttpClassCache = new WeakMap<any, HttpAgentClass>();

/**
 * Map to assign unique IDs to agent classes.
 * Used for cache key generation since different classes may have the same name.
 */
const agentClassIdMap = new WeakMap<any, number>();
let agentClassIdCounter = 0;

function getAgentClassId(AgentClass: any): number {
  if (agentClassIdMap.has(AgentClass)) {
    return agentClassIdMap.get(AgentClass)!;
  }
  const id = ++agentClassIdCounter;
  agentClassIdMap.set(AgentClass, id);
  return id;
}

/**
 * Hash a value using SHA-256 and return a truncated hex string.
 * Truncated to 16 chars for compact cache keys while maintaining uniqueness.
 */
function hashValue(value: string | Buffer | undefined): string | null {
  if (!value) return null;
  const data = Buffer.isBuffer(value) ? value : String(value);
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

/**
 * Hash a CA value which can be a single value or an array of certificates.
 * Node.js TLS options allow ca to be string | Buffer | (string | Buffer)[].
 */
function hashCaValue(value: string | Buffer | (string | Buffer)[] | undefined): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    // Concatenate all values with separator and hash together
    const combined = value.map((v) => (Buffer.isBuffer(v) ? v.toString('base64') : String(v))).join('|');
    return crypto.createHash('sha256').update(combined).digest('hex').slice(0, 16);
  }
  const data = Buffer.isBuffer(value) ? value : String(value);
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

/**
 * Generate a cache key from HTTPS agent options.
 * Uses a hash of the serialized options to create a compact key.
 */
function getAgentCacheKey(agentClassId: number, options: AgentOptions, proxyUri: string | null = null): string {
  // Extract the TLS-relevant options for the cache key
  const keyData = {
    agentClassId,
    proxyUri,
    rejectUnauthorized: options.rejectUnauthorized,
    // Hash certificates and passphrase instead of including full content
    ca: hashCaValue(options.ca),
    cert: hashValue(options.cert),
    key: hashValue(options.key),
    pfx: hashValue(options.pfx),
    passphrase: hashValue(options.passphrase),
    minVersion: options.minVersion,
    secureProtocol: options.secureProtocol
  };
  return JSON.stringify(keyData);
}

/**
 * Generate a cache key from HTTP agent options.
 * Simpler than HTTPS since no TLS options are involved.
 */
function getHttpAgentCacheKey(agentClassId: number, options: HttpAgentOptions, proxyUri: string | null = null): string {
  const keyData = {
    agentClassId,
    proxyUri,
    keepAlive: options.keepAlive
  };
  return JSON.stringify(keyData);
}

/**
 * Get a cached timeline-wrapped HTTPS agent class.
 * Creates the wrapped class once and caches it for reuse.
 */
function getTimelineAgentClass(BaseAgentClass: any): AgentClass {
  if (timelineClassCache.has(BaseAgentClass)) {
    return timelineClassCache.get(BaseAgentClass)!;
  }
  const wrappedClass = createTimelineAgentClass(BaseAgentClass);
  timelineClassCache.set(BaseAgentClass, wrappedClass);
  return wrappedClass;
}

/**
 * Get a cached timeline-wrapped HTTP agent class.
 * Creates the wrapped class once and caches it for reuse.
 */
function getTimelineHttpAgentClass(BaseAgentClass: any): HttpAgentClass {
  if (timelineHttpClassCache.has(BaseAgentClass)) {
    return timelineHttpClassCache.get(BaseAgentClass)!;
  }
  const wrappedClass = createTimelineHttpAgentClass(BaseAgentClass);
  timelineHttpClassCache.set(BaseAgentClass, wrappedClass);
  return wrappedClass;
}

/**
 * Type for cache key generation functions.
 */
type CacheKeyFn<T> = (classId: number, options: T, proxyUri: string | null) => string;

/**
 * Type for timeline class wrapper functions.
 */
type TimelineClassFn = (base: any) => AgentClass | HttpAgentClass;

/**
 * Internal helper for agent caching with LRU eviction.
 * Shared logic for both HTTP and HTTPS agents.
 */
function getOrCreateAgentInternal<TOptions extends HttpAgentOptions>(
  BaseAgentClass: any,
  options: TOptions,
  proxyUri: string | null,
  timeline: TimelineEntry[] | null,
  getCacheKey: CacheKeyFn<TOptions>,
  getTimelineClass: TimelineClassFn,
  cacheHitMessage: string
): HttpAgent | HttpsAgent {
  const agentClassId = getAgentClassId(BaseAgentClass);
  const cacheKey = getCacheKey(agentClassId, options, proxyUri);

  if (agentCache.has(cacheKey)) {
    // Move to end for LRU (delete and re-add)
    const agent = agentCache.get(cacheKey)!;
    agentCache.delete(cacheKey);
    agentCache.set(cacheKey, agent);

    // Update timeline reference for new request
    // The cached agent was created with a previous timeline,
    // but we need events to go to the current request's timeline
    if (timeline && 'timeline' in agent) {
      (agent as any).timeline = timeline;
    }

    // Log that we're reusing a cached agent
    if (timeline) {
      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: cacheHitMessage
      });
    }

    return agent;
  }

  // Wrap the agent class with timeline support (cached)
  const AgentClass = getTimelineClass(BaseAgentClass);

  const agent = proxyUri
    ? new AgentClass({ ...options, proxy: proxyUri }, timeline || undefined)
    : new AgentClass(options, timeline || undefined);

  // Evict oldest entry if cache is full (LRU eviction)
  if (agentCache.size >= MAX_AGENT_CACHE_SIZE) {
    const firstKey = agentCache.keys().next().value;
    if (firstKey !== undefined) {
      const evictedAgent = agentCache.get(firstKey);
      agentCache.delete(firstKey);
      // Destroy the agent to release its sockets and prevent memory leaks
      if (evictedAgent && typeof (evictedAgent as any).destroy === 'function') {
        (evictedAgent as any).destroy();
      }
    }
  }

  agentCache.set(cacheKey, agent);
  return agent;
}

/**
 * Get or create a cached HTTPS agent.
 * Reuses existing agents to enable SSL session caching.
 * Uses LRU-style eviction when cache exceeds MAX_AGENT_CACHE_SIZE.
 * Automatically wraps the agent class with timeline logging support.
 *
 * @param BaseAgentClass - The base agent class (https.Agent, HttpsProxyAgent, etc.)
 * @param options - Agent options (TLS settings, etc.)
 * @param proxyUri - Proxy URI if using a proxy
 * @param timeline - Timeline array for logging TLS events
 */
function getOrCreateAgent(
  BaseAgentClass: any,
  options: AgentOptions,
  proxyUri: string | null = null,
  timeline: TimelineEntry[] | null = null
): HttpAgent | HttpsAgent {
  return getOrCreateAgentInternal(
    BaseAgentClass,
    options,
    proxyUri,
    timeline,
    getAgentCacheKey,
    getTimelineAgentClass,
    'Reusing cached agent (SSL session reuse enabled)'
  );
}

/**
 * Get or create a cached HTTP agent.
 * Reuses existing agents to enable connection reuse.
 * Uses LRU-style eviction when cache exceeds MAX_AGENT_CACHE_SIZE.
 * Automatically wraps the agent class with timeline logging support.
 *
 * @param BaseAgentClass - The base HTTP agent class (http.Agent, HttpProxyAgent, etc.)
 * @param options - Agent options
 * @param proxyUri - Proxy URI if using a proxy
 * @param timeline - Timeline array for logging connection events
 */
function getOrCreateHttpAgent(
  BaseAgentClass: any,
  options: HttpAgentOptions,
  proxyUri: string | null = null,
  timeline: TimelineEntry[] | null = null
): HttpAgent {
  return getOrCreateAgentInternal(
    BaseAgentClass,
    options,
    proxyUri,
    timeline,
    getHttpAgentCacheKey,
    getTimelineHttpAgentClass,
    'Reusing cached agent (connection reuse enabled)'
  ) as HttpAgent;
}

/**
 * Clear the agent cache. Useful for testing or when SSL configuration changes.
 * Destroys all cached agents to properly release their sockets.
 */
function clearAgentCache(): void {
  for (const agent of agentCache.values()) {
    if (agent && typeof (agent as any).destroy === 'function') {
      (agent as any).destroy();
    }
  }
  agentCache.clear();
}

/**
 * Get the current size of the agent cache.
 */
function getAgentCacheSize(): number {
  return agentCache.size;
}

export { getOrCreateAgent, getOrCreateHttpAgent, clearAgentCache, getAgentCacheSize };
