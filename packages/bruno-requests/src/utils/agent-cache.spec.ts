import https from 'node:https';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { getOrCreateAgent, getOrCreateHttpAgent, clearAgentCache, getAgentCacheSize } from './agent-cache';

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

    it('logs when reusing a cached HTTPS agent', () => {
      const timeline1: any[] = [];
      const timeline2: any[] = [];

      // First call creates new agent - no reuse message
      getOrCreateAgent(https.Agent, {}, null, timeline1);
      expect(timeline1.some((e) => e.message.includes('Reusing cached agent'))).toBe(false);

      // Second call reuses cached agent - should log reuse message with SSL session reuse
      getOrCreateAgent(https.Agent, {}, null, timeline2);
      expect(timeline2.some((e) => e.message.includes('Reusing cached agent'))).toBe(true);
      expect(timeline2.some((e) => e.message.includes('SSL session reuse'))).toBe(true);
    });

    it('logs when reusing a cached HTTP agent', () => {
      const timeline1: any[] = [];
      const timeline2: any[] = [];

      // First call creates new agent - no reuse message
      getOrCreateHttpAgent(http.Agent, { keepAlive: true }, null, timeline1);
      expect(timeline1.some((e) => e.message.includes('Reusing cached agent'))).toBe(false);

      // Second call reuses cached agent - should log reuse message with connection reuse
      getOrCreateHttpAgent(http.Agent, { keepAlive: true }, null, timeline2);
      expect(timeline2.some((e) => e.message.includes('Reusing cached agent'))).toBe(true);
      expect(timeline2.some((e) => e.message.includes('connection reuse'))).toBe(true);
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

  describe('concurrent requests timeline isolation', () => {
    it('isolates timeline events for concurrent requests using the same cached agent', () => {
      const timeline1: any[] = [];
      const timeline2: any[] = [];

      // Get the same agent twice with different timelines (simulating concurrent requests)
      const agent1 = getOrCreateAgent(https.Agent, {}, null, timeline1) as any;
      const agent2 = getOrCreateAgent(https.Agent, {}, null, timeline2) as any;

      // Both should return the same cached agent
      expect(agent1).toBe(agent2);

      // Create mock sockets to simulate concurrent connections
      const mockSocket1 = new EventEmitter() as any;
      mockSocket1.remoteAddress = '1.2.3.4';
      mockSocket1.remotePort = 443;
      mockSocket1.getProtocol = () => 'TLSv1.3';
      mockSocket1.getCipher = () => ({ name: 'AES-256-GCM', version: 'TLSv1.3' });
      mockSocket1.alpnProtocol = 'h2';
      mockSocket1.getPeerCertificate = () => ({
        subject: { CN: 'example.com' },
        valid_from: 'Jan 1 00:00:00 2024 GMT',
        valid_to: 'Jan 1 00:00:00 2025 GMT'
      });
      mockSocket1.authorized = true;

      const mockSocket2 = new EventEmitter() as any;
      mockSocket2.remoteAddress = '5.6.7.8';
      mockSocket2.remotePort = 443;
      mockSocket2.getProtocol = () => 'TLSv1.3';
      mockSocket2.getCipher = () => ({ name: 'AES-256-GCM', version: 'TLSv1.3' });
      mockSocket2.alpnProtocol = 'http/1.1';
      mockSocket2.getPeerCertificate = () => ({
        subject: { CN: 'other.com' },
        valid_from: 'Jan 1 00:00:00 2024 GMT',
        valid_to: 'Jan 1 00:00:00 2025 GMT'
      });
      mockSocket2.authorized = true;

      // Mock createConnection to return our mock sockets
      const originalCreateConnection = Object.getPrototypeOf(Object.getPrototypeOf(agent1)).createConnection;
      let callCount = 0;
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(agent1)), 'createConnection').mockImplementation(function (this: any, options: any, callback: any) {
        callCount++;
        return callCount === 1 ? mockSocket1 : mockSocket2;
      });

      // Simulate request 1 starting - this captures timeline1 in the closure
      agent1.timeline = timeline1;
      const socket1 = agent1.createConnection({ host: 'example.com', port: 443 }, () => {});

      // Before request 1's events fire, request 2 starts and updates agent.timeline
      // This simulates the race condition
      agent1.timeline = timeline2;
      const socket2 = agent1.createConnection({ host: 'other.com', port: 443 }, () => {});

      // Now fire events for both sockets - they should go to their respective timelines
      mockSocket1.emit('connect');
      mockSocket1.emit('secureConnect');

      mockSocket2.emit('connect');
      mockSocket2.emit('secureConnect');

      // Verify timeline1 only contains events for request 1 (example.com)
      const timeline1Messages = timeline1.map((e) => e.message);
      expect(timeline1Messages.some((m) => m.includes('example.com'))).toBe(true);
      expect(timeline1Messages.some((m) => m.includes('other.com'))).toBe(false);

      // Verify timeline2 only contains events for request 2 (other.com)
      const timeline2Messages = timeline2.map((e) => e.message);
      expect(timeline2Messages.some((m) => m.includes('other.com'))).toBe(true);
      expect(timeline2Messages.some((m) => m.includes('example.com'))).toBe(false);

      // Restore the original implementation
      jest.restoreAllMocks();
    });

    it('logs events to captured timeline even after agent.timeline is reassigned', () => {
      const timeline1: any[] = [];
      const timeline2: any[] = [];

      const agent = getOrCreateAgent(https.Agent, {}, null, timeline1) as any;

      // Create a mock socket
      const mockSocket = new EventEmitter() as any;
      mockSocket.remoteAddress = '1.2.3.4';
      mockSocket.remotePort = 443;

      // Mock createConnection
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(agent)), 'createConnection').mockImplementation(() => mockSocket);

      // Start creating connection - this captures timeline1
      const socket = agent.createConnection({ host: 'test.com', port: 443 }, () => {});

      // Reassign agent.timeline (simulating another request coming in)
      agent.timeline = timeline2;

      // Fire the connect event - this should still go to timeline1 (captured reference)
      mockSocket.emit('connect');

      // Verify event went to timeline1, not timeline2
      expect(timeline1.some((e) => e.message.includes('Connected to test.com'))).toBe(true);
      expect(timeline2.some((e) => e.message.includes('Connected to test.com'))).toBe(false);

      jest.restoreAllMocks();
    });
  });
});
