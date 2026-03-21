const { ipcMain } = require('electron');
const { MqttClient } = require('@usebruno/requests');
const { cloneDeep, get } = require('lodash');
const interpolateVars = require('./interpolate-vars');
const {
  getEnvVars,
  getTreePathFromCollectionToItem,
  mergeScripts,
  mergeVars
} = require('../../utils/collection');
const { getProcessEnvVars } = require('../../store/process-env');
const prepareMqttRequest = (item, collection, environment, runtimeVariables) => {
  const request = item.draft ? item.draft.request : item.request;
  const brunoConfig = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig', {})
    : get(collection, 'brunoConfig', {});

  const scriptFlow = brunoConfig?.scripts?.flow ?? 'sandwich';
  const requestTreePath = getTreePathFromCollectionToItem(collection, item);
  if (requestTreePath && requestTreePath.length > 0) {
    mergeScripts(collection, request, requestTreePath, scriptFlow);
    mergeVars(collection, request, requestTreePath);
    request.globalEnvironmentVariables = collection?.globalEnvironmentVariables;
  }

  const envVars = getEnvVars(environment);
  const processEnvVars = getProcessEnvVars(collection.uid);

  let mqttRequest = {
    uid: item.uid,
    url: request.url,
    publish: cloneDeep(request.publish),
    subscriptions: cloneDeep(request.subscriptions),
    settings: cloneDeep(request.settings),
    processEnvVars,
    envVars,
    runtimeVariables,
    vars: request.vars,
    collectionVariables: request.collectionVariables,
    folderVariables: request.folderVariables,
    requestVariables: request.requestVariables,
    globalEnvironmentVariables: request.globalEnvironmentVariables
  };

  interpolateVars(mqttRequest, envVars, runtimeVariables, processEnvVars);

  return mqttRequest;
};

let mqttClient;

const registerMqttEventHandlers = (window) => {
  const sendEvent = (eventName, ...args) => {
    if (window && !window.isDestroyed() && window.webContents && !window.webContents.isDestroyed()) {
      window.webContents.send(eventName, ...args);
    } else {
      console.warn(`Unable to send message "${eventName}": Window not available`);
    }
  };

  mqttClient = new MqttClient(sendEvent);

  // Start a new MQTT connection
  ipcMain.handle(
    'renderer:mqtt:start-connection',
    async (event, { request, collection, environment, runtimeVariables }) => {
      try {
        const requestCopy = cloneDeep(request);
        const preparedRequest = prepareMqttRequest(requestCopy, collection, environment, runtimeVariables);

        await mqttClient.startConnection({
          request: preparedRequest,
          collection
        });

        sendEvent('main:mqtt:request', preparedRequest.uid, collection.uid, {
          type: 'request',
          url: preparedRequest.url,
          settings: preparedRequest.settings,
          timestamp: Date.now()
        });

        // Auto-subscribe to enabled subscriptions
        const enabledSubs = (preparedRequest.subscriptions || []).filter((s) => s.enabled);
        for (const sub of enabledSubs) {
          mqttClient.subscribe(preparedRequest.uid, collection.uid, {
            topic: sub.topic,
            qos: sub.qos
          });
        }

        return { success: true };
      } catch (error) {
        console.error('Error starting MQTT connection:', error);
        sendEvent('main:mqtt:error', request.uid, collection.uid, { error: error.message });
        return { success: false, error: error.message };
      }
    }
  );

  // Publish a message
  ipcMain.handle(
    'renderer:mqtt:publish',
    async (event, { item, collection, environment, runtimeVariables }) => {
      try {
        const itemCopy = cloneDeep(item);
        const preparedRequest = prepareMqttRequest(itemCopy, collection, environment, runtimeVariables);

        mqttClient.publish(preparedRequest.uid, collection.uid, {
          topic: preparedRequest.publish.topic,
          payload: preparedRequest.publish.payload.content,
          qos: preparedRequest.publish.qos,
          retain: preparedRequest.publish.retain
        });

        return { success: true };
      } catch (error) {
        console.error('Error publishing MQTT message:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Subscribe to a topic
  ipcMain.handle(
    'renderer:mqtt:subscribe',
    (event, { requestId, collectionUid, topic, qos }) => {
      try {
        mqttClient.subscribe(requestId, collectionUid, { topic, qos });
        return { success: true };
      } catch (error) {
        console.error('Error subscribing to MQTT topic:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Unsubscribe from a topic
  ipcMain.handle(
    'renderer:mqtt:unsubscribe',
    (event, { requestId, collectionUid, topic }) => {
      try {
        mqttClient.unsubscribe(requestId, collectionUid, { topic });
        return { success: true };
      } catch (error) {
        console.error('Error unsubscribing from MQTT topic:', error);
        return { success: false, error: error.message };
      }
    }
  );

  // Close connection
  ipcMain.handle('renderer:mqtt:close-connection', (event, requestId) => {
    try {
      mqttClient.close(requestId);
      return { success: true };
    } catch (error) {
      console.error('Error closing MQTT connection:', error);
      return { success: false, error: error.message };
    }
  });

  // Get connection status
  ipcMain.handle('renderer:mqtt:connection-status', (event, requestId) => {
    try {
      const status = mqttClient.connectionStatus(requestId);
      return { success: true, status };
    } catch (error) {
      console.error('Error getting MQTT connection status:', error);
      return { success: false, error: error.message, status: 'disconnected' };
    }
  });
};

module.exports = {
  registerMqttEventHandlers,
  mqttClient,
  prepareMqttRequest
};
