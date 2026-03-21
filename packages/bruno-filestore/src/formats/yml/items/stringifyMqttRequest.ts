import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { MqttRequest as BrunoMqttRequest } from '@usebruno/schema-types/requests/mqtt';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Variable } from '@opencollection/types/common/variables';
import { stringifyYml } from '../utils';
import { isNonEmptyString } from '../../../utils';
import { toOpenCollectionVariables } from '../common/variables';
import { toOpenCollectionScripts } from '../common/scripts';

const stringifyMqttRequest = (item: BrunoItem): string => {
  try {
    const ocRequest: Record<string, any> = {};
    const brunoRequest = item.request as BrunoMqttRequest;

    // info block
    const info: Record<string, any> = {
      name: isNonEmptyString(item.name) ? item.name : 'Untitled Request',
      type: 'mqtt'
    };
    if (item.seq) {
      info.seq = item.seq;
    }
    if (item.tags?.length) {
      info.tags = item.tags;
    }
    ocRequest.info = info;

    // mqtt block
    const mqtt: Record<string, any> = {
      url: isNonEmptyString(brunoRequest.url) ? brunoRequest.url : ''
    };

    // publish config
    mqtt.publish = {
      topic: brunoRequest.publish?.topic || '',
      qos: brunoRequest.publish?.qos ?? 0,
      retain: brunoRequest.publish?.retain ?? false,
      payload: {
        type: brunoRequest.publish?.payload?.type || 'json',
        data: brunoRequest.publish?.payload?.content || ''
      }
    };

    // subscriptions
    if (brunoRequest.subscriptions?.length) {
      mqtt.subscriptions = brunoRequest.subscriptions.map((sub: any) => ({
        topic: sub.topic,
        qos: sub.qos ?? 0,
        enabled: sub.enabled ?? true
      }));
    }

    // settings
    const settings = brunoRequest.settings;
    if (settings) {
      mqtt.settings = {
        clientId: settings.clientId || '',
        mqttVersion: settings.mqttVersion || '5.0',
        keepAlive: settings.keepAlive ?? 60,
        cleanSession: settings.cleanSession ?? true,
        connectTimeout: settings.connectTimeout ?? 30000,
        username: settings.username || '',
        password: settings.password || ''
      };

      // SSL
      if (settings.ssl) {
        mqtt.settings.ssl = {
          enabled: settings.ssl.enabled ?? false,
          rejectUnauthorized: settings.ssl.rejectUnauthorized ?? true,
          caCert: settings.ssl.caCert || '',
          clientCert: settings.ssl.clientCert || '',
          clientKey: settings.ssl.clientKey || ''
        };
      }

      // MQTT 5.0 properties
      if (settings.v5Properties) {
        mqtt.settings.v5Properties = {
          sessionExpiryInterval: settings.v5Properties.sessionExpiryInterval ?? null,
          receiveMaximum: settings.v5Properties.receiveMaximum ?? null,
          maximumPacketSize: settings.v5Properties.maximumPacketSize ?? null,
          topicAliasMaximum: settings.v5Properties.topicAliasMaximum ?? null,
          userProperties: settings.v5Properties.userProperties?.map((kv: any) => ({
            name: kv.name,
            value: kv.value,
            enabled: kv.enabled
          })) || []
        };
      }
    }

    ocRequest.mqtt = mqtt;

    // runtime block
    const runtime: Record<string, any> = {};
    let hasRuntime = false;

    const variables: Variable[] | undefined = toOpenCollectionVariables(brunoRequest.vars);
    if (variables) {
      runtime.variables = variables;
      hasRuntime = true;
    }

    const scripts: Scripts | undefined = toOpenCollectionScripts(brunoRequest);
    if (scripts) {
      runtime.scripts = scripts;
      hasRuntime = true;
    }

    if (hasRuntime) {
      ocRequest.runtime = runtime;
    }

    // docs
    if (isNonEmptyString(brunoRequest.docs)) {
      ocRequest.docs = brunoRequest.docs;
    }

    return stringifyYml(ocRequest);
  } catch (error) {
    console.error('Error stringifying MQTT request:', error);
    throw error;
  }
};

export default stringifyMqttRequest;
