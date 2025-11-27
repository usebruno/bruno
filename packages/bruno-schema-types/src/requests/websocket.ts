import type { KeyValue, Script, Variables, Auth } from '../common';

export interface WebSocketMessage {
  name?: string | null;
  type?: string | null;
  content?: string | null;
}

export interface WebSocketRequestBody {
  mode: 'ws';
  ws?: WebSocketMessage[] | null;
}

export interface WebSocketRequest {
  url: string;
  headers: KeyValue[];
  auth?: Auth | null;
  body: WebSocketRequestBody;
  script?: Script | null;
  vars?: {
    req: Variables;
    res: Variables;
  } | null;
  assertions?: KeyValue[] | null;
  tests?: string | null;
  docs?: string | null;
}

