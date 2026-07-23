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

      expect(client.connectionStatus('req-1')).toBe('disconnected');
      jest.useRealTimers();
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
  });
});
