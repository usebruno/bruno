import type { KeyValue, Script, Variables, Auth } from '../common';

export type GrpcMethodType =
  | 'unary'
  | 'client-streaming'
  | 'server-streaming'
  | 'bidi-streaming'
  | '';

export interface GrpcMessage {
  name?: string | null;
  content?: string | null;
}

export interface GrpcRequestBody {
  mode: 'grpc';
  grpc?: GrpcMessage[] | null;
}

export interface GrpcRequest {
  url: string;
  method?: string | null;
  methodType?: GrpcMethodType | null;
  protoPath?: string | null;
  headers: KeyValue[];
  auth?: Auth | null;
  body: GrpcRequestBody;
  script?: Script | null;
  vars?: {
    req: Variables;
    res: Variables;
  } | null;
  assertions?: KeyValue[] | null;
  tests?: string | null;
  docs?: string | null;
}

