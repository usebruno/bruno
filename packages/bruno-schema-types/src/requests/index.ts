import type { HttpRequest } from './http';
import type { GrpcRequest } from './grpc';
import type { WebSocketRequest } from './websocket';

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

export type Request = HttpRequest | GrpcRequest | WebSocketRequest;

