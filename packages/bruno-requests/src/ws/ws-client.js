import ws from 'ws';
import { hexy as hexdump } from 'hexy';
import { getParsedWsUrlObject } from './ws-url';

const normalizeMessageByFormat = (message, format) => {
  if (!message) {
    return '';
  }
  switch (format) {
    case 'json':
      // If it was already stringified, do not double encode
      if (typeof message === 'string') {
        return message;
      }
      return JSON.stringify(message);
    case 'raw':
    case 'xml':
      return message;
    default: {
      if (typeof message === 'string') {
        return message;
      }
      if (typeof message === 'object') {
        return JSON.stringify(message);
      }
      console.warn('Received message of unhandled type.', { type: typeof message });
      return '';
    }
  }
};

const createSequencer = () => {
  const seq = {};

  const nextSeq = (requestId, collectionId) => {
    seq[requestId] ||= {};
    seq[requestId][collectionId] ||= 0;
    return ++seq[requestId][collectionId];
  };

  const clean = (requestId) => {
    delete seq[requestId];
  };

  return {
    next: nextSeq,
    clean
  };
};

const seq = createSequencer();

class WsClient {
  messageQueues = {};
  activeConnections = new Map();
  connectionKeepAlive = new Map();
  closingResolvers = new Map();

  constructor(eventCallback) {
    this.eventCallback = eventCallback;
  }

  /**
   * Start a WebSocket connection
   * @param {Object} params - Connection parameters
   * @param {Object} params.request - The WebSocket request object
   * @param {Object} params.collection - The collection object
   * @param {Object} params.options - Additional connection options
   */
  async startConnection({ request, collection, options = {} }) {
    const { url, headers } = request;
    const { timeout = 30000, keepAlive = false, keepAliveInterval = 10_000, sslOptions = {} } = options;

    const parsedUrl = getParsedWsUrlObject(url);
    const timeoutAsNumber = Number(timeout);
    const validTimeout = isNaN(timeoutAsNumber) ? 30000 : timeoutAsNumber;

    const requestId = request.uid;
    const collectionUid = collection.uid;

    // Wait out an in-flight close so we don't open a replacement that the close handler then deletes.
    if (this.closingResolvers.has(requestId)) {
      await this.closingResolvers.get(requestId).promise;
    }

    // Reuse in-flight / open socket so ensure+connect races don't open a second connection.
    const meta = this.activeConnections.get(requestId);
    const existing = meta?.connection;
    if (existing && (existing.readyState === ws.WebSocket.CONNECTING || existing.readyState === ws.WebSocket.OPEN)) {
      return existing;
    }
    if (existing) {
      this.#detachSocket(requestId);
      this.activeConnections.delete(requestId);
    }

    try {
      // Create WebSocket connection
      // Note: unlike the standard Websocket constructor the `ws` library doesn't support adding Protocols as a single string
      // and instead needs it broken down manually, make sure this tested with multiple protocols again.
      const protocols = []
        .concat([headers['Sec-WebSocket-Protocol'], headers['sec-websocket-protocol']])
        .filter(Boolean)
        .map((d) => d.split(','))
        .flat()
        .map((d) => d.trim());

      const protocolVersion = headers['Sec-WebSocket-Version'] || headers['sec-websocket-version'];

      const wsOptions = {
        headers,
        handshakeTimeout: validTimeout,
        followRedirects: true,
        rejectUnauthorized: sslOptions.rejectUnauthorized,
        ca: sslOptions.ca,
        cert: sslOptions.cert,
        key: sslOptions.key,
        pfx: sslOptions.pfx,
        passphrase: sslOptions.passphrase
      };

      if (protocolVersion) {
        // Force convert to number since `ws` doesn't do it for you
        const asNumber = Number(protocolVersion);
        if (!isNaN(asNumber)) {
          wsOptions.protocolVersion = asNumber;
        }
      }

      const wsConnection = new ws.WebSocket(parsedUrl.fullUrl, protocols, wsOptions);

      // Set up event handlers
      this.#setupWsEventHandlers(wsConnection, requestId, collectionUid, { keepAlive, keepAliveInterval });

      // Store the connection
      this.#addConnection(requestId, collectionUid, wsConnection);

      // Emit connecting event
      this.eventCallback('main:ws:connecting', requestId, collectionUid);

      return wsConnection;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.eventCallback('main:ws:error', requestId, collectionUid, {
        error: error.message
      });
      throw error;
    }
  }

  queueMessage(requestId, collectionUid, message, format = 'raw') {
    const connectionMeta = this.activeConnections.get(requestId);

    const queue = (this.messageQueues[requestId] ||= { collectionUid, messages: [] });
    queue.collectionUid = collectionUid;
    queue.messages.push({ message, format });

    if (connectionMeta && connectionMeta.connection && connectionMeta.connection.readyState === WebSocket.OPEN) {
      this.#flushQueue(requestId, collectionUid);
    }
  }

  #flushQueue(requestId, collectionUid) {
    const queue = this.messageQueues[requestId];
    if (!queue) return;
    while (queue.messages.length > 0) {
      const { message, format } = queue.messages.shift();
      this.sendMessage(requestId, collectionUid, message, format);
    }
  }

  /**
   * Send a message to an active WebSocket connection
   * @param {string} requestId - The request ID of the active connection
   * @param {string} collectionUid - The collection UID for the request
   * @param {Object|string} message - The message to send
   */
  sendMessage(requestId, collectionUid, message, format = 'raw') {
    const connectionMeta = this.activeConnections.get(requestId);

    if (connectionMeta.connection && connectionMeta.connection.readyState === WebSocket.OPEN) {
      const payload = normalizeMessageByFormat(message, format);

      // Send the message
      connectionMeta.connection.send(payload, (error) => {
        if (error) {
          this.eventCallback('main:ws:error', requestId, collectionUid, { error });
        } else {
          // Emit message sent event
          this.eventCallback('main:ws:message', requestId, collectionUid, {
            message: payload,
            messageHexdump: hexdump(payload),
            type: 'outgoing',
            seq: seq.next(requestId, collectionUid),
            timestamp: Date.now()
          });
        }
      });
    } else {
      const error = new Error('WebSocket connection not available or not open');
      this.eventCallback('main:ws:error', requestId, collectionUid, {
        error: error.message
      });
    }
  }

  /**
   * Close a WebSocket connection reliably.
   * Returns a promise that resolves once the connection has fully closed
   * or a safety timeout is reached.
   * @param {string} requestId - The request ID to close
   * @param {number} code - Close code (optional)
   * @param {string} reason - Close reason (optional)
   * @returns {Promise<void>}
   */
  close(requestId, code = 1000, reason = 'Client initiated close') {
    const connectionMeta = this.activeConnections.get(requestId);

    // Return existing close promise if one is already in flight
    if (this.closingResolvers.has(requestId)) {
      return this.closingResolvers.get(requestId).promise;
    }

    if (!connectionMeta?.connection) {
      this.#forgetRequest(requestId);
      return Promise.resolve();
    }

    let resolve;
    const promise = new Promise((r) => {
      resolve = r;
    });

    const collectionUid = connectionMeta.collectionUid;

    // Drop the queue before the handshake so a late 'open' cannot flush it.
    this.#clearClientState(requestId);

    // Notify the UI that we're actively disconnecting so it can show a blink state
    this.eventCallback('main:ws:disconnecting', requestId, collectionUid);

    // Safety timeout: force-destroy the socket if the close handshake never completes
    const timeoutId = setTimeout(() => {
      if (!this.closingResolvers.has(requestId)) return;
      try {
        connectionMeta.connection.terminate();
      } catch (_) {
        // Socket may already be gone
      }
      const resolver = this.closingResolvers.get(requestId);
      if (resolver) {
        this.closingResolvers.delete(requestId);
        // Emit before forget — a late 'close' from terminate will miss the map and skip emit.
        this.eventCallback('main:ws:close', requestId, collectionUid, {
          code: 1006,
          reason: '',
          seq: seq.next(requestId, collectionUid),
          timestamp: Date.now()
        });
        this.#forgetRequest(requestId);
        resolve();
      }
    }, 5000);

    this.closingResolvers.set(requestId, { resolve, timeoutId, promise });
    connectionMeta.connection.close(code, reason);
    return promise;
  }

  /**
   * Check if a connection is active
   * @param {string} requestId - The request ID to check
   * @returns {boolean} - Whether the connection is active
   */
  isConnectionActive(requestId) {
    const connectionMeta = this.activeConnections.get(requestId);
    return connectionMeta && connectionMeta.connection.readyState === ws.WebSocket.OPEN;
  }

  /**
   * Get all active connection IDs
   * @returns {string[]} Array of active connection IDs
   */
  getActiveConnectionIds() {
    return Array.from(this.activeConnections.keys());
  }

  closeForCollection(collectionUid) {
    for (const requestId of [...this.activeConnections.keys()]) {
      if (this.activeConnections.get(requestId)?.collectionUid === collectionUid) {
        this.close(requestId);
      }
    }
    for (const [requestId, queue] of Object.entries(this.messageQueues)) {
      if (queue.collectionUid === collectionUid) {
        this.#forgetRequest(requestId);
      }
    }
  }

  /**
   * Clear all active connections
   */
  clearAllConnections() {
    const requestIds = new Set([...this.activeConnections.keys(), ...Object.keys(this.messageQueues)]);

    for (const requestId of requestIds) {
      this.#discard(requestId);
    }

    for (const [requestId, resolver] of this.closingResolvers) {
      clearTimeout(resolver.timeoutId);
      this.closingResolvers.delete(requestId);
      resolver.resolve();
    }

    if (requestIds.size > 0) {
      this.eventCallback('main:ws:connections-changed', {
        type: 'cleared',
        activeConnectionIds: []
      });
    }
  }

  /**
   * Set up WebSocket event handlers
   * @param {WebSocket} ws - The WebSocket instance
   * @param {string} requestId - The request ID
   * @param {string} collectionUid - The collection UID
   * @param {object} options
   * @param {boolean} options.keepAlive - keep the connection alive
   * @param {number} options.keepAliveInterval - What the interval for keeping interval
   * @private
   */
  #setupWsEventHandlers(ws, requestId, collectionUid, options) {
    ws.on('open', () => {
      this.#flushQueue(requestId, collectionUid);

      if (options.keepAlive) {
        const handle = setInterval(() => {
          ws.isAlive = false;
          ws.ping();
        }, options.keepAliveInterval);

        this.connectionKeepAlive.set(requestId, handle);
      }

      this.eventCallback('main:ws:open', requestId, collectionUid, {
        timestamp: Date.now(),
        url: ws.url,
        seq: seq.next(requestId, collectionUid)
      });
    });

    ws.on('redirect', (url, req) => {
      const headerNames = req.getHeaderNames();
      const headers = Object.fromEntries(headerNames.map((d) => [d, req.getHeader(d)]));
      this.eventCallback('main:ws:redirect', requestId, collectionUid, {
        message: `Redirected to ${url}`,
        type: 'info',
        timestamp: Date.now(),
        headers: headers,
        seq: seq.next(requestId, collectionUid)
      });
    });

    ws.on('upgrade', (response) => {
      this.eventCallback('main:ws:upgrade', requestId, collectionUid, {
        type: 'info',
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid),
        headers: { ...response.headers }
      });
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.eventCallback('main:ws:message', requestId, collectionUid, {
          message,
          messageHexdump: hexdump(Buffer.from(data)),
          type: 'incoming',
          seq: seq.next(requestId, collectionUid),
          timestamp: Date.now()
        });
      } catch (error) {
        // If parsing fails, send as raw data
        this.eventCallback('main:ws:message', requestId, collectionUid, {
          message: data.toString(),
          messageHexdump: hexdump(data),
          type: 'incoming',
          seq: seq.next(requestId, collectionUid),
          timestamp: Date.now()
        });
      }
    });

    ws.on('close', (code, reason) => {
      // Resolve any pending close promise
      const pendingClose = this.closingResolvers.get(requestId);
      if (pendingClose) {
        clearTimeout(pendingClose.timeoutId);
        this.closingResolvers.delete(requestId);
        pendingClose.resolve();
      }

      // Timed-out / replaced socket — ignore so a replacement stays active
      if (this.activeConnections.get(requestId)?.connection !== ws) {
        return;
      }

      this.eventCallback('main:ws:close', requestId, collectionUid, {
        code,
        reason: Buffer.from(reason).toString(),
        seq: seq.next(requestId, collectionUid),
        timestamp: Date.now()
      });
      this.#forgetRequest(requestId);
    });

    ws.on('error', (error) => {
      this.eventCallback('main:ws:error', requestId, collectionUid, {
        error: error.message,
        seq: seq.next(requestId, collectionUid),
        timestamp: Date.now()
      });
    });
  }

  /**
   * Add a connection to the active connections map and emit an event
   * @param {string} requestId - The request ID
   * @param {WebSocket} connection - The WebSocket connection
   * @private
   */
  #addConnection(requestId, collectionUid, connection) {
    this.activeConnections.set(requestId, { collectionUid, connection });

    // Emit an event with all active connection IDs
    this.eventCallback('main:ws:connections-changed', {
      type: 'added',
      requestId,
      seq: seq.next(requestId, collectionUid),
      activeConnectionIds: this.getActiveConnectionIds()
    });
  }

  #detachSocket(requestId) {
    const meta = this.activeConnections.get(requestId);
    const conn = meta?.connection;
    // Detach before terminate so a sync close does not re-enter #forgetRequest.
    if (meta) meta.connection = null;
    if (conn) {
      try {
        conn.terminate();
      } catch (_) {
      }
    }
    if (this.connectionKeepAlive.has(requestId)) {
      clearInterval(this.connectionKeepAlive.get(requestId));
      this.connectionKeepAlive.delete(requestId);
    }
  }

  #discard(requestId) {
    this.#detachSocket(requestId);
    this.#forgetRequest(requestId);
  }

  #clearClientState(requestId) {
    if (this.connectionKeepAlive.has(requestId)) {
      clearInterval(this.connectionKeepAlive.get(requestId));
      this.connectionKeepAlive.delete(requestId);
    }
    delete this.messageQueues[requestId];
  }

  /**
   * Drop queue, keepalive, sequencer, and any map entry for this request.
   * Safe to call when there is no live connection.
   * @param {string} requestId
   * @private
   */
  #forgetRequest(requestId) {
    this.#clearClientState(requestId);
    seq.clean(requestId);

    if (this.activeConnections.has(requestId)) {
      this.activeConnections.delete(requestId);

      this.eventCallback('main:ws:connections-changed', {
        type: 'removed',
        requestId,
        activeConnectionIds: this.getActiveConnectionIds()
      });
    }
  }

  /**
   * Get the connection status of a connection
   * @param {string} requestId - The request ID to get the connection status of
   * @returns {string} - The connection status
   */
  // Returns "disconnected", "connecting", "connected", "disconnecting"
  connectionStatus(requestId) {
    if (this.closingResolvers.has(requestId)) return 'disconnecting';
    const connectionMeta = this.activeConnections.get(requestId);
    if (connectionMeta?.connection?.readyState === ws.WebSocket.CONNECTING) return 'connecting';
    if (connectionMeta?.connection?.readyState === ws.WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }
}

export { WsClient };
