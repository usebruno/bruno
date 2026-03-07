import mqtt from 'mqtt';
import { getParsedMqttUrlObject } from './mqtt-url';
import fs from 'fs';

const createSequencer = () => {
  const seq = {};

  const nextSeq = (requestId, collectionId) => {
    seq[requestId] ||= {};
    seq[requestId][collectionId] ||= 0;
    return ++seq[requestId][collectionId];
  };

  const clean = (requestId, collectionId = undefined) => {
    if (requestId in seq) {
      if (collectionId) {
        delete seq[requestId][collectionId];
        if (!Object.keys(seq[requestId]).length) {
          delete seq[requestId];
        }
      } else {
        delete seq[requestId];
      }
    }
  };

  return { next: nextSeq, clean };
};

const seq = createSequencer();

class MqttClient {
  activeConnections = new Map();

  constructor(eventCallback) {
    this.eventCallback = eventCallback;
  }

  /**
   * Start an MQTT connection
   * @param {Object} params
   * @param {Object} params.request - The MQTT request object
   * @param {Object} params.collection - The collection object
   */
  async startConnection({ request, collection }) {
    const { url, settings } = request;
    const requestId = request.uid;
    const collectionUid = collection.uid;

    const parsedUrl = getParsedMqttUrlObject(url);

    const mqttOptions = {
      clientId: settings.clientId || `bruno-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      protocolVersion: settings.mqttVersion === '5.0' ? 5 : 4,
      keepalive: settings.keepAlive ?? 60,
      clean: settings.cleanSession ?? true,
      connectTimeout: settings.connectTimeout ?? 30000,
      reconnectPeriod: 0 // Disable auto-reconnect; user controls connections
    };

    // Authentication
    if (settings.username) {
      mqttOptions.username = settings.username;
    }
    if (settings.password) {
      mqttOptions.password = settings.password;
    }

    // MQTT 5.0 properties
    if (settings.mqttVersion === '5.0' && settings.v5Properties) {
      const props = {};
      if (settings.v5Properties.sessionExpiryInterval != null) {
        props.sessionExpiryInterval = settings.v5Properties.sessionExpiryInterval;
      }
      if (settings.v5Properties.receiveMaximum != null) {
        props.receiveMaximum = settings.v5Properties.receiveMaximum;
      }
      if (settings.v5Properties.maximumPacketSize != null) {
        props.maximumPacketSize = settings.v5Properties.maximumPacketSize;
      }
      if (settings.v5Properties.topicAliasMaximum != null) {
        props.topicAliasMaximum = settings.v5Properties.topicAliasMaximum;
      }
      if (settings.v5Properties.userProperties?.length) {
        props.userProperties = {};
        for (const kv of settings.v5Properties.userProperties) {
          if (kv.name && kv.enabled !== false) {
            props.userProperties[kv.name] = kv.value;
          }
        }
      }
      if (Object.keys(props).length > 0) {
        mqttOptions.properties = props;
      }
    }

    // TLS/SSL
    if (settings.ssl?.enabled || parsedUrl.protocol === 'mqtts') {
      if (settings.ssl?.caCert) {
        mqttOptions.ca = fs.readFileSync(settings.ssl.caCert);
      }
      if (settings.ssl?.clientCert) {
        mqttOptions.cert = fs.readFileSync(settings.ssl.clientCert);
      }
      if (settings.ssl?.clientKey) {
        mqttOptions.key = fs.readFileSync(settings.ssl.clientKey);
      }
      mqttOptions.rejectUnauthorized = settings.ssl?.rejectUnauthorized ?? !!(settings.ssl?.caCert);
    }

    try {
      this.eventCallback('main:mqtt:connecting', requestId, collectionUid, {
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });

      const client = mqtt.connect(parsedUrl.fullUrl, mqttOptions);

      this.activeConnections.set(requestId, { collectionUid, client });

      this.#setupEventHandlers(client, requestId, collectionUid);

      // Wait for the connection to be established before returning
      // so callers (e.g. auto-subscribe) can rely on client.connected === true
      await new Promise((resolve, reject) => {
        const onConnect = () => {
          client.removeListener('error', onError);
          resolve();
        };
        const onError = (err) => {
          client.removeListener('connect', onConnect);
          reject(err);
        };
        client.once('connect', onConnect);
        client.once('error', onError);
      });

      return client;
    } catch (error) {
      console.error('Error creating MQTT connection:', error);
      this.eventCallback('main:mqtt:error', requestId, collectionUid, {
        error: error.message,
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
      throw error;
    }
  }

  /**
   * Publish a message to a topic
   */
  publish(requestId, collectionUid, { topic, payload, qos = 0, retain = false }) {
    const connectionMeta = this.activeConnections.get(requestId);
    if (!connectionMeta?.client?.connected) {
      this.eventCallback('main:mqtt:error', requestId, collectionUid, {
        error: 'Not connected to broker',
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
      return;
    }

    connectionMeta.client.publish(topic, payload, { qos, retain }, (err) => {
      if (err) {
        this.eventCallback('main:mqtt:error', requestId, collectionUid, {
          error: `Publish failed: ${err.message}`,
          timestamp: Date.now(),
          seq: seq.next(requestId, collectionUid)
        });
      } else {
        this.eventCallback('main:mqtt:message', requestId, collectionUid, {
          topic,
          payload,
          qos,
          retain,
          direction: 'outgoing',
          timestamp: Date.now(),
          seq: seq.next(requestId, collectionUid)
        });
      }
    });
  }

  /**
   * Subscribe to a topic
   */
  subscribe(requestId, collectionUid, { topic, qos = 0 }) {
    const connectionMeta = this.activeConnections.get(requestId);
    if (!connectionMeta?.client?.connected) {
      this.eventCallback('main:mqtt:error', requestId, collectionUid, {
        error: 'Not connected to broker',
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
      return;
    }

    connectionMeta.client.subscribe(topic, { qos }, (err, granted) => {
      if (err) {
        this.eventCallback('main:mqtt:error', requestId, collectionUid, {
          error: `Subscribe failed: ${err.message}`,
          timestamp: Date.now(),
          seq: seq.next(requestId, collectionUid)
        });
      } else {
        this.eventCallback('main:mqtt:subscribe-ack', requestId, collectionUid, {
          topic,
          qos: granted?.[0]?.qos ?? qos,
          timestamp: Date.now(),
          seq: seq.next(requestId, collectionUid)
        });
      }
    });
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(requestId, collectionUid, { topic }) {
    const connectionMeta = this.activeConnections.get(requestId);
    if (!connectionMeta?.client?.connected) return;

    connectionMeta.client.unsubscribe(topic, (err) => {
      if (err) {
        this.eventCallback('main:mqtt:error', requestId, collectionUid, {
          error: `Unsubscribe failed: ${err.message}`,
          timestamp: Date.now(),
          seq: seq.next(requestId, collectionUid)
        });
      }
    });
  }

  /**
   * Close an MQTT connection
   */
  close(requestId) {
    const connectionMeta = this.activeConnections.get(requestId);
    if (connectionMeta?.client) {
      connectionMeta.client.end(true);
      this.activeConnections.delete(requestId);
      seq.clean(requestId);
    }
  }

  /**
   * Check if a connection is active
   */
  isConnectionActive(requestId) {
    const connectionMeta = this.activeConnections.get(requestId);
    return !!connectionMeta?.client?.connected;
  }

  /**
   * Get connection status
   */
  connectionStatus(requestId) {
    const connectionMeta = this.activeConnections.get(requestId);
    if (!connectionMeta?.client) return 'disconnected';
    if (connectionMeta.client.connected) return 'connected';
    if (connectionMeta.client.reconnecting) return 'connecting';
    return 'disconnected';
  }

  /**
   * Get all active connection IDs
   */
  getActiveConnectionIds() {
    return Array.from(this.activeConnections.keys());
  }

  /**
   * Close all connections for a collection
   */
  closeForCollection(collectionUid) {
    for (const [requestId, meta] of this.activeConnections) {
      if (meta.collectionUid === collectionUid) {
        meta.client.end(true);
        this.activeConnections.delete(requestId);
        seq.clean(requestId);
      }
    }
  }

  #setupEventHandlers(client, requestId, collectionUid) {
    client.on('connect', (connack) => {
      this.eventCallback('main:mqtt:open', requestId, collectionUid, {
        timestamp: Date.now(),
        sessionPresent: connack.sessionPresent,
        seq: seq.next(requestId, collectionUid)
      });
    });

    client.on('message', (topic, payload, packet) => {
      let message;
      try {
        message = JSON.parse(payload.toString());
      } catch {
        message = payload.toString();
      }

      this.eventCallback('main:mqtt:message', requestId, collectionUid, {
        topic,
        payload: message,
        qos: packet.qos,
        retain: packet.retain,
        direction: 'incoming',
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
    });

    client.on('close', () => {
      this.eventCallback('main:mqtt:close', requestId, collectionUid, {
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
      this.activeConnections.delete(requestId);
      seq.clean(requestId, collectionUid);
    });

    client.on('error', (error) => {
      this.eventCallback('main:mqtt:error', requestId, collectionUid, {
        error: error.message,
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
    });

    client.on('offline', () => {
      this.eventCallback('main:mqtt:close', requestId, collectionUid, {
        timestamp: Date.now(),
        seq: seq.next(requestId, collectionUid)
      });
    });
  }
}

export { MqttClient };
