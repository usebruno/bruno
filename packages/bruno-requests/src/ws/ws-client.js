import ws from 'ws';

/**
 * Safely parse JSON string with error handling
 * @param {string} jsonString - The JSON string to parse
 * @param {string} context - Context for error messages
 * @returns {Object} Parsed object or throws error with context
 * @throws {Error} If JSON parsing fails
 */
const safeJsonParse = (jsonString, context = 'JSON string') => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    const errorMessage = `Failed to parse ${context}: ${error.message}`;
    console.error(errorMessage, {
      originalString: jsonString,
      parseError: error
    });
    throw new Error(errorMessage);
  }
};

/**
 * Get parsed WebSocket URL object
 * @param {string} url - The WebSocket URL
 * @returns {Object} Parsed URL object with protocol, host, path
 */
const getParsedWsUrlObject = (url) => {
  const addProtocolIfMissing = (str) => {
    if (str.includes('://')) return str;

    // For localhost, default to insecure (grpc://) for local development
    if (str.includes('localhost') || str.includes('127.0.0.1')) {
      return `ws://${str}`;
    }

    // For other hosts, default to secure
    return `wss://${str}`;
  };

  const removeTrailingSlash = (str) => (str.endsWith('/') ? str.slice(0, -1) : str);

  if (!url) return { host: '', path: '' };

  try {
    const urlObj = new URL(addProtocolIfMissing(url.toLowerCase()));
    return {
      protocol: urlObj.protocol,
      host: urlObj.host,
      path: removeTrailingSlash(urlObj.pathname),
      search: urlObj.search,
      fullUrl: urlObj.href
    };
  } catch (err) {
    console.error({ err });
    return {
      host: '',
      path: ''
    };
  }
};

class WsClient {
  messageQueue = [];
  activeConnections = new Map();
  connectionKeepAlive = new Map();

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
    const { timeout = 30000, keepAlive = false, keepAliveInterval = 10_000 } = options;

    const parsedUrl = getParsedWsUrlObject(url);

    const requestId = request.uid;
    const collectionUid = collection.uid;

    try {
      // Create WebSocket connection
      const wsConnection = new ws.WebSocket(parsedUrl.fullUrl, {
        headers,
        timeout: timeout,
        followRedirects: true
      });

      // Set up event handlers
      this.#setupWsEventHandlers(wsConnection, requestId, collectionUid, {keepAlive,keepAliveInterval});

      // Store the connection
      this.#addConnection(requestId, wsConnection);

      // Emit connecting event
      this.eventCallback('ws:connecting', requestId, collectionUid);

      return wsConnection;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      this.eventCallback('ws:error', requestId, collectionUid, {
        error: error.message
      });
      throw error;
    }
  }

  queueMessage(requestId, collectionUid, message) {
    const connection = this.activeConnections.get(requestId);

    if (connection && connection.readyState === WebSocket.OPEN) {
      this.#flushQueue(requestId, collectionUid);
      this.sendMessage(requestId, collectionUid, message);
      return;
    }

    this.messageQueue.push({
      requestId,
      collectionUid,
      payload: message
    });
  }

  #flushQueue(requestId, collectionUid) {
    for (const ind in this.messageQueue) {
      const message = this.messageQueue[ind];
      if (message.requestId != requestId) continue;
      if (message.collectionUid != collectionUid) continue;
      this.sendMessage(requestId, collectionUid, message.payload);
      this.messageQueue.splice(ind, 1);
    }
  }

  /**
   * Send a message to an active WebSocket connection
   * @param {string} requestId - The request ID of the active connection
   * @param {string} collectionUid - The collection UID for the request
   * @param {Object|string} message - The message to send
   */
  sendMessage(requestId, collectionUid, message) {
    const connection = this.activeConnections.get(requestId);

    if (connection && connection.readyState === WebSocket.OPEN) {
      let messageToSend;

      // Parse the message if it's a string
      if (typeof message === 'string') {
        try {
          messageToSend = safeJsonParse(message, 'message content');
        } catch (parseError) {
          // If parsing fails, send as string
          messageToSend = message;
        }
      } else {
        messageToSend = message;
      }

      // Send the message
      connection.send(JSON.stringify(messageToSend), (error) => {
        if (error) {
          this.eventCallback('ws:error', requestId, collectionUid, { error });
        } else {
          // Emit message sent event
          this.eventCallback('ws:message', requestId, collectionUid, {
            message: messageToSend,
            type: 'outgoing',
            timestamp: Date.now()
          });
        }
      });
    } else {
      const error = new Error('WebSocket connection not available or not open');
      this.eventCallback('ws:error', requestId, collectionUid, {
        error: error.message
      });
    }
  }

  /**
   * Close a WebSocket connection
   * @param {string} requestId - The request ID to close
   * @param {number} code - Close code (optional)
   * @param {string} reason - Close reason (optional)
   */
  close(requestId, code = 1000, reason = 'Client initiated close') {
    const connection = this.activeConnections.get(requestId);

    if (connection) {
      connection.close(code, reason);
      this.#removeConnection(requestId);
    }
  }

  /**
   * Check if a connection is active
   * @param {string} requestId - The request ID to check
   * @returns {boolean} - Whether the connection is active
   */
  isConnectionActive(requestId) {
    const connection = this.activeConnections.get(requestId);
    return connection && connection.readyState === WebSocket.OPEN;
  }

  /**
   * Get all active connection IDs
   * @returns {string[]} Array of active connection IDs
   */
  getActiveConnectionIds() {
    return Array.from(this.activeConnections.keys());
  }

  /**
   * Clear all active connections
   */
  clearAllConnections() {
    const connectionIds = this.getActiveConnectionIds();

    this.activeConnections.forEach((connection) => {
      if (connection.readyState === WebSocket.OPEN) {
        connection.close(1000, 'Client clearing all connections');
      }
    });

    this.activeConnections.clear();

    // Emit an event with empty active connection IDs
    if (connectionIds.length > 0) {
      this.eventCallback('ws:connections-changed', {
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

      if(options.keepAlive){
        const handle = setInterval(() => {
            console.log("pinging to keep alive")
            ws.isAlive = false;
            ws.ping();
          }, options.keepAliveInterval);

        this.connectionKeepAlive.set(requestId, handle);
      }

      this.eventCallback('ws:open', requestId, collectionUid, {
        timestamp: Date.now(),
        url: ws.url
      });
    });

    ws.on('redirect', (url, req) => {
      const headerNames = req.getHeaderNames()
      const headers = Object.fromEntries(headerNames.map(d=> [d,req.getHeader(d)]))
      this.eventCallback('ws:redirect', requestId, collectionUid, {
          message:`Redirected to ${url}`,
          type: 'info',
          timestamp: Date.now(),
          headers: headers
      });
    })

    ws.on('upgrade', (response) => {
      this.eventCallback('ws:upgrade', requestId, collectionUid, {
          type: 'info',
          timestamp: Date.now(),
          headers: {...response.headers}
      });
    })

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.eventCallback('ws:message', requestId, collectionUid, {
          message,
          type: 'incoming',
          timestamp: Date.now()
        });
      } catch (error) {
        // If parsing fails, send as raw data
        this.eventCallback('ws:message', requestId, collectionUid, {
          message: data.toString(),
          type: 'incoming',
          timestamp: Date.now()
        });
      }
    });

    ws.on('close', (code, reason) => {
      this.eventCallback('ws:close', requestId, collectionUid, {
        code,
        reason: reason.toString(),
        timestamp: Date.now()
      });
      this.#removeConnection(requestId);
    });

    ws.on('error', (error) => {
      this.eventCallback('ws:error', requestId, collectionUid, {
        error: error.message,
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
  #addConnection(requestId, connection) {
    this.activeConnections.set(requestId, connection);

    // Emit an event with all active connection IDs
    this.eventCallback('ws:connections-changed', {
      type: 'added',
      requestId,
      activeConnectionIds: this.getActiveConnectionIds()
    });
  }

  /**
   * Remove a connection from the active connections map and emit an event
   * @param {string} requestId - The request ID
   * @private
   */
  #removeConnection(requestId) {
    if (this.connectionKeepAlive.has(requestId)) {
      clearInterval(this.connectionKeepAlive.get(requestId));
      this.connectionKeepAlive.delete(requestId);
    }
    if (this.activeConnections.has(requestId)) {
      this.activeConnections.delete(requestId);

      // Emit an event with all active connection IDs
      this.eventCallback('ws:connections-changed', {
        type: 'removed',
        requestId,
        activeConnectionIds: this.getActiveConnectionIds()
      });
    }
  }
}

export { WsClient };
