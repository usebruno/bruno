import type { HttpRequest } from './http';
import type { GrpcRequest } from './grpc';
import type { WebSocketRequest } from './websocket';
import type { MqttRequest } from './mqtt';

export type {
  HttpRequest,
  HttpRequestBody,
  HttpRequestBodyMode,
  HttpRequestParam,
  HttpRequestParamType
} from './http';

export type {
  GrpcRequest,
  GrpcRequestBody,
  GrpcMessage,
  GrpcMethodType
} from './grpc';

export type {
  WebSocketRequest,
  WebSocketRequestBody,
  WebSocketMessage
} from './websocket';

export type {
  MqttRequest,
  MqttPublishConfig,
  MqttSubscription,
  MqttSettings,
  MqttV5Properties,
  MqttSslConfig
} from './mqtt';

export type Request = HttpRequest | GrpcRequest | WebSocketRequest | MqttRequest;
