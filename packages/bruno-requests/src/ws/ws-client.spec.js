/**
 * @jest-environment node
 */

const CONNECTING = 0;
const OPEN = 1;
const CLOSING = 2;
const CLOSED = 3;

let mockSockets = [];

jest.mock('ws', () => {
  const EventEmitter = require('events');

  class MockWebSocket extends EventEmitter {
    static CONNECTING = CONNECTING;
    static OPEN = OPEN;
    static CLOSING = CLOSING;
    static CLOSED = CLOSED;

    constructor(url) {
      super();
      this.url = url;
      this.readyState = CONNECTING;
      this.sent = [];
      mockSockets.push(this);
    }

    send(data, cb) {
      this.sent.push(data);
      if (typeof cb === 'function') cb();
    }

    // Match real sockets: close() moves to CLOSING; 'close' event arrives later.
    close() {
      this.readyState = CLOSING;
    }

    finishClose() {
      this.readyState = CLOSED;
      this.emit('close', 1000, Buffer.from('closed'));
    }

    // Match `ws`: terminate destroys immediately; 'close' arrives a tick later.
    terminate() {
      this.readyState = CLOSED;
      process.nextTick(() => this.emit('close', 1006, Buffer.from('')));
    }

    ping() {}

    open() {
      this.readyState = OPEN;
      this.emit('open');
    }
  }

  const wsModule = { WebSocket: MockWebSocket };
  return { __esModule: true, default: wsModule, WebSocket: MockWebSocket };
});

jest.mock('hexy', () => ({
  hexy: (data) => String(data)
}));

const { WsClient } = require('./ws-client');

describe('WsClient', () => {
  let client;
  let events;

  beforeEach(() => {
    mockSockets = [];
    events = [];
    client = new WsClient((eventName, ...args) => {
      events.push({ eventName, args });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const start = (requestId = 'req-1') =>
    client.startConnection({
      request: { uid: requestId, url: 'ws://localhost:9', headers: {} },
      collection: { uid: 'col-1' },
      options: {}
    });

  describe('startConnection race', () => {
    it('reuses an existing CONNECTING socket instead of opening a second one', async () => {
      await start();
      expect(mockSockets).toHaveLength(1);

      await start();
      expect(mockSockets).toHaveLength(1);
      expect(client.connectionStatus('req-1')).toBe('connecting');
    });

    it('reuses an existing OPEN socket instead of opening a second one', async () => {
      await start();
      mockSockets[0].open();
      expect(client.connectionStatus('req-1')).toBe('connected');

      await start();
      expect(mockSockets).toHaveLength(1);
    });

    it('queues a message while CONNECTING and flushes it on open', async () => {
      await start();
      client.queueMessage('req-1', 'col-1', 'hello', 'raw');

      expect(mockSockets[0].sent).toHaveLength(0);

      mockSockets[0].open();

      expect(mockSockets[0].sent).toEqual(['hello']);
    });
  });

  describe('close / disconnecting', () => {
    it('emits disconnecting and reports disconnecting status until socket closes', async () => {
      await start();
      mockSockets[0].open();

      const closed = client.close('req-1');

      expect(events.some((e) => e.eventName === 'main:ws:disconnecting')).toBe(true);
      expect(client.connectionStatus('req-1')).toBe('disconnecting');

      mockSockets[0].finishClose();
      await closed;

      expect(client.connectionStatus('req-1')).toBe('disconnected');
    });

    it('resolves immediately when there is no active connection', async () => {
      await expect(client.close('missing')).resolves.toBeUndefined();
    });

    it('coalesces concurrent close calls onto one in-flight promise', async () => {
      await start();
      mockSockets[0].open();

      const first = client.close('req-1');
      const second = client.close('req-1');

      expect(second).toBe(first);
      expect(events.filter((e) => e.eventName === 'main:ws:disconnecting')).toHaveLength(1);

      mockSockets[0].finishClose();
      await Promise.all([first, second]);
      expect(client.connectionStatus('req-1')).toBe('disconnected');
    });

    it('resolves close after safety timeout if close event never fires', async () => {
      jest.useFakeTimers();
      await start();
      mockSockets[0].open();

      const closed = client.close('req-1');
      expect(client.connectionStatus('req-1')).toBe('disconnecting');

      jest.advanceTimersByTime(5000);
      await closed;
      await Promise.resolve();

      expect(client.connectionStatus('req-1')).toBe('disconnected');
      expect(events.some((e) => e.eventName === 'main:ws:close')).toBe(true);
    });

    it('does not let a timed-out socket close remove a replacement connection', async () => {
      jest.useFakeTimers();
      await start();
      const original = mockSockets[0];
      original.open();

      // Close without emitting 'close' so the safety timeout retires the socket.
      const closed = client.close('req-1');
      // Suppress terminate→close during timeout so we can emit a delayed close later.
      original.terminate = jest.fn();

      jest.advanceTimersByTime(5000);
      await closed;
      expect(client.connectionStatus('req-1')).toBe('disconnected');
      expect(original.terminate).toHaveBeenCalled();

      await start();
      expect(mockSockets).toHaveLength(2);
      const replacement = mockSockets[1];
      replacement.open();
      expect(client.connectionStatus('req-1')).toBe('connected');
      expect(client.activeConnections.get('req-1').connection).toBe(replacement);

      // Delayed close from the timed-out original must not touch the replacement.
      original.finishClose();

      expect(client.activeConnections.get('req-1').connection).toBe(replacement);
      expect(client.connectionStatus('req-1')).toBe('connected');
    });

    it('waits for an in-flight close before opening a new socket', async () => {
      await start();
      mockSockets[0].open();

      const closing = client.close('req-1');
      expect(client.connectionStatus('req-1')).toBe('disconnecting');

      const starting = start();
      // Still only the original socket while close is in flight
      expect(mockSockets).toHaveLength(1);

      mockSockets[0].finishClose();
      await closing;
      await starting;

      expect(mockSockets).toHaveLength(2);
      expect(client.connectionStatus('req-1')).toBe('connecting');
    });

    it('drops a queued message when close is called with no live socket', async () => {
      client.queueMessage('req-1', 'col-1', 'stale', 'raw');

      await client.close('req-1');

      await start();
      mockSockets[0].open();

      expect(mockSockets[0].sent).toEqual([]);
    });

    it('does not flush a queued message if the socket opens after close is called', async () => {
      await start();
      client.queueMessage('req-1', 'col-1', 'hello', 'raw');

      const closing = client.close('req-1');
      mockSockets[0].open();

      expect(mockSockets[0].sent).toEqual([]);

      mockSockets[0].finishClose();
      await closing;
    });
  });

  describe('closeForCollection', () => {
    const startWithKeepAlive = () =>
      client.startConnection({
        request: { uid: 'req-1', url: 'ws://localhost:9', headers: {} },
        collection: { uid: 'col-1' },
        options: { keepAlive: true, keepAliveInterval: 1000 }
      });

    it('stops keepalive pings immediately', async () => {
      jest.useFakeTimers();
      await startWithKeepAlive();
      mockSockets[0].ping = jest.fn();
      mockSockets[0].open();

      jest.advanceTimersByTime(1000);
      expect(mockSockets[0].ping).toHaveBeenCalledTimes(1);

      client.closeForCollection('col-1');
      mockSockets[0].ping.mockClear();
      jest.advanceTimersByTime(1000);

      expect(mockSockets[0].ping).not.toHaveBeenCalled();
      expect(client.connectionKeepAlive.size).toBe(0);
    });

    it('does not flush an orphaned queue after the collection is closed', async () => {
      client.queueMessage('req-1', 'col-1', 'stale', 'raw');

      client.closeForCollection('col-1');

      await start();
      mockSockets[0].open();

      expect(mockSockets[0].sent).toEqual([]);
    });

    it('does not flush a live connection queue after the collection is closed', async () => {
      await start();
      client.queueMessage('req-1', 'col-1', 'stale', 'raw');

      client.closeForCollection('col-1');
      mockSockets[0].finishClose();

      await start();
      mockSockets[1].open();

      expect(mockSockets[1].sent).toEqual([]);
    });

    it('resets seq so a reconnect does not continue the old counter', async () => {
      await start();
      mockSockets[0].open();

      client.closeForCollection('col-1');
      mockSockets[0].finishClose();

      await start();
      mockSockets[1].open();

      const openSeqs = events.filter((e) => e.eventName === 'main:ws:open').map((e) => e.args[2].seq);
      // add + open, same as a brand-new request — not the pre-close counter
      expect(openSeqs.at(-1)).toBe(2);
    });

    it('leaves other collections alone', async () => {
      await start('req-1');
      await client.startConnection({
        request: { uid: 'req-2', url: 'ws://localhost:9', headers: {} },
        collection: { uid: 'col-2' },
        options: {}
      });
      mockSockets[1].open();

      client.closeForCollection('col-1');
      mockSockets[0].finishClose();

      expect(client.connectionStatus('req-2')).toBe('connected');
      expect(client.activeConnections.get('req-2').connection).toBe(mockSockets[1]);
    });

    it('uses the close handshake: disconnecting until the socket emits close', async () => {
      await start();
      mockSockets[0].open();

      client.closeForCollection('col-1');

      expect(events.some((e) => e.eventName === 'main:ws:disconnecting')).toBe(true);
      expect(client.connectionStatus('req-1')).toBe('disconnecting');
      expect(mockSockets[0].readyState).toBe(CLOSING);

      mockSockets[0].finishClose();

      expect(client.connectionStatus('req-1')).toBe('disconnected');
      expect(events.some((e) => e.eventName === 'main:ws:close')).toBe(true);
      expect(
        events.some((e) => e.eventName === 'main:ws:connections-changed' && e.args[0].type === 'removed')
      ).toBe(true);
    });

    it('closes every live socket in the collection', async () => {
      await start('req-1');
      await start('req-2');
      mockSockets[0].open();
      mockSockets[1].open();

      client.closeForCollection('col-1');

      expect(client.connectionStatus('req-1')).toBe('disconnecting');
      expect(client.connectionStatus('req-2')).toBe('disconnecting');

      mockSockets[0].finishClose();
      mockSockets[1].finishClose();

      expect(client.connectionStatus('req-1')).toBe('disconnected');
      expect(client.connectionStatus('req-2')).toBe('disconnected');
    });

    it('is a no-op for an unknown collection', async () => {
      await start();
      mockSockets[0].open();

      client.closeForCollection('missing-col');

      expect(client.connectionStatus('req-1')).toBe('connected');
      expect(events.some((e) => e.eventName === 'main:ws:disconnecting')).toBe(false);
    });

    it('coalesces with an in-flight close instead of starting a second handshake', async () => {
      await start();
      mockSockets[0].open();

      const closing = client.close('req-1');
      client.closeForCollection('col-1');

      expect(events.filter((e) => e.eventName === 'main:ws:disconnecting')).toHaveLength(1);

      mockSockets[0].finishClose();
      await closing;
      expect(client.connectionStatus('req-1')).toBe('disconnected');
    });
  });

  describe('clearAllConnections', () => {
    it('terminates sockets and drops map, queues, and keepalive', async () => {
      await client.startConnection({
        request: { uid: 'req-1', url: 'ws://localhost:9', headers: {} },
        collection: { uid: 'col-1' },
        options: { keepAlive: true, keepAliveInterval: 1000 }
      });
      mockSockets[0].open();
      client.queueMessage('req-2', 'col-1', 'orphaned', 'raw');

      client.clearAllConnections();

      expect(mockSockets[0].readyState).toBe(CLOSED);
      expect(client.activeConnections.size).toBe(0);
      expect(client.messageQueues).toEqual({});
      expect(client.connectionKeepAlive.size).toBe(0);
    });

    it('does not flush leftover queues on a later connect', async () => {
      await start();
      client.queueMessage('req-1', 'col-1', 'stale', 'raw');

      client.clearAllConnections();

      await start();
      mockSockets[1].open();

      expect(mockSockets[1].sent).toEqual([]);
    });

    it('resolves an in-flight close instead of leaving disconnecting status', async () => {
      await start();
      mockSockets[0].open();

      const closing = client.close('req-1');
      client.clearAllConnections();

      await expect(closing).resolves.toBeUndefined();
      expect(client.connectionStatus('req-1')).toBe('disconnected');
      expect(client.closingResolvers.size).toBe(0);
    });

    it('drops orphaned queues when there are no live sockets', async () => {
      client.queueMessage('req-1', 'col-1', 'stale', 'raw');

      client.clearAllConnections();

      expect(client.messageQueues).toEqual({});
      await start();
      mockSockets[0].open();
      expect(mockSockets[0].sent).toEqual([]);
    });

    it('emits connections-changed cleared when anything was tracked', async () => {
      client.queueMessage('req-1', 'col-1', 'stale', 'raw');

      client.clearAllConnections();

      expect(
        events.some((e) => e.eventName === 'main:ws:connections-changed' && e.args[0].type === 'cleared')
      ).toBe(true);
    });

    it('does not emit cleared when there is nothing to clear', () => {
      client.clearAllConnections();

      expect(events).toEqual([]);
    });
  });

  describe('stale socket replace', () => {
    it('does not keep pinging a CLOSED socket left in the map', async () => {
      jest.useFakeTimers();
      await client.startConnection({
        request: { uid: 'req-1', url: 'ws://localhost:9', headers: {} },
        collection: { uid: 'col-1' },
        options: { keepAlive: true, keepAliveInterval: 1000 }
      });
      mockSockets[0].ping = jest.fn();
      mockSockets[0].open();
      mockSockets[0].readyState = CLOSED;

      await start();
      mockSockets[1].open();

      mockSockets[0].ping.mockClear();
      jest.advanceTimersByTime(1000);

      expect(mockSockets[0].ping).not.toHaveBeenCalled();
      expect(client.activeConnections.get('req-1').connection).toBe(mockSockets[1]);
    });

    it('keeps messages queued before replacing a stale socket', async () => {
      await start();
      mockSockets[0].readyState = CLOSED;

      client.queueMessage('req-1', 'col-1', 'hello', 'raw');
      client.queueMessage('req-1', 'col-1', 'again', 'raw');

      await start();
      mockSockets[1].open();

      expect(mockSockets[1].sent).toEqual(['hello', 'again']);
    });

    it('does not emit close for a discarded stale socket', async () => {
      await start();
      mockSockets[0].readyState = CLOSED;

      await start();

      expect(events.filter((e) => e.eventName === 'main:ws:close')).toHaveLength(0);
      expect(client.connectionStatus('req-1')).toBe('connecting');
    });
  });
});
