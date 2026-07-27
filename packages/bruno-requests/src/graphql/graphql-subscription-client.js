import ws from 'ws';
import { getParsedWsUrlObject } from '../ws/ws-url';
import {
  MESSAGE_TYPES,
  encodeConnectionInit,
  encodeSubscribe,
  encodeComplete,
  encodePong,
  decodeFrame,
  describeCloseCode
} from './graphql-transport-ws-protocol';

const SUBPROTOCOL = 'graphql-transport-ws';

const DEFAULT_ACK_TIMEOUT_MS = 10_000;
const DEFAULT_CLOSE_WATCHDOG_MS = 5_000;
const FRAME_FLUSH_INTERVAL_MS = 50;
const FRAME_FLUSH_MAX_BATCH = 200;
const FRAME_CHAR_CAP = 20_000;
const FRAME_BUFFER_CAP = 500;

const truncateRaw = (raw) => {
  if (typeof raw !== 'string' || raw.length <= FRAME_CHAR_CAP) {
    return { raw, truncated: false };
  }
  return { raw: raw.slice(0, FRAME_CHAR_CAP), truncated: true };
};

// `connectionParams` arrives already interpolated and JSON.parse'd by the caller
// (bruno-electron's prepareGraphQLSubscriptionRequest) — an empty object is
// normalized to undefined so `connection_init` is written with no payload key.
const sanitizeConnectionParams = (connectionParams) => {
  if (!connectionParams || typeof connectionParams !== 'object' || !Object.keys(connectionParams).length) {
    return undefined;
  }
  return connectionParams;
};

class GraphQLSubscriptionClient {
  connections = new Map();

  constructor(eventCallback) {
    this.eventCallback = eventCallback;
  }

  connect({ request, collection, options = {} }) {
    const { url, headers = {}, connectionParams } = request;
    const requestId = request.uid;
    const collectionUid = collection.uid;

    // Close a prior socket for this requestId first — WsClient does not, and leaks.
    if (this.connections.has(requestId)) {
      this.#terminateConnection(requestId, 1000, 'Restarting connection');
    }

    const {
      ackTimeout = DEFAULT_ACK_TIMEOUT_MS,
      tls = {},
      agent
    } = options;

    const parsedUrl = getParsedWsUrlObject(url);

    const wsOptions = { headers };
    if (agent) {
      wsOptions.agent = agent;
    }
    if (tls.rejectUnauthorized !== undefined) {
      wsOptions.rejectUnauthorized = tls.rejectUnauthorized;
    }
    // A `ca: []` can replace Node's default trust store on some platforms, so an
    // empty/undefined value is omitted entirely rather than passed through.
    if (tls.ca !== undefined && tls.ca !== null && !(Array.isArray(tls.ca) && tls.ca.length === 0)) {
      wsOptions.ca = tls.ca;
    }
    if (tls.cert) wsOptions.cert = tls.cert;
    if (tls.key) wsOptions.key = tls.key;
    if (tls.pfx) wsOptions.pfx = tls.pfx;
    if (tls.passphrase) wsOptions.passphrase = tls.passphrase;

    const record = {
      collectionUid,
      socket: null,
      state: 'connecting',
      activeOperationId: null,
      nextOperationId: 1,
      seq: 0,
      frameBuffer: [],
      operationStateBuffer: [],
      flushTimer: null,
      ackTimer: null,
      closeWatchdogTimer: null,
      connectionParams: sanitizeConnectionParams(connectionParams)
    };

    this.connections.set(requestId, record);
    this.#emitConnectionsChanged('added', requestId);

    this.eventCallback('main:gql-sub:connecting', requestId, collectionUid, {
      timestamp: Date.now(),
      url: parsedUrl.fullUrl
    });

    let socket;
    try {
      socket = new ws.WebSocket(parsedUrl.fullUrl, SUBPROTOCOL, wsOptions);
    } catch (error) {
      this.connections.delete(requestId);
      this.eventCallback('main:gql-sub:error', requestId, collectionUid, {
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }

    record.socket = socket;
    this.#setupSocketEventHandlers(socket, requestId, collectionUid, record, ackTimeout);

    return socket;
  }

  subscribe(requestId, operation) {
    const record = this.connections.get(requestId);
    if (!record) {
      return;
    }

    if (record.state === 'closed' || record.state === 'closing') {
      return;
    }

    if (record.activeOperationId) {
      // A connection carries exactly one operation; refuse a second subscribe
      // rather than silently orphaning the first.
      return;
    }

    record.pendingOperation = operation;

    if (record.state === 'acked') {
      this.#sendSubscribe(requestId, record);
    }
  }

  unsubscribe(requestId) {
    const record = this.connections.get(requestId);
    if (!record || !record.activeOperationId) {
      return;
    }

    const operationId = record.activeOperationId;
    this.#writeFrame(requestId, record, encodeComplete(operationId), 'complete', operationId);
    record.activeOperationId = null;

    this.#emitOperationState(requestId, record, {
      type: 'complete',
      initiator: 'user'
    }, { immediate: true });
  }

  disconnect(requestId, code = 1000, reason = 'Client initiated disconnect') {
    this.#terminateConnection(requestId, code, reason);
  }

  isConnectionActive(requestId) {
    const record = this.connections.get(requestId);
    return !!record && record.socket?.readyState === ws.WebSocket.OPEN;
  }

  // Returns "disconnected", "connecting", "connected" — "connected" tracks the
  // GraphQL-level handshake (connection_ack received), not just the raw socket
  // reaching OPEN, since no subscribe can be sent (and no data can flow) before ack.
  connectionStatus(requestId) {
    const record = this.connections.get(requestId);
    if (!record) return 'disconnected';
    if (record.state === 'acked') return 'connected';
    if (record.state === 'connecting') return 'connecting';
    return 'disconnected';
  }

  getActiveConnectionIds() {
    return Array.from(this.connections.keys());
  }

  closeForCollection(collectionUid) {
    [...this.connections.keys()].forEach((requestId) => {
      const record = this.connections.get(requestId);
      if (record?.collectionUid === collectionUid) {
        this.#terminateConnection(requestId, 1000, 'Collection closed');
      }
    });
  }

  clearAllConnections() {
    [...this.connections.keys()].forEach((requestId) => {
      this.#terminateConnection(requestId, 1000, 'Client clearing all connections');
    });
  }

  #sendSubscribe(requestId, record) {
    const operation = record.pendingOperation;
    record.pendingOperation = null;

    const operationId = String(record.nextOperationId++);
    record.activeOperationId = operationId;

    this.#writeFrame(requestId, record, encodeSubscribe(operationId, operation), 'subscribe', operationId);
  }

  #setupSocketEventHandlers(socket, requestId, collectionUid, record, ackTimeout) {
    socket.on('open', () => {
      this.#writeFrame(requestId, record, encodeConnectionInit(record.connectionParams), MESSAGE_TYPES.CONNECTION_INIT);

      record.ackTimer = setTimeout(() => {
        this.#flush(requestId, record);
        this.eventCallback('main:gql-sub:error', requestId, collectionUid, {
          error: 'Timed out waiting for connection_ack',
          timestamp: Date.now()
        });
        this.#terminateConnection(requestId, 4408, 'Connection Initialisation Timeout');
      }, ackTimeout);
    });

    socket.on('upgrade', (response) => {
      this.eventCallback('main:gql-sub:upgrade', requestId, collectionUid, {
        timestamp: Date.now(),
        headers: { ...response.headers }
      });
    });

    socket.on('redirect', (url, req) => {
      const headerNames = req.getHeaderNames();
      const headers = Object.fromEntries(headerNames.map((name) => [name, req.getHeader(name)]));
      this.eventCallback('main:gql-sub:redirect', requestId, collectionUid, {
        message: `Redirected to ${url}`,
        timestamp: Date.now(),
        headers
      });
    });

    socket.on('message', (data) => {
      this.#handleIncomingFrame(requestId, collectionUid, record, data.toString());
    });

    socket.on('close', (code, reason) => {
      record.state = 'closed';
      this.#clearTimers(record);
      this.#flush(requestId, record);

      this.eventCallback('main:gql-sub:close', requestId, collectionUid, {
        code,
        reason: Buffer.from(reason || '').toString(),
        timestamp: Date.now()
      });

      // An explicit disconnect()/closeForCollection()/clearAllConnections() call
      // already evicted this record synchronously (and may have replaced it with a
      // fresh reconnect under the same requestId) — only clean up the map here if
      // this is still the record we own, so a late close never evicts a newer connection.
      if (this.connections.get(requestId) === record) {
        this.connections.delete(requestId);
        this.#emitConnectionsChanged('removed', requestId);
      }
    });

    socket.on('error', (error) => {
      this.#flush(requestId, record);
      this.eventCallback('main:gql-sub:error', requestId, collectionUid, {
        error: error.message,
        timestamp: Date.now()
      });
    });
  }

  #handleIncomingFrame(requestId, collectionUid, record, raw) {
    const decoded = decodeFrame(raw);

    if (record.state === 'connecting') {
      if (decoded.type === MESSAGE_TYPES.CONNECTION_ACK) {
        this.#clearTimers(record);
        record.state = 'acked';
        this.#writeFrame(requestId, record, raw, decoded.type, decoded.id, 'incoming', decoded);
        this.#flush(requestId, record);

        this.eventCallback('main:gql-sub:open', requestId, collectionUid, { timestamp: Date.now() });

        if (record.pendingOperation) {
          this.#sendSubscribe(requestId, record);
        }
        return;
      }

      if (decoded.type === MESSAGE_TYPES.PING) {
        this.#writeFrame(requestId, record, raw, decoded.type, decoded.id, 'incoming', decoded);
        this.#writeFrame(requestId, record, encodePong(decoded.payload), MESSAGE_TYPES.PONG);
        return;
      }

      if (decoded.type === MESSAGE_TYPES.PONG) {
        this.#writeFrame(requestId, record, raw, decoded.type, decoded.id, 'incoming', decoded);
        return;
      }

      // Anything else before ack (including a premature or duplicate ack-like
      // frame) is a protocol violation — emit the offending frame, then close.
      this.#writeFrame(requestId, record, raw, decoded.type, decoded.id, 'incoming', decoded);
      this.#flush(requestId, record);
      this.#terminateConnection(requestId, 4400, `Unexpected frame before connection_ack: ${decoded.type}`);
      return;
    }

    this.#writeFrame(requestId, record, raw, decoded.type, decoded.id, 'incoming', decoded);

    switch (decoded.type) {
      case MESSAGE_TYPES.PING:
        this.#writeFrame(requestId, record, encodePong(decoded.payload), MESSAGE_TYPES.PONG);
        break;

      case MESSAGE_TYPES.PONG:
        break;

      case MESSAGE_TYPES.NEXT:
        // `next` carrying `payload.errors` is a normal (partial) execution result —
        // the operation stays active. Only a top-level `error` message is terminal.
        // Batched (not immediate) — this is the high-frequency path a flood of
        // `next` frames must not force a synchronous flush per message for.
        this.#emitOperationState(requestId, record, {
          type: 'next',
          operationId: decoded.id,
          payload: decoded.payload
        });
        break;

      case MESSAGE_TYPES.ERROR:
        record.activeOperationId = null;
        this.#emitOperationState(requestId, record, {
          type: 'error',
          operationId: decoded.id,
          errors: decoded.payload
        }, { immediate: true });
        break;

      case MESSAGE_TYPES.COMPLETE:
        record.activeOperationId = null;
        this.#emitOperationState(requestId, record, {
          type: 'complete',
          operationId: decoded.id,
          initiator: 'server'
        }, { immediate: true });
        break;

      case MESSAGE_TYPES.CONNECTION_ACK:
        this.#flush(requestId, record);
        this.#terminateConnection(requestId, 4400, 'Unexpected duplicate connection_ack');
        break;

      default:
        // Unparsable/unknown frames are surfaced (already buffered above) and
        // otherwise ignored — a hostile or unrecognized frame must not kill the socket.
        break;
    }
  }

  // `next` events batch onto the same cadence as raw frames (so a flood of
  // messages doesn't force one IPC send per message); `error`/`complete` are
  // rare terminal signals and flush immediately so the UI sees them right away.
  // Either way, frames flush before operation-states within the same #flush call,
  // so a buffered `next` frame can never be observed arriving after its `complete`.
  #emitOperationState(requestId, record, state, { immediate = false } = {}) {
    record.operationStateBuffer.push({ ...state, timestamp: Date.now() });

    if (immediate) {
      this.#flush(requestId, record);
    } else {
      this.#scheduleFlush(requestId, record);
    }
  }

  #writeFrame(requestId, record, raw, type, operationId, direction = 'outgoing', decoded) {
    if (direction === 'outgoing' && record.socket?.readyState === ws.WebSocket.OPEN) {
      record.socket.send(raw);
    }

    const { raw: truncatedRaw, truncated } = truncateRaw(raw);
    const message = direction === 'incoming' ? (decoded?.type === 'unparsable' ? null : decoded) : null;

    if (record.frameBuffer.length >= FRAME_BUFFER_CAP) {
      record.frameBuffer.shift();
      record.droppedCount = (record.droppedCount || 0) + 1;
    }

    record.frameBuffer.push({
      seq: ++record.seq,
      timestamp: Date.now(),
      direction,
      type,
      operationId: operationId ?? null,
      raw: truncatedRaw,
      rawByteLength: Buffer.byteLength(raw),
      truncated,
      message
    });

    this.#scheduleFlush(requestId, record);
  }

  // A burst of synchronous incoming frames (Node can deliver several 'message'
  // events in one event-loop turn) all land before any timer callback runs, so
  // reaching the max-batch threshold reschedules the pending flush at 0ms rather
  // than flushing inline — the buffer-cap drop-oldest logic in #writeFrame is
  // what protects against the burst itself growing unbounded in the meantime.
  #scheduleFlush(requestId, record) {
    if (record.frameBuffer.length >= FRAME_FLUSH_MAX_BATCH) {
      if (record.flushTimer) {
        clearTimeout(record.flushTimer);
      }
      record.flushTimer = setTimeout(() => {
        record.flushTimer = null;
        this.#flush(requestId, record);
      }, 0);
      return;
    }

    if (record.flushTimer) return;

    record.flushTimer = setTimeout(() => {
      record.flushTimer = null;
      this.#flush(requestId, record);
    }, FRAME_FLUSH_INTERVAL_MS);
  }

  // Flushes both buffers — frames first, then operation-states — so the two
  // channels always preserve their relative ordering for a given tick.
  #flush(requestId, record) {
    if (record.flushTimer) {
      clearTimeout(record.flushTimer);
      record.flushTimer = null;
    }

    if (record.frameBuffer.length) {
      const frames = record.frameBuffer;
      record.frameBuffer = [];
      const droppedCount = record.droppedCount || 0;
      record.droppedCount = 0;

      this.eventCallback('main:gql-sub:frames', requestId, record.collectionUid, { frames, droppedCount });
    }

    if (record.operationStateBuffer.length) {
      const states = record.operationStateBuffer;
      record.operationStateBuffer = [];

      this.eventCallback('main:gql-sub:operation-state', requestId, record.collectionUid, { states });
    }
  }

  #clearTimers(record) {
    if (record.ackTimer) {
      clearTimeout(record.ackTimer);
      record.ackTimer = null;
    }
    if (record.closeWatchdogTimer) {
      clearTimeout(record.closeWatchdogTimer);
      record.closeWatchdogTimer = null;
    }
    if (record.flushTimer) {
      clearTimeout(record.flushTimer);
      record.flushTimer = null;
    }
  }

  // Eagerly evicts the connection synchronously — mirrors WsClient's close()/
  // closeForCollection() convention, so a disconnect click, collection close, or
  // app quit is reflected immediately rather than waiting on the async native
  // 'close' event. The socket's own 'close' handler still fires afterward (it
  // no-ops on the map once this record is gone) and is what actually reports
  // the negotiated close code/reason via main:gql-sub:close.
  #terminateConnection(requestId, code, reason) {
    const record = this.connections.get(requestId);
    if (!record) return;

    this.#clearTimers(record);
    this.#flush(requestId, record);
    record.state = 'closing';
    record.activeOperationId = null;

    this.connections.delete(requestId);
    this.#emitConnectionsChanged('removed', requestId);

    const socket = record.socket;
    if (!socket || socket.readyState === ws.WebSocket.CLOSED) {
      return;
    }

    if (socket.readyState === ws.WebSocket.CONNECTING) {
      socket.terminate();
      // Resource safety net only (state is already evicted above) — some
      // environments don't reliably emit 'close' in response to terminate().
      record.closeWatchdogTimer = setTimeout(() => {
        if (socket.readyState !== ws.WebSocket.CLOSED) {
          socket.terminate();
        }
      }, DEFAULT_CLOSE_WATCHDOG_MS);
      return;
    }

    socket.close(code, reason);
  }

  #emitConnectionsChanged(type, requestId) {
    this.eventCallback('main:gql-sub:connections-changed', {
      type,
      requestId,
      activeConnectionIds: this.getActiveConnectionIds()
    });
  }
}

export { GraphQLSubscriptionClient, describeCloseCode };
