/**
 * @jest-environment node
 */

// The mock class lives entirely inside the factory (with its instance registry
// exposed as a static) because `jest.mock` factories are hoisted above any
// same-file `class`/`const` declaration, so referencing an outer symbol here
// would hit a temporal-dead-zone error.
jest.mock('ws', () => {
  class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances = [];

    constructor(url, protocol, options) {
      this.url = url;
      this.protocol = protocol;
      this.options = options;
      this.readyState = MockWebSocket.CONNECTING;
      this.sent = [];
      this.handlers = {};
      this.terminated = false;
      MockWebSocket.instances.push(this);
    }

    on(event, handler) {
      this.handlers[event] ||= [];
      this.handlers[event].push(handler);
      return this;
    }

    send(data) {
      if (this.readyState !== MockWebSocket.OPEN) {
        throw new Error('Cannot send on a socket that is not open');
      }
      this.sent.push(data);
    }

    close(code, reason) {
      this.readyState = MockWebSocket.CLOSING;
      this._closeCode = code;
      this._closeReason = reason;
    }

    terminate() {
      this.terminated = true;
    }

    _emit(event, ...args) {
      (this.handlers[event] || []).forEach((handler) => handler(...args));
    }

    emitOpen() {
      this.readyState = MockWebSocket.OPEN;
      this._emit('open');
    }

    emitMessage(raw) {
      this._emit('message', Buffer.from(raw));
    }

    emitClose(code = 1000, reason = '') {
      this.readyState = MockWebSocket.CLOSED;
      this._emit('close', code, Buffer.from(reason));
    }

    emitError(error) {
      this._emit('error', error);
    }

    emitUpgrade(response) {
      this._emit('upgrade', response);
    }

    lastSent() {
      return this.sent[this.sent.length - 1];
    }
  }

  return { __esModule: true, default: { WebSocket: MockWebSocket } };
});

import { GraphQLSubscriptionClient } from './graphql-subscription-client';
import wsMock from 'ws';

const MockWebSocket = wsMock.WebSocket;
const mockInstances = MockWebSocket.instances;

const buildRequest = (overrides = {}) => ({
  uid: 'req-1',
  url: 'wss://example.com/graphql',
  headers: {},
  ...overrides
});

const buildCollection = () => ({ uid: 'col-1' });

// Pins the IPC-roundtrip contract: every emitted payload must survive an
// unadorned JSON round trip (no functions, class instances, undefined-only shapes).
const expectJsonRoundTrippable = (payload) => {
  expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
};

describe('GraphQLSubscriptionClient', () => {
  let client;
  let events;

  beforeEach(() => {
    jest.useFakeTimers();
    mockInstances.length = 0;
    events = [];
    client = new GraphQLSubscriptionClient((channel, ...args) => {
      events.push({ channel, args });
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const eventsOn = (channel) => events.filter((e) => e.channel === channel);
  const lastEvent = (channel) => eventsOn(channel).at(-1);
  // operation-state batches states as `{ states: [...] }` — flattens every
  // batch emitted so far into a single ordered list of individual states.
  const allStates = () => eventsOn('main:gql-sub:operation-state').flatMap((e) => e.args[2].states);
  const lastState = () => allStates().at(-1);

  const connectAndAck = (request = buildRequest()) => {
    client.connect({ request, collection: buildCollection(), options: {} });
    const socket = mockInstances.at(-1);
    socket.emitOpen();
    socket.emitMessage(JSON.stringify({ type: 'connection_ack' }));
    return socket;
  };

  describe('connect', () => {
    it('opens with the graphql-transport-ws subprotocol', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      expect(mockInstances).toHaveLength(1);
      expect(mockInstances[0].protocol).toBe('graphql-transport-ws');
    });

    it('writes connection_init with no payload when connectionParams is empty', () => {
      const socket = connectAndAckSocketOnly();
      expect(JSON.parse(socket.sent[0])).toEqual({ type: 'connection_init' });
    });

    function connectAndAckSocketOnly() {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();
      return socket;
    }

    it('writes connection_init with the interpolated connectionParams payload', () => {
      client.connect({
        request: buildRequest({ connectionParams: { authToken: 'abc' } }),
        collection: buildCollection(),
        options: {}
      });
      const socket = mockInstances.at(-1);
      socket.emitOpen();
      expect(JSON.parse(socket.sent[0])).toEqual({ type: 'connection_init', payload: { authToken: 'abc' } });
    });

    it('closes a prior socket for the same requestId before opening a new one', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const first = mockInstances[0];
      first.emitOpen();

      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });

      expect(first.readyState).toBe(MockWebSocket.CLOSING);
      expect(mockInstances).toHaveLength(2);
      expect(mockInstances[1]).not.toBe(first);
    });
  });

  describe('ack handshake', () => {
    it('does not send subscribe before ack, even if subscribe() was already called', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();

      client.subscribe('req-1', { query: 'subscription { tick }' });

      expect(socket.sent).toHaveLength(1); // only connection_init
      expect(JSON.parse(socket.sent[0]).type).toBe('connection_init');
    });

    it('sends the pending subscribe immediately once ack arrives', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      socket.emitMessage(JSON.stringify({ type: 'connection_ack' }));

      const subscribeFrame = JSON.parse(socket.lastSent());
      expect(subscribeFrame).toEqual({ id: '1', type: 'subscribe', payload: { query: 'subscription { tick }' } });
    });

    it('emits main:gql-sub:open only after the ack is received', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();
      expect(eventsOn('main:gql-sub:open')).toHaveLength(0);

      socket.emitMessage(JSON.stringify({ type: 'connection_ack' }));
      expect(eventsOn('main:gql-sub:open')).toHaveLength(1);
    });

    it('closes with 4408 and emits an error when the ack never arrives', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();

      jest.advanceTimersByTime(10_000);

      expect(lastEvent('main:gql-sub:error').args[2].error).toMatch(/connection_ack/);
      expect(socket._closeCode).toBe(4408);
    });

    it('closes with 4400 on anything but ack/ping/pong before ack, after emitting the offending frame', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();

      socket.emitMessage(JSON.stringify({ id: '1', type: 'next', payload: { data: {} } }));
      jest.runOnlyPendingTimers();

      const frames = lastEvent('main:gql-sub:frames').args[2].frames;
      expect(frames.some((f) => f.type === 'next')).toBe(true);
      expect(socket._closeCode).toBe(4400);
    });

    it('closes with 4400 on a second connection_ack', () => {
      const socket = connectAndAck();
      socket.emitMessage(JSON.stringify({ type: 'connection_ack' }));
      expect(socket._closeCode).toBe(4400);
    });

    it('tolerates a ping before ack and answers with pong', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.emitOpen();

      socket.emitMessage(JSON.stringify({ type: 'ping' }));

      expect(JSON.parse(socket.lastSent())).toEqual({ type: 'pong' });
      expect(socket._closeCode).toBeUndefined();
    });
  });

  describe('operation lifecycle', () => {
    it('keeps the operation active when a next frame carries payload.errors', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      socket.emitMessage(JSON.stringify({
        id: '1',
        type: 'next',
        payload: { data: { tick: 1 }, errors: [{ message: 'partial failure' }] }
      }));
      jest.runOnlyPendingTimers();

      const state = lastState();
      expect(state.type).toBe('next');
      expect(state.payload.errors).toEqual([{ message: 'partial failure' }]);
      expect(socket.readyState).toBe(MockWebSocket.OPEN);
      expect(client.isConnectionActive('req-1')).toBe(true);
    });

    it('treats a top-level error frame as terminal per-operation while keeping the socket open', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      const graphqlErrors = [{ message: 'Syntax Error', locations: [{ line: 1, column: 1 }] }];
      socket.emitMessage(JSON.stringify({ id: '1', type: 'error', payload: graphqlErrors }));
      jest.runOnlyPendingTimers();

      const state = lastState();
      expect(state.type).toBe('error');
      expect(state.errors).toEqual(graphqlErrors);
      expect(socket.readyState).toBe(MockWebSocket.OPEN);
      expect(socket._closeCode).toBeUndefined();
    });

    it('leaves the socket open when the server sends complete, tagging the initiator as server', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      socket.emitMessage(JSON.stringify({ id: '1', type: 'complete' }));
      jest.runOnlyPendingTimers();

      const state = lastState();
      expect(state).toMatchObject({ type: 'complete', initiator: 'server' });
      expect(socket.readyState).toBe(MockWebSocket.OPEN);
    });

    it('leaves the socket open on user unsubscribe, writes a complete frame, and tags initiator as user', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      client.unsubscribe('req-1');

      expect(JSON.parse(socket.lastSent())).toEqual({ id: '1', type: 'complete' });
      const state = lastState();
      expect(state).toMatchObject({ type: 'complete', initiator: 'user' });
      expect(socket.readyState).toBe(MockWebSocket.OPEN);
    });

    it('answers a post-ack ping with pong', () => {
      const socket = connectAndAck();
      socket.emitMessage(JSON.stringify({ type: 'ping' }));
      jest.runOnlyPendingTimers();
      expect(JSON.parse(socket.lastSent())).toEqual({ type: 'pong' });
    });

    it('never throws on an unparsable/binary frame and keeps the connection alive', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      expect(() => socket.emitMessage('\x00\x01binary-garbage')).not.toThrow();
      jest.runOnlyPendingTimers();

      const frames = lastEvent('main:gql-sub:frames').args[2].frames;
      const unparsable = frames.find((f) => f.type === 'unparsable');
      expect(unparsable).toBeDefined();
      expect(unparsable.message).toBeNull();
      expect(unparsable.raw).toBe('\x00\x01binary-garbage');
      expect(socket.readyState).toBe(MockWebSocket.OPEN);
    });
  });

  describe('transport error then close', () => {
    it('emits exactly one connections-changed removal for an error immediately followed by close', () => {
      const socket = connectAndAck();

      socket.emitError(new Error('ECONNRESET'));
      socket.emitClose(1006, 'abnormal closure');

      const removals = eventsOn('main:gql-sub:connections-changed').filter((e) => e.args[0].type === 'removed');
      expect(removals).toHaveLength(1);
      expect(client.getActiveConnectionIds()).not.toContain('req-1');
    });
  });

  describe('disconnect while CONNECTING', () => {
    it('terminates rather than closing, evicting the record immediately', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);

      client.disconnect('req-1');

      expect(socket.terminated).toBe(true);
      expect(client.getActiveConnectionIds()).not.toContain('req-1');
    });

    it('the watchdog re-terminates a socket that never reaches CLOSED', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);
      socket.terminate = jest.fn();

      client.disconnect('req-1');
      expect(socket.terminate).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(5_000);
      expect(socket.terminate).toHaveBeenCalledTimes(2);
    });

    it('does not double-clean-up if close fires before the watchdog', () => {
      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      const socket = mockInstances.at(-1);

      client.disconnect('req-1');
      socket.emitClose(1000, 'closed');

      const removals = eventsOn('main:gql-sub:connections-changed').filter((e) => e.args[0].type === 'removed');
      expect(removals).toHaveLength(1);

      jest.advanceTimersByTime(5_000);
      expect(eventsOn('main:gql-sub:connections-changed').filter((e) => e.args[0].type === 'removed')).toHaveLength(1);
    });
  });

  describe('frame batching', () => {
    it('buffers frames and flushes as one event with strictly increasing seq', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      for (let i = 0; i < 5; i++) {
        socket.emitMessage(JSON.stringify({ id: '1', type: 'next', payload: { data: { tick: i } } }));
      }
      jest.runOnlyPendingTimers();

      const flushes = eventsOn('main:gql-sub:frames');
      const seqs = flushes.flatMap((e) => e.args[2].frames.map((f) => f.seq));
      const sorted = [...seqs].sort((a, b) => a - b);
      expect(seqs).toEqual(sorted);
      expect(new Set(seqs).size).toBe(seqs.length);
    });

    it('schedules the flush at 0ms once the max-batch threshold is reached, rather than the full 50ms interval', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });
      jest.runOnlyPendingTimers(); // drain the connect/ack/subscribe flush first

      const flushesBefore = eventsOn('main:gql-sub:frames').length;

      for (let i = 0; i < 200; i++) {
        socket.emitMessage(JSON.stringify({ id: '1', type: 'next', payload: { data: { tick: i } } }));
      }

      expect(eventsOn('main:gql-sub:frames')).toHaveLength(flushesBefore);

      // A 0ms-scheduled timer already fires here, well before the 50ms interval would.
      jest.advanceTimersByTime(1);
      expect(eventsOn('main:gql-sub:frames').length).toBeGreaterThan(flushesBefore);
    });

    it('truncates an individual frame past the char cap and marks it truncated', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      const hugeValue = 'x'.repeat(25_000);
      socket.emitMessage(JSON.stringify({ id: '1', type: 'next', payload: { data: { hugeValue } } }));
      jest.runOnlyPendingTimers();

      const frame = lastEvent('main:gql-sub:frames').args[2].frames.find((f) => f.type === 'next');
      expect(frame.truncated).toBe(true);
      expect(frame.raw.length).toBeLessThan(hugeValue.length);
    });

    it('reports droppedCount once the buffer cap is exceeded', () => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });

      // Push well past the 500-frame buffer cap in a single synchronous burst
      // (jest fake timers keep the flush timer from draining it in between).
      for (let i = 0; i < 700; i++) {
        socket.emitMessage(JSON.stringify({ id: '1', type: 'next', payload: { data: { tick: i } } }));
      }
      jest.runOnlyPendingTimers();

      const flushes = eventsOn('main:gql-sub:frames');
      const totalDropped = flushes.reduce((sum, e) => sum + e.args[2].droppedCount, 0);
      expect(totalDropped).toBeGreaterThan(0);
    });
  });

  describe('IPC roundtrip contract', () => {
    it.each([
      'main:gql-sub:connecting',
      'main:gql-sub:open',
      'main:gql-sub:frames',
      'main:gql-sub:operation-state',
      'main:gql-sub:close',
      'main:gql-sub:connections-changed'
    ])('every %s payload survives JSON.parse(JSON.stringify(...))', (channel) => {
      const socket = connectAndAck();
      client.subscribe('req-1', { query: 'subscription { tick }' });
      socket.emitMessage(JSON.stringify({ id: '1', type: 'next', payload: { data: { tick: 1 } } }));
      jest.runOnlyPendingTimers();
      client.disconnect('req-1');
      socket.emitClose(1000, 'done');

      const matching = eventsOn(channel);
      expect(matching.length).toBeGreaterThan(0);
      matching.forEach((e) => {
        e.args.forEach((arg) => {
          if (typeof arg === 'object' && arg !== null) {
            expectJsonRoundTrippable(arg);
          }
        });
      });
    });
  });

  describe('connection status helpers', () => {
    it('reports connecting, connected and disconnected correctly', () => {
      expect(client.connectionStatus('req-1')).toBe('disconnected');

      client.connect({ request: buildRequest(), collection: buildCollection(), options: {} });
      expect(client.connectionStatus('req-1')).toBe('connecting');

      const socket = mockInstances.at(-1);
      socket.emitOpen();
      expect(client.connectionStatus('req-1')).toBe('connecting'); // pre-ack: raw socket open, not yet "connected"

      socket.emitMessage(JSON.stringify({ type: 'connection_ack' }));
      expect(client.connectionStatus('req-1')).toBe('connected');

      socket.emitClose(1000, 'bye');
      expect(client.connectionStatus('req-1')).toBe('disconnected');
    });
  });

  describe('closeForCollection / clearAllConnections', () => {
    it('closes only connections belonging to the given collection', () => {
      connectAndAck(buildRequest({ uid: 'req-1' }));
      client.connect({ request: buildRequest({ uid: 'req-2' }), collection: { uid: 'col-2' }, options: {} });

      client.closeForCollection('col-1');

      expect(client.getActiveConnectionIds()).toEqual(['req-2']);
    });

    it('clears every connection', () => {
      connectAndAck(buildRequest({ uid: 'req-1' }));
      client.connect({ request: buildRequest({ uid: 'req-2' }), collection: buildCollection(), options: {} });

      client.clearAllConnections();

      expect(client.getActiveConnectionIds()).toEqual([]);
    });
  });
});
