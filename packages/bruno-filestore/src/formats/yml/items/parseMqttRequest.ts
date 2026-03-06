import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import type { MqttRequest as BrunoMqttRequest } from '@usebruno/schema-types/requests/mqtt';
import { toBrunoVariables } from '../common/variables';
import { toBrunoScripts } from '../common/scripts';
import { uuid, ensureString } from '../../../utils';

const parseMqttRequest = (ocRequest: any): BrunoItem => {
  const info = ocRequest.info;
  const mqtt = ocRequest.mqtt;
  const runtime = ocRequest.runtime;

  const brunoRequest: BrunoMqttRequest = {
    url: ensureString(mqtt?.url),
    publish: {
      topic: ensureString(mqtt?.publish?.topic),
      qos: mqtt?.publish?.qos ?? 0,
      retain: mqtt?.publish?.retain ?? false,
      payload: {
        type: mqtt?.publish?.payload?.type || 'json',
        content: ensureString(mqtt?.publish?.payload?.data)
      }
    },
    subscriptions: (mqtt?.subscriptions || []).map((sub: any) => ({
      topic: ensureString(sub.topic),
      qos: sub.qos ?? 0,
      enabled: sub.enabled ?? true
    })),
    settings: {
      clientId: ensureString(mqtt?.settings?.clientId),
      mqttVersion: mqtt?.settings?.mqttVersion || '5.0',
      keepAlive: mqtt?.settings?.keepAlive ?? 60,
      cleanSession: mqtt?.settings?.cleanSession ?? true,
      connectTimeout: mqtt?.settings?.connectTimeout ?? 30000,
      username: mqtt?.settings?.username || null,
      password: mqtt?.settings?.password || null,
      ssl: {
        enabled: mqtt?.settings?.ssl?.enabled ?? false,
        caCert: mqtt?.settings?.ssl?.caCert || null,
        clientCert: mqtt?.settings?.ssl?.clientCert || null,
        clientKey: mqtt?.settings?.ssl?.clientKey || null
      },
      v5Properties: mqtt?.settings?.v5Properties ? {
        sessionExpiryInterval: mqtt.settings.v5Properties.sessionExpiryInterval ?? null,
        receiveMaximum: mqtt.settings.v5Properties.receiveMaximum ?? null,
        maximumPacketSize: mqtt.settings.v5Properties.maximumPacketSize ?? null,
        topicAliasMaximum: mqtt.settings.v5Properties.topicAliasMaximum ?? null,
        userProperties: (mqtt.settings.v5Properties.userProperties || []).map((kv: any) => ({
          name: kv.name || '',
          value: kv.value || '',
          enabled: kv.enabled ?? true
        }))
      } : null
    },
    script: {
      req: null,
      res: null
    },
    vars: {
      req: [],
      res: []
    },
    assertions: [],
    tests: null,
    docs: null
  };

  // scripts
  const scripts = toBrunoScripts(runtime?.scripts);
  if (scripts?.script && brunoRequest.script) {
    if (scripts.script.req) {
      brunoRequest.script.req = scripts.script.req;
    }
    if (scripts.script.res) {
      brunoRequest.script.res = scripts.script.res;
    }
  }
  if (scripts?.tests) {
    brunoRequest.tests = scripts.tests;
  }

  // variables
  const variables = toBrunoVariables(runtime?.variables);
  brunoRequest.vars = variables;

  // docs
  if (ocRequest.docs) {
    brunoRequest.docs = ocRequest.docs;
  }

  const brunoItem: BrunoItem = {
    uid: uuid(),
    type: 'mqtt-request',
    seq: info?.seq || 1,
    name: ensureString(info?.name, 'Untitled Request'),
    tags: info?.tags || [],
    request: brunoRequest,
    settings: null,
    fileContent: null,
    root: null,
    items: [],
    examples: [],
    filename: null,
    pathname: null
  };

  return brunoItem;
};

export default parseMqttRequest;
