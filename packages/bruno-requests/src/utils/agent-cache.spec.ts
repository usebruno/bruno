import https from 'node:https';
import http from 'node:http';
import { getOrCreateAgent, clearAgentCache, getAgentCacheSize } from './agent-cache';

describe('Agent Cache', () => {
  beforeEach(() => {
    clearAgentCache();
  });

  describe('getOrCreateAgent', () => {
    it('creates a new agent when cache is empty', () => {
      const agent = getOrCreateAgent(https.Agent, { rejectUnauthorized: true });

      expect(agent).toBeInstanceOf(https.Agent);
      expect(getAgentCacheSize()).toBe(1);
    });

    it('returns cached agent for identical options', () => {
      const options = { rejectUnauthorized: true, keepAlive: true };

      const agent1 = getOrCreateAgent(https.Agent, options);
      const agent2 = getOrCreateAgent(https.Agent, options);

      expect(agent1).toBe(agent2);
      expect(getAgentCacheSize()).toBe(1);
    });

    it('creates separate agents for different rejectUnauthorized values', () => {
      const agent1 = getOrCreateAgent(https.Agent, { rejectUnauthorized: true });
      const agent2 = getOrCreateAgent(https.Agent, { rejectUnauthorized: false });

      expect(agent1).not.toBe(agent2);
      expect(getAgentCacheSize()).toBe(2);
    });

    it('creates separate agents for different CA certificates', () => {
      const agent1 = getOrCreateAgent(https.Agent, { ca: 'cert-a' });
      const agent2 = getOrCreateAgent(https.Agent, { ca: 'cert-b' });

      expect(agent1).not.toBe(agent2);
      expect(getAgentCacheSize()).toBe(2);
    });

    it('creates separate agents for different proxy URIs', () => {
      const options = { rejectUnauthorized: true };

      const agent1 = getOrCreateAgent(https.Agent, options, 'http://proxy1:8080');
      const agent2 = getOrCreateAgent(https.Agent, options, 'http://proxy2:8080');

      expect(agent1).not.toBe(agent2);
      expect(getAgentCacheSize()).toBe(2);
    });

    it('creates separate agents for different agent classes', () => {
      const options = { keepAlive: true };

      const httpsAgent = getOrCreateAgent(https.Agent, options);
      const httpAgent = getOrCreateAgent(http.Agent, options);

      expect(httpsAgent).not.toBe(httpAgent);
      expect(getAgentCacheSize()).toBe(2);
    });
  });

  describe('timeline support', () => {
    it('initializes timeline array on new agents', () => {
      const agent = getOrCreateAgent(https.Agent, {}) as any;

      expect(Array.isArray(agent.timeline)).toBe(true);
    });

    it('uses provided timeline array', () => {
      const timeline: any[] = [];
      const agent = getOrCreateAgent(https.Agent, {}, null, timeline) as any;

      expect(agent.timeline).toBe(timeline);
    });

    it('updates timeline reference on cached agents', () => {
      const timeline1: any[] = [];
      const timeline2: any[] = [];

      const agent1 = getOrCreateAgent(https.Agent, {}, null, timeline1) as any;
      expect(agent1.timeline).toBe(timeline1);

      const agent2 = getOrCreateAgent(https.Agent, {}, null, timeline2) as any;
      expect(agent1).toBe(agent2);
      expect(agent2.timeline).toBe(timeline2);
    });

    it('logs SSL validation status on agent creation', () => {
      const timeline: any[] = [];
      getOrCreateAgent(https.Agent, { rejectUnauthorized: true }, null, timeline);

      const sslEntry = timeline.find((e) => e.message.includes('SSL validation'));
      expect(sslEntry).toBeDefined();
      expect(sslEntry.message).toContain('enabled');
    });

    it('logs SSL validation disabled when rejectUnauthorized is false', () => {
      const timeline: any[] = [];
      getOrCreateAgent(https.Agent, { rejectUnauthorized: false }, null, timeline);

      const sslEntry = timeline.find((e) => e.message.includes('SSL validation'));
      expect(sslEntry).toBeDefined();
      expect(sslEntry.message).toContain('disabled');
    });
  });

  describe('clearAgentCache', () => {
    it('removes all cached agents', () => {
      getOrCreateAgent(https.Agent, { rejectUnauthorized: true });
      getOrCreateAgent(https.Agent, { rejectUnauthorized: false });
      expect(getAgentCacheSize()).toBe(2);

      clearAgentCache();
      expect(getAgentCacheSize()).toBe(0);
    });

    it('destroys all agents when clearing cache', () => {
      const destroyMocks: jest.Mock[] = [];

      // Create several agents and attach mock destroy functions
      for (let i = 0; i < 5; i++) {
        const agent = getOrCreateAgent(https.Agent, { ca: `cert-${i}` }) as any;
        const mock = jest.fn();
        agent.destroy = mock;
        destroyMocks.push(mock);
      }

      expect(getAgentCacheSize()).toBe(5);

      clearAgentCache();

      expect(getAgentCacheSize()).toBe(0);
      // All agents should have been destroyed
      destroyMocks.forEach((mock) => {
        expect(mock).toHaveBeenCalled();
      });
    });
  });

  describe('LRU eviction', () => {
    it('maintains cache size under limit', () => {
      // Create many agents with different options
      for (let i = 0; i < 150; i++) {
        getOrCreateAgent(https.Agent, { ca: `cert-${i}` });
      }

      // Cache should be capped at MAX_AGENT_CACHE_SIZE (100)
      expect(getAgentCacheSize()).toBeLessThanOrEqual(100);
    });

    it('destroys evicted agents to prevent memory leaks', () => {
      // Create first agent and attach a mock destroy function
      const firstAgent = getOrCreateAgent(https.Agent, { ca: 'cert-to-evict' }) as any;
      const destroyMock = jest.fn();
      firstAgent.destroy = destroyMock;

      // Fill cache to trigger eviction (100 more agents will evict the first one)
      for (let i = 0; i < 100; i++) {
        getOrCreateAgent(https.Agent, { ca: `cert-${i}` });
      }

      // First agent should have been evicted and destroyed
      expect(destroyMock).toHaveBeenCalled();
    });
  });
});
