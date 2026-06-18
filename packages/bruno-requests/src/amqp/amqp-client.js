import amqplib from 'amqplib';

const safeParseJSON = (jsonString) => {
  try {
    return JSON.parse(jsonString);
  } catch (_) {
    return null;
  }
};

const safeStringifyJSON = (obj) => {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return String(obj);
  }
};

const sanitizeAmqpUrl = (url) => {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    if (parsed.username) {
      parsed.username = '***';
    }
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch (_) {
    return url;
  }
};

class AmqpClient {
  constructor(sendEvent) {
    this.sendEvent = sendEvent;
    this.connections = {};
    this.channels = {};
    this.consumers = {};
    this.messageQueues = {};
  }

  async connect(requestUid, collectionUid, url, options = {}) {
    const key = `${requestUid}:${collectionUid}`;

    try {
      await this.disconnect(requestUid, collectionUid);
    } catch (_) {
      // ignore cleanup errors
    }

    try {
      const connectOptions = {};
      if (options.heartbeat !== undefined && options.heartbeat > 0) {
        connectOptions.heartbeat = options.heartbeat;
      }

      // Apply vhost by overriding the URL path when provided
      let connectUrl = url;
      if (options.vhost && options.vhost !== '/') {
        try {
          const parsed = new URL(url);
          parsed.pathname = '/' + encodeURIComponent(options.vhost);
          connectUrl = parsed.toString();
        } catch (_) {
          // URL is invalid — fall through with the original
        }
      }

      const connection = await amqplib.connect(connectUrl, connectOptions);
      this.connections[key] = connection;

      connection.on('error', (err) => {
        this.sendEvent('main:amqp:error', requestUid, collectionUid, {
          message: err.message,
          operation: 'connection',
          stage: 'socket',
          brokerUrl: sanitizeAmqpUrl(url),
          code: err.code,
          timestamp: Date.now()
        });
      });

      connection.on('close', () => {
        this.sendEvent('main:amqp:disconnected', requestUid, collectionUid, {
          operation: 'disconnect',
          reason: 'connection-closed',
          timestamp: Date.now()
        });
        delete this.connections[key];
        delete this.channels[key];
        delete this.consumers[key];
        this.emitConnectionsChanged('removed', requestUid);
      });

      // Map of queue name -> consumer info ({ consumerTag }) for this connection
      this.consumers[key] = {};

      // Use a confirm channel so publishes are acknowledged by the broker
      const channel = await connection.createConfirmChannel();
      this.channels[key] = channel;

      if (options.prefetch && options.prefetch > 0) {
        await channel.prefetch(options.prefetch);
      }

      channel.on('error', (err) => {
        this.sendEvent('main:amqp:error', requestUid, collectionUid, {
          message: `Channel error: ${err.message}`,
          operation: 'channel',
          stage: 'channel',
          code: err.code,
          timestamp: Date.now()
        });
      });

      channel.on('close', () => {
        delete this.channels[key];
        delete this.consumers[key];
      });

      this.consumers[key] = {};

      this.sendEvent('main:amqp:connected', requestUid, collectionUid, {
        timestamp: Date.now()
      });
      this.emitConnectionsChanged('added', requestUid);

      return { success: true };
    } catch (err) {
      this.sendEvent('main:amqp:error', requestUid, collectionUid, {
        message: `Connection failed: ${err.message}`,
        operation: 'connect',
        stage: 'connect',
        brokerUrl: sanitizeAmqpUrl(url),
        code: err.code,
        timestamp: Date.now()
      });
      throw err;
    }
  }

  // Run a passive declare (checkQueue/checkExchange) on a throwaway channel.
  // A failed passive declare makes the broker close the channel, so we must not
  // run it on the main consume channel — doing so would tear down every active
  // consumer. Returns the check result if the entity exists, otherwise null.
  async passiveCheck(requestUid, collectionUid, fn) {
    const key = `${requestUid}:${collectionUid}`;
    const connection = this.connections[key];
    if (!connection) throw new Error('No connection available. Connect first.');

    let tempChannel;
    try {
      tempChannel = await connection.createChannel();
      // Swallow the 404 channel error the broker raises for missing entities
      tempChannel.on('error', () => {});
      const result = await fn(tempChannel);
      try {
        await tempChannel.close();
      } catch (_) {
        // already closed
      }
      return result || {};
    } catch (_) {
      try {
        await tempChannel?.close();
      } catch (_) {
        // broker already closed it
      }
      return null;
    }
  }

  async declareExchange(requestUid, collectionUid, exchange, exchangeType = 'direct', options = {}) {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    if (!channel) throw new Error('No channel available. Connect first.');

    // Check existence on a temp channel to avoid PRECONDITION_FAILED killing the main channel
    const exists = await this.passiveCheck(requestUid, collectionUid, (ch) => ch.checkExchange(exchange));
    if (exists) return;

    await channel.assertExchange(exchange, exchangeType, {
      durable: options.durable !== false,
      ...options
    });
  }

  async declareQueue(requestUid, collectionUid, queue = '', options = {}) {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    if (!channel) throw new Error('No channel available. Connect first.');

    if (queue) {
      // Verify existence on a temp channel — don't try to create or modify named
      // queues on the main channel, as a failed passive/assert declare would close
      // it and drop all other active consumers.
      const existing = await this.passiveCheck(requestUid, collectionUid, (ch) => ch.checkQueue(queue));
      if (existing) {
        return existing.queue ? existing : { queue, messageCount: 0, consumerCount: 0 };
      }
      // Queue doesn't exist yet — create it on the main channel
      const result = await channel.assertQueue(queue, {
        durable: options.durable !== false,
        ...options
      });
      return result;
    }

    // Empty queue name — let the broker generate an ephemeral queue.
    // exclusive: only this connection can use it; autoDelete: removed once the
    // consumer cancels/stops (or the connection closes).
    const result = await channel.assertQueue('', {
      exclusive: true,
      autoDelete: true,
      durable: false,
      ...options
    });
    return result;
  }

  async bindQueue(requestUid, collectionUid, queue, exchange, routingKey = '') {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    if (!channel) throw new Error('No channel available. Connect first.');

    await channel.bindQueue(queue, exchange, routingKey);
  }

  async publish(requestUid, collectionUid, exchange, routingKey, content, options = {}) {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    if (!channel) throw new Error('No channel available. Connect first.');

    let buffer;
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content, 'utf-8');
    } else {
      buffer = Buffer.from(safeStringifyJSON(content), 'utf-8');
    }

    const publishOptions = {
      persistent: options.persistent !== false,
      ...options
    };

    // Confirm channel: resolves once the broker acknowledges the message, rejects on nack
    await new Promise((resolve, reject) => {
      channel.publish(exchange, routingKey, buffer, publishOptions, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    this.sendEvent('main:amqp:message-published', requestUid, collectionUid, {
      exchange,
      routingKey,
      content: buffer.toString('utf-8'),
      contentBytes: buffer.length,
      options: publishOptions,
      timestamp: Date.now(),
      confirmed: true
    });

    return true;
  }

  async sendToQueue(requestUid, collectionUid, queue, content, options = {}) {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    if (!channel) throw new Error('No channel available. Connect first.');

    let buffer;
    if (Buffer.isBuffer(content)) {
      buffer = content;
    } else if (typeof content === 'string') {
      buffer = Buffer.from(content, 'utf-8');
    } else {
      buffer = Buffer.from(safeStringifyJSON(content), 'utf-8');
    }

    const sendOptions = {
      persistent: options.persistent !== false,
      ...options
    };

    // Confirm channel: resolves once the broker acknowledges the message, rejects on nack
    await new Promise((resolve, reject) => {
      channel.sendToQueue(queue, buffer, sendOptions, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    this.sendEvent('main:amqp:message-published', requestUid, collectionUid, {
      queue,
      content: buffer.toString('utf-8'),
      contentBytes: buffer.length,
      options: sendOptions,
      timestamp: Date.now(),
      confirmed: true
    });

    return true;
  }

  async consume(requestUid, collectionUid, queue, options = {}) {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    if (!channel) throw new Error('No channel available. Connect first.');

    if (!this.consumers[key]) {
      this.consumers[key] = {};
    }

    // Cancel any existing consumer for this same queue before re-subscribing
    const existing = this.consumers[key][queue];
    if (existing) {
      try {
        await channel.cancel(existing.consumerTag);
      } catch (_) {
        // ignore
      }
      delete this.consumers[key][queue];
    }

    const consumeResult = await channel.consume(
      queue,
      (msg) => {
        if (msg === null) {
          this.sendEvent('main:amqp:consumer-cancelled', requestUid, collectionUid, {
            timestamp: Date.now()
          });
          return;
        }

        const contentString = msg.content.toString('utf-8');
        let parsedContent = contentString;
        let parsedAsJson = false;
        const parsed = safeParseJSON(contentString);
        if (parsed !== null) {
          parsedContent = safeStringifyJSON(parsed);
          parsedAsJson = true;
        }

        this.sendEvent('main:amqp:message-received', requestUid, collectionUid, {
          content: parsedContent,
          contentBytes: msg.content.length,
          parsedAsJson,
          queue,
          subscriptionUid: options.subscriptionUid,
          fields: {
            exchange: msg.fields.exchange,
            routingKey: msg.fields.routingKey,
            deliveryTag: msg.fields.deliveryTag,
            redelivered: msg.fields.redelivered,
            consumerTag: msg.fields.consumerTag
          },
          properties: {
            contentType: msg.properties.contentType,
            contentEncoding: msg.properties.contentEncoding,
            headers: msg.properties.headers,
            correlationId: msg.properties.correlationId,
            replyTo: msg.properties.replyTo,
            messageId: msg.properties.messageId,
            timestamp: msg.properties.timestamp,
            type: msg.properties.type,
            appId: msg.properties.appId
          },
          timestamp: Date.now()
        });

        // Auto-ack unless noAck is set
        if (!options.noAck) {
          channel.ack(msg);
        }
      },
      { noAck: options.noAck || false }
    );

    this.consumers[key][queue] = {
      consumerTag: consumeResult.consumerTag,
      subscriptionUid: options.subscriptionUid
    };

    this.sendEvent('main:amqp:consuming', requestUid, collectionUid, {
      queue,
      subscriptionUid: options.subscriptionUid,
      consumerTag: consumeResult.consumerTag,
      noAck: options.noAck === true,
      timestamp: Date.now()
    });

    return consumeResult;
  }

  async stopConsuming(requestUid, collectionUid, queue) {
    const key = `${requestUid}:${collectionUid}`;
    const channel = this.channels[key];
    const consumers = this.consumers[key] || {};

    if (!channel) return;

    // Stop a single queue's consumer when a queue is provided, otherwise stop all
    const queues = queue != null ? [queue] : Object.keys(consumers);

    for (const q of queues) {
      const consumer = consumers[q];
      if (!consumer) continue;
      try {
        await channel.cancel(consumer.consumerTag);
      } catch (_) {
        // ignore
      }
      delete consumers[q];

      this.sendEvent('main:amqp:consumer-stopped', requestUid, collectionUid, {
        operation: 'stop-consuming',
        consumerTag: consumer.consumerTag,
        subscriptionUid: consumer.subscriptionUid,
        queue: q,
        timestamp: Date.now()
      });
    }
  }

  async disconnect(requestUid, collectionUid) {
    const key = `${requestUid}:${collectionUid}`;

    try {
      const consumers = this.consumers[key];
      if (consumers && this.channels[key]) {
        for (const q of Object.keys(consumers)) {
          try {
            await this.channels[key].cancel(consumers[q].consumerTag);
          } catch (_) {
            // ignore individual cancel errors
          }
        }
      }
    } catch (_) {
      // ignore
    }

    try {
      if (this.channels[key]) {
        await this.channels[key].close();
      }
    } catch (_) {
      // ignore
    }

    try {
      if (this.connections[key]) {
        await this.connections[key].close();
      }
    } catch (_) {
      // ignore
    }

    delete this.connections[key];
    delete this.channels[key];
    delete this.consumers[key];

    this.sendEvent('main:amqp:disconnected', requestUid, collectionUid, {
      timestamp: Date.now()
    });
    this.emitConnectionsChanged('removed', requestUid);
  }

  async disconnectAll() {
    const keys = Object.keys(this.connections);
    for (const key of keys) {
      const [requestUid, collectionUid] = key.split(':');
      try {
        await this.disconnect(requestUid, collectionUid);
      } catch (_) {
        // ignore
      }
    }
  }

  closeForCollection(collectionUid) {
    const keys = Object.keys(this.connections).filter((k) => k.endsWith(`:${collectionUid}`));
    for (const key of keys) {
      const [requestUid, colUid] = key.split(':');
      this.disconnect(requestUid, colUid).catch(() => {});
    }
  }

  // Returns the unique request (item) uids that currently hold a live connection.
  // Keys are stored as `${requestUid}:${collectionUid}`; the renderer tracks
  // active connections by item uid (matching gRPC/WebSocket behaviour).
  getActiveConnectionIds() {
    const ids = new Set();
    Object.keys(this.connections).forEach((key) => {
      ids.add(key.split(':')[0]);
    });
    return Array.from(ids);
  }

  // Mirrors the WebSocket/gRPC clients: notify the renderer whenever the set of
  // active connections changes so the UI can reflect active-connection state.
  emitConnectionsChanged(type, requestUid) {
    this.sendEvent('main:amqp:connections-changed', {
      type,
      requestId: requestUid,
      activeConnectionIds: this.getActiveConnectionIds()
    });
  }

  getStatus(requestUid, collectionUid) {
    const key = `${requestUid}:${collectionUid}`;
    const consumers = this.consumers[key] || {};
    const consumingQueues = Object.keys(consumers);
    // Map of active subscription uid -> resolved queue name
    const consumingSubscriptions = {};
    consumingQueues.forEach((q) => {
      const uid = consumers[q]?.subscriptionUid;
      if (uid != null) consumingSubscriptions[uid] = q;
    });
    return {
      connected: !!this.connections[key],
      hasChannel: !!this.channels[key],
      consuming: consumingQueues.length > 0,
      consumingQueues,
      consumingSubscriptions
    };
  }
}

export { AmqpClient };
