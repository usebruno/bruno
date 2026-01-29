import crypto from 'node:crypto';
import https from 'node:https';
import type { Agent as HttpAgent } from 'node:http';
import type { Agent as HttpsAgent } from 'node:https';
import { createTimelineAgentClass, type TimelineEntry, type AgentOptions, type AgentClass } from './timeline-agent';

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
 * Cache for timeline-wrapped agent classes.
 * Prevents creating new class definitions on every call.
 */
const timelineClassCache = new WeakMap<any, AgentClass>();

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
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

/**
 * Generate a cache key from agent options.
 * Uses a hash of the serialized options to create a compact key.
 */
function getAgentCacheKey(agentClassId: number, options: AgentOptions, proxyUri: string | null = null): string {
  // Extract the TLS-relevant options for the cache key
  const keyData = {
    agentClassId,
    proxyUri,
    rejectUnauthorized: options.rejectUnauthorized,
    // Hash certificates and passphrase instead of including full content
    ca: hashValue(options.ca as string | Buffer | undefined),
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
 * Get a cached timeline-wrapped agent class.
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
 * Get or create a cached agent.
 * Reuses existing agents to enable SSL session caching.
 * Uses LRU-style eviction when cache exceeds MAX_AGENT_CACHE_SIZE.
 * Automatically wraps the agent class with timeline logging support.
 *
 * @param BaseAgentClass - The base agent class (https.Agent, HttpProxyAgent, etc.)
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
  const agentClassId = getAgentClassId(BaseAgentClass);
  const cacheKey = getAgentCacheKey(agentClassId, options, proxyUri);

  if (agentCache.has(cacheKey)) {
    // Move to end for LRU (delete and re-add)
    const agent = agentCache.get(cacheKey)!;
    agentCache.delete(cacheKey);
    agentCache.set(cacheKey, agent);

    // Update timeline reference for new request
    // The cached agent was created with a previous timeline,
    // but we need TLS events to go to the current request's timeline
    if (timeline && 'timeline' in agent) {
      (agent as any).timeline = timeline;
    }

    return agent;
  }

  // Wrap the agent class with timeline support (cached)
  const AgentClass = getTimelineAgentClass(BaseAgentClass);

  let agent: HttpAgent | HttpsAgent;
  if (proxyUri) {
    // For timeline agents, pass proxy via options.proxy and timeline as second arg
    agent = new AgentClass({ ...options, proxy: proxyUri }, timeline || undefined);
  } else {
    agent = new AgentClass(options, timeline || undefined);
  }

  // Evict oldest entry if cache is full (LRU eviction)
  if (agentCache.size >= MAX_AGENT_CACHE_SIZE) {
    const firstEntry = agentCache.keys().next();
    if (!firstEntry.done && firstEntry.value !== undefined) {
      const evictedAgent = agentCache.get(firstEntry.value);
      agentCache.delete(firstEntry.value);
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

export { getOrCreateAgent, clearAgentCache, getAgentCacheSize };
