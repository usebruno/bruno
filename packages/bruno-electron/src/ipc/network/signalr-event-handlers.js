if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}

const { ipcMain } = require('electron');
const { HubConnectionBuilder, LogLevel, HttpTransportType } = require('@microsoft/signalr');
const { cloneDeep, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const { getEnvVars } = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');

const connections = new Map();

const registerSignalrEventHandlers = (mainWindow) => {
  const sendEvent = (eventName, ...args) => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  ipcMain.handle('renderer:signalr:start-connection', async (event, { requestId, collectionUid, request, collection, environment, runtimeVariables }) => {
    try {
      if (connections.has(requestId)) {
        const existing = connections.get(requestId);
        try {
          await existing.connection.stop();
        } catch (_) {}
        connections.delete(requestId);
      }

      // Clone and interpolate variables in the request
      const requestCopy = cloneDeep(request);
      const envVars = getEnvVars(environment);
      const processEnvVars = getProcessEnvVars(collectionUid);
      const promptVariables = get(collection, 'promptVariables', {});
      interpolateVars(requestCopy, envVars, runtimeVariables, processEnvVars, promptVariables);

      const url = requestCopy.request?.url || '';
      const auth = requestCopy.request?.auth || {};
      const headers = {};
      get(requestCopy, 'request.headers', []).forEach((h) => {
        if (h.enabled) {
          headers[h.name] = h.value;
        }
      });

      const connection = new HubConnectionBuilder()
        .withUrl(url, {
          transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
          WebSocket: require('ws'),
          headers,
          accessTokenFactory: () => {
            if (auth?.mode === 'bearer' && auth?.bearer?.token) {
              return auth.bearer.token;
            }
            return '';
          }
        })
        .configureLogging(LogLevel.Information)
        .withAutomaticReconnect()
        .build();

      const state = {
        connection,
        status: 'connecting',
        startTime: Date.now(),
        handlers: new Map(),
        collectionUid,
        url
      };

      connections.set(requestId, state);

      const emitState = (requestId, status) => {
        const eventData = {
          url: state.url,
          timestamp: Date.now()
        };
        sendEvent('main:signalr:state-changed', requestId, collectionUid, status, eventData);
      };

      connection.onreconnecting(() => {
        state.status = 'reconnecting';
        emitState(requestId, 'reconnecting');
      });

      connection.onreconnected(() => {
        state.status = 'connected';
        emitState(requestId, 'connected');
      });

      connection.onclose(() => {
        state.status = 'disconnected';
        emitState(requestId, 'disconnected');
        if (connections.get(requestId) === state) {
          connections.delete(requestId);
        }
      });

      // Intercept ALL incoming server invocations and forward them to the renderer.
      // Preserve the original _invokeClientMethod so handlers registered via connection.on() still fire.
      // Only emit the generic event for targets not already handled by register-handler
      // to avoid duplicate events on the renderer side.
      const originalInvokeClientMethod = connection._invokeClientMethod?.bind(connection);
      connection._invokeClientMethod = async function (invocationMessage) {
        if (!state.handlers.has(invocationMessage.target)) {
          sendEvent('main:signalr:event', requestId, collectionUid, invocationMessage.target, invocationMessage.arguments);
        }

        if (invocationMessage.invocationId) {
          await this._sendWithProtocol(this._createCompletionMessage(invocationMessage.invocationId, null, null));
        }

        if (originalInvokeClientMethod) {
          return originalInvokeClientMethod(invocationMessage);
        }
      };

      await connection.start();
      state.status = 'connected';
      emitState(requestId, 'connected');

      return { success: true, requestId };
    } catch (err) {
      if (connections.has(requestId)) {
        connections.delete(requestId);
      }
      sendEvent('main:signalr:error', requestId, collectionUid, { message: err.message || 'Failed to start SignalR connection', timestamp: Date.now() });
      throw err;
    }
  });

  ipcMain.handle('renderer:signalr:stop-connection', async (event, requestId) => {
    const state = connections.get(requestId);
    if (!state) return { success: true };

    try {
      await state.connection.stop();
    } catch (_) {}
    connections.delete(requestId);
    return { success: true };
  });

  ipcMain.handle('renderer:signalr:send-message', async (event, requestId, method, args) => {
    const state = connections.get(requestId);
    if (!state || state.status !== 'connected') {
      throw new Error('SignalR connection is not active');
    }

    try {
      await state.connection.invoke(method, ...args);
      return { success: true };
    } catch (err) {
      throw err;
    }
  });

  ipcMain.handle('renderer:signalr:connection-status', (event, requestId) => {
    const state = connections.get(requestId);
    if (!state) {
      return { status: 'disconnected' };
    }
    return { status: state.status };
  });

  ipcMain.handle('renderer:signalr:register-handler', (event, requestId, eventName) => {
    const state = connections.get(requestId);
    if (!state) return;

    if (state.handlers.has(eventName)) {
      state.connection.off(eventName);
    }

    const handler = (...args) => {
      sendEvent('main:signalr:event', requestId, state.collectionUid, eventName, args);
    };

    state.connection.on(eventName, handler);
    state.handlers.set(eventName, handler);
  });

  ipcMain.handle('renderer:signalr:remove-handler', (event, requestId, eventName) => {
    const state = connections.get(requestId);
    if (!state) return;

    state.connection.off(eventName);
    state.handlers.delete(eventName);
  });
};

module.exports = registerSignalrEventHandlers;
