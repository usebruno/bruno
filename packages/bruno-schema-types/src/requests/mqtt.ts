import type { KeyValue, Script, Variables } from '../common';

export interface MqttPublishConfig {
  topic: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  payload: {
    type: 'json' | 'text' | 'xml' | 'binary';
    content: string;
  };
}

export interface MqttSubscription {
  topic: string;
  qos: 0 | 1 | 2;
  enabled: boolean;
}

export interface MqttV5Properties {
  sessionExpiryInterval?: number | null;
  receiveMaximum?: number | null;
  maximumPacketSize?: number | null;
  topicAliasMaximum?: number | null;
  userProperties?: KeyValue[] | null;
}

export interface MqttSslConfig {
  enabled: boolean;
  caCert?: string | null;
  clientCert?: string | null;
  clientKey?: string | null;
}

export interface MqttSettings {
  clientId: string;
  mqttVersion: '3.1.1' | '5.0';
  keepAlive: number;
  cleanSession: boolean;
  connectTimeout: number;
  username?: string | null;
  password?: string | null;
  ssl: MqttSslConfig;
  v5Properties?: MqttV5Properties | null;
}

export interface MqttRequest {
  url: string;
  publish: MqttPublishConfig;
  subscriptions: MqttSubscription[];
  settings: MqttSettings;
  script?: Script | null;
  vars?: {
    req: Variables;
    res: Variables;
  } | null;
  assertions?: KeyValue[] | null;
  tests?: string | null;
  docs?: string | null;
}
