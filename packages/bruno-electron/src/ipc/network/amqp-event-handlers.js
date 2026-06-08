const { ipcMain } = require('electron');
const { AmqpClient } = require('@usebruno/requests');
const { cloneDeep, each, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const {
  getEnvVars,
  getTreePathFromCollectionToItem,
  mergeHeaders,
  mergeScripts,
  mergeVars,
  mergeAuth,
  getFormattedCollectionOauth2Credentials
} = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const { interpolateString } = require('./interpolate-string');

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

const getPayloadSize = (payload) => {
  if (Buffer.isBuffer(payload)) {
    return payload.length;
  }

  if (typeof payload === 'string') {
    return Buffer.byteLength(payload, 'utf-8');
  }

  try {
    return Buffer.byteLength(JSON.stringify(payload), 'utf-8');
  } catch (_) {
    return Buffer.byteLength(String(payload), 'utf-8');
  }
};

const prepareAmqpRequest = async (item, collection, environment, runtimeVariables) => {
  const request = item.draft ? item.draft.request : item.request;
  const collectionRoot = collection?.draft?.root ? get(collection, 'draft.root', {}) : get(collection, 'root', {});
  const brunoConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig', {})
    : get(collection, 'brunoConfig', {});
  const rawHeaders = cloneDeep(request.headers ?? []);
  const headers = {};

  if (!request.auth) {
    request.auth = { mode: 'none' };
  }

  const scriptFlow = brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeHeaders(collection, request, requestTreePath);
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    mergeAuth(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
    request.oauth2CredentialVariables = getFormattedCollectionOauth2Credentials({
      oauth2Credentials: collection?.oauth2Credentials
    });
  }

  each(rawHeaders, (h) => {
    if (h.enabled && h.name) {
      headers[h.name] = h.value;
    }
  });

  const envVars = getEnvVars(environment);
  const processEnvVars = getProcessEnvVars(collection.uid);
  const collectionVariables = collection?.runtimeVariables || {};

  const publish = request.publish || {};
  const consume = request.consume || {};

  const amqpRequest = {
    uid: item.uid,
    url: request.url,
    publish: {
      exchange: publish.exchange || '',
      exchangeType: publish.exchangeType || 'direct',
      routingKey: publish.routingKey || ''
    },
    consume: {
      exchange: consume.exchange || '',
      exchangeType: consume.exchangeType || 'direct',
      routingKey: consume.routingKey || '',
      queue: consume.queue || ''
    },
    subscriptions: Array.isArray(consume.subscriptions)
      ? consume.subscriptions.map((sub) => ({
          uid: sub.uid,
          queue: sub.queue || '',
          exchange: sub.exchange || '',
          exchangeType: sub.exchangeType || 'direct',
          routingKey: sub.routingKey || ''
        }))
      : [],
    headers,
    body: request.body || { mode: 'json', json: '' },
    auth: request.auth || {},
    envVars,
    processEnvVars,
    collectionVariables
  };

  // Interpolate variables in AMQP-specific fields
  const interpolationOptions = {
    envVars,
    collectionVariables,
    processEnvVars,
    runtimeVariables: runtimeVariables || {}
  };
  amqpRequest.url = interpolateString(amqpRequest.url, interpolationOptions);
  amqpRequest.publish.exchange = interpolateString(amqpRequest.publish.exchange, interpolationOptions);
  amqpRequest.publish.routingKey = interpolateString(amqpRequest.publish.routingKey, interpolationOptions);
  amqpRequest.consume.exchange = interpolateString(amqpRequest.consume.exchange, interpolationOptions);
  amqpRequest.consume.routingKey = interpolateString(amqpRequest.consume.routingKey, interpolationOptions);
  amqpRequest.consume.queue = interpolateString(amqpRequest.consume.queue, interpolationOptions);
  amqpRequest.subscriptions = amqpRequest.subscriptions.map((sub) => ({
    uid: sub.uid,
    queue: interpolateString(sub.queue, interpolationOptions),
    exchange: interpolateString(sub.exchange, interpolationOptions),
    exchangeType: sub.exchangeType,
    routingKey: interpolateString(sub.routingKey, interpolationOptions)
  }));

  // Interpolate header values (sent with published messages)
  Object.keys(amqpRequest.headers).forEach((key) => {
    amqpRequest.headers[key] = interpolateString(amqpRequest.headers[key], interpolationOptions);
  });

  // Interpolate the message body so variables ({{var}}, env, runtime, dynamic) are
  // rendered before publishing, just like REST request bodies.
  const bodyMode = amqpRequest.body?.mode;
  let content = '';
  if (bodyMode && bodyMode !== 'none') {
    const rawBody = amqpRequest.body[bodyMode];
    content = typeof rawBody === 'string' ? rawBody : rawBody != null ? String(rawBody) : '';
    content = interpolateString(content, interpolationOptions);
  }
  amqpRequest.content = content;

  // Inject basic auth credentials into the URL
  const auth = request.auth || {};
  if (auth.mode === 'basic' && (auth.basic?.username || auth.basic?.password)) {
    const username = interpolateString(auth.basic?.username || '', interpolationOptions);
    const password = interpolateString(auth.basic?.password || '', interpolationOptions);
    try {
      const parsed = new URL(amqpRequest.url);
      parsed.username = encodeURIComponent(username);
      parsed.password = encodeURIComponent(password);
      amqpRequest.url = parsed.toString();
    } catch (_) {
      // URL is invalid or not yet filled in — skip injection
    }
  }

  return amqpRequest;
};

let amqpClient;

const registerAmqpEventHandlers = (window) => {
  const sendEvent = (eventName, ...args) => {
    if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  const emitAmqpDebug = (requestUid, collectionUid, operation, details = {}) => {
    sendEvent('main:amqp:debug', requestUid, collectionUid, {
      operation,
      timestamp: Date.now(),
      ...details
    });
  };

  amqpClient = new AmqpClient(sendEvent);

  // Declare/bind a queue (per its binding) and start consuming from it.
  // Shared by start-consuming and the multi-queue subscribe handler.
  const subscribeToQueue = async (itemUid, collectionUid, binding, consumeOptions = {}) => {
    const { queue, exchange, exchangeType, routingKey } = binding;
    const options = { ...consumeOptions, subscriptionUid: binding.uid };

    const queueResult = await amqpClient.declareQueue(itemUid, collectionUid, queue || '');
    const resolvedQueue = queueResult.queue;

    emitAmqpDebug(itemUid, collectionUid, 'consume-queue-ready', {
      requestedQueue: queue || '(server-generated)',
      resolvedQueue,
      messageCount: queueResult.messageCount,
      consumerCount: queueResult.consumerCount
    });

    if (exchange) {
      await amqpClient.declareExchange(itemUid, collectionUid, exchange, exchangeType || 'direct');
      await amqpClient.bindQueue(itemUid, collectionUid, resolvedQueue, exchange, routingKey || '');

      emitAmqpDebug(itemUid, collectionUid, 'consume-queue-bound', {
        queue: resolvedQueue,
        exchange,
        exchangeType: exchangeType || 'direct',
        routingKey: routingKey || ''
      });
    }

    const result = await amqpClient.consume(itemUid, collectionUid, resolvedQueue, options);

    emitAmqpDebug(itemUid, collectionUid, 'consume-started', {
      queue: resolvedQueue,
      consumerTag: result.consumerTag,
      noAck: options.noAck === true
    });

    return { consumerTag: result.consumerTag, queue: resolvedQueue };
  };

  // Connect to AMQP broker
  ipcMain.handle(
    'renderer:amqp:connect',
    async (event, { itemUid, request, collection, environment, runtimeVariables, settings }) => {
      const collectionUid = collection.uid;
      try {
        const requestCopy = cloneDeep(request);
        const preparedRequest = await prepareAmqpRequest(
          { uid: itemUid, request: requestCopy, draft: null },
          collection,
          environment,
          runtimeVariables
        );

        const connectOptions = {
          heartbeat: settings?.heartbeat || 0,
          prefetch: settings?.prefetch || 0,
          vhost: settings?.vhost || '/'
        };

        const brokerUrl = sanitizeAmqpUrl(preparedRequest.url);
        emitAmqpDebug(itemUid, collectionUid, 'connect-attempt', {
          brokerUrl,
          connectOptions,
          publish: preparedRequest.publish,
          consume: preparedRequest.consume
        });

        await amqpClient.connect(
          preparedRequest.uid,
          collectionUid,
          preparedRequest.url,
          connectOptions
        );

        emitAmqpDebug(itemUid, collectionUid, 'connect-success', {
          brokerUrl,
          status: amqpClient.getStatus(itemUid, collectionUid)
        });

        return {
          success: true,
          publish: preparedRequest.publish,
          consume: preparedRequest.consume
        };
      } catch (error) {
        console.error('Error connecting to AMQP broker:', error);
        sendEvent('main:amqp:error', itemUid, collectionUid, {
          message: error.message,
          operation: 'connect',
          brokerUrl: sanitizeAmqpUrl(request?.url || ''),
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Publish a message
  ipcMain.handle(
    'renderer:amqp:publish',
    async (event, { itemUid, request, collection, environment, runtimeVariables, settings, options }) => {
      const collectionUid = collection.uid;
      const publishOptions = { ...(options || {}) };
      let resolvedExchange = '';
      let resolvedExchangeType = 'direct';
      let resolvedRoutingKey = '';
      let contentBytes = 0;

      try {
        const requestCopy = cloneDeep(request);
        const preparedRequest = await prepareAmqpRequest(
          { uid: itemUid, request: requestCopy, draft: null },
          collection,
          environment,
          runtimeVariables
        );

        resolvedExchange = preparedRequest.publish.exchange || '';
        resolvedExchangeType = preparedRequest.publish.exchangeType || 'direct';
        resolvedRoutingKey = preparedRequest.publish.routingKey || '';
        const content = preparedRequest.content || '';
        contentBytes = getPayloadSize(content);

        // Custom headers from the Headers tab (already interpolated) ride with the message
        if (preparedRequest.headers && Object.keys(preparedRequest.headers).length) {
          publishOptions.headers = { ...preparedRequest.headers, ...(publishOptions.headers || {}) };
        }

        emitAmqpDebug(itemUid, collectionUid, 'publish-attempt', {
          exchange: resolvedExchange || '(default)',
          exchangeType: resolvedExchangeType,
          routingKey: resolvedRoutingKey,
          options: publishOptions,
          contentBytes
        });

        // Ensure an authenticated connection exists before publishing
        const status = amqpClient.getStatus(itemUid, collectionUid);
        if (!status.hasChannel) {
          const connectOptions = {
            heartbeat: settings?.heartbeat || 0,
            prefetch: settings?.prefetch || 0,
            vhost: settings?.vhost || '/'
          };
          await amqpClient.connect(itemUid, collectionUid, preparedRequest.url, connectOptions);
        }

        if (resolvedExchange) {
          await amqpClient.declareExchange(itemUid, collectionUid, resolvedExchange, resolvedExchangeType);
          await amqpClient.publish(itemUid, collectionUid, resolvedExchange, resolvedRoutingKey, content, publishOptions);
        } else {
          // Default exchange: route directly by routing key (treated as the queue name)
          await amqpClient.publish(itemUid, collectionUid, '', resolvedRoutingKey, content, publishOptions);
        }

        emitAmqpDebug(itemUid, collectionUid, 'publish-success', {
          exchange: resolvedExchange || '(default)',
          exchangeType: resolvedExchangeType,
          routingKey: resolvedRoutingKey,
          contentBytes
        });

        return { success: true };
      } catch (error) {
        console.error('Error publishing AMQP message:', error);
        sendEvent('main:amqp:error', itemUid, collectionUid, {
          message: error.message,
          operation: 'publish',
          exchange: resolvedExchange || '(default)',
          exchangeType: resolvedExchangeType,
          routingKey: resolvedRoutingKey,
          contentBytes,
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Start consuming from a queue
  ipcMain.handle(
    'renderer:amqp:start-consuming',
    async (event, { itemUid, request, collection, environment, runtimeVariables, settings, options }) => {
      const collectionUid = collection.uid;
      const consumeOptions = options || {};
      try {
        const requestCopy = cloneDeep(request);
        const preparedRequest = await prepareAmqpRequest(
          { uid: itemUid, request: requestCopy, draft: null },
          collection,
          environment,
          runtimeVariables
        );

        const { exchange, exchangeType, routingKey, queue } = preparedRequest.consume;
        emitAmqpDebug(itemUid, collectionUid, 'consume-attempt', {
          brokerUrl: sanitizeAmqpUrl(preparedRequest.url),
          exchange: exchange || '(default)',
          exchangeType: exchangeType || 'direct',
          routingKey: routingKey || '',
          queue: queue || '(server-generated)',
          options: consumeOptions,
          connectOptions: {
            heartbeat: settings?.heartbeat || 0,
            prefetch: settings?.prefetch || 0,
            vhost: settings?.vhost || '/'
          }
        });

        // Ensure an authenticated connection exists before consuming
        const status = amqpClient.getStatus(itemUid, collectionUid);
        if (!status.hasChannel) {
          const connectOptions = {
            heartbeat: settings?.heartbeat || 0,
            prefetch: settings?.prefetch || 0,
            vhost: settings?.vhost || '/'
          };
          await amqpClient.connect(itemUid, collectionUid, preparedRequest.url, connectOptions);
        }

        const result = await subscribeToQueue(
          itemUid,
          collectionUid,
          { queue, exchange, exchangeType, routingKey },
          consumeOptions
        );

        return { success: true, consumerTag: result.consumerTag, queue: result.queue };
      } catch (error) {
        console.error('Error starting AMQP consumer:', error);
        sendEvent('main:amqp:error', itemUid, collectionUid, {
          message: error.message,
          operation: 'start-consuming',
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Subscribe to one or many queues. Ensures a connection exists, then declares,
  // binds and consumes each subscription. When `subscriptionUids` is provided,
  // only those subscriptions are started; otherwise every persisted subscription is.
  ipcMain.handle(
    'renderer:amqp:subscribe',
    async (event, { itemUid, request, collection, environment, runtimeVariables, settings, options, subscriptionUids }) => {
      const collectionUid = collection.uid;
      const consumeOptions = options || {};
      try {
        const requestCopy = cloneDeep(request);
        const preparedRequest = await prepareAmqpRequest(
          { uid: itemUid, request: requestCopy, draft: null },
          collection,
          environment,
          runtimeVariables
        );

        // Ensure an authenticated connection exists before consuming
        const status = amqpClient.getStatus(itemUid, collectionUid);
        if (!status.hasChannel) {
          const connectOptions = {
            heartbeat: settings?.heartbeat || 0,
            prefetch: settings?.prefetch || 0,
            vhost: settings?.vhost || '/'
          };
          await amqpClient.connect(itemUid, collectionUid, preparedRequest.url, connectOptions);
        }

        let subscriptions = preparedRequest.subscriptions || [];
        if (Array.isArray(subscriptionUids) && subscriptionUids.length) {
          const wanted = new Set(subscriptionUids);
          subscriptions = subscriptions.filter((sub) => wanted.has(sub.uid));
        }

        const subscribed = [];
        const errors = [];
        for (const sub of subscriptions) {
          try {
            const result = await subscribeToQueue(itemUid, collectionUid, sub, consumeOptions);
            subscribed.push({ uid: sub.uid, queue: result.queue });
          } catch (err) {
            errors.push({ uid: sub.uid, queue: sub.queue, error: err.message });
            sendEvent('main:amqp:error', itemUid, collectionUid, {
              message: err.message,
              operation: 'subscribe',
              queue: sub.queue,
              timestamp: Date.now()
            });
          }
        }

        return { success: errors.length === 0, subscribed, errors };
      } catch (error) {
        console.error('Error subscribing to AMQP queues:', error);
        sendEvent('main:amqp:error', itemUid, collectionUid, {
          message: error.message,
          operation: 'subscribe',
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Unsubscribe from a single queue (stops just that queue's consumer)
  ipcMain.handle(
    'renderer:amqp:unsubscribe',
    async (event, { requestUid, collectionUid, queue }) => {
      try {
        emitAmqpDebug(requestUid, collectionUid, 'consume-stop-attempt', { queue });
        await amqpClient.stopConsuming(requestUid, collectionUid, queue);
        emitAmqpDebug(requestUid, collectionUid, 'consume-stop-success', { queue });
        return { success: true };
      } catch (error) {
        console.error('Error unsubscribing from AMQP queue:', error);
        sendEvent('main:amqp:error', requestUid, collectionUid, {
          message: error.message,
          operation: 'unsubscribe',
          queue,
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Stop consuming
  ipcMain.handle(
    'renderer:amqp:stop-consuming',
    async (event, { requestUid, collectionUid, queue }) => {
      try {
        emitAmqpDebug(requestUid, collectionUid, 'consume-stop-attempt', { queue });
        await amqpClient.stopConsuming(requestUid, collectionUid, queue);
        emitAmqpDebug(requestUid, collectionUid, 'consume-stop-success', { queue });
        return { success: true };
      } catch (error) {
        console.error('Error stopping AMQP consumer:', error);
        sendEvent('main:amqp:error', requestUid, collectionUid, {
          message: error.message,
          operation: 'stop-consuming',
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Disconnect
  ipcMain.handle(
    'renderer:amqp:disconnect',
    async (event, { requestUid, collectionUid }) => {
      try {
        const statusBefore = amqpClient.getStatus(requestUid, collectionUid);
        emitAmqpDebug(requestUid, collectionUid, 'disconnect-attempt', {
          statusBefore
        });

        await amqpClient.disconnect(requestUid, collectionUid);

        emitAmqpDebug(requestUid, collectionUid, 'disconnect-success', {
          statusAfter: amqpClient.getStatus(requestUid, collectionUid)
        });

        return { success: true };
      } catch (error) {
        console.error('Error disconnecting AMQP:', error);
        sendEvent('main:amqp:error', requestUid, collectionUid, {
          message: error.message,
          operation: 'disconnect',
          timestamp: Date.now()
        });
        return { success: false, error: error.message };
      }
    }
  );

  // Get connection status
  ipcMain.handle(
    'renderer:amqp:connection-status',
    (event, { requestUid, collectionUid }) => {
      try {
        const status = amqpClient.getStatus(requestUid, collectionUid);
        return { success: true, status };
      } catch (error) {
        console.error('Error getting AMQP connection status:', error);
        return { success: false, error: error.message, status: { connected: false, hasChannel: false, consuming: false } };
      }
    }
  );
};

module.exports = {
  registerAmqpEventHandlers,
  amqpClient,
  prepareAmqpRequest
};
