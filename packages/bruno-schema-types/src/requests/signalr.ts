import type { KeyValue, Script, Variable, Auth, Variables } from '../common';

export interface SignalRInvocation {
  name?: string | null;
  method: string;
  arguments?: unknown[] | null;
}

export interface SignalRRequestBody {
  mode: 'signalr';
  signalr?: SignalRInvocation[] | null;
}

export interface SignalRRequest {
  url: string;
  headers: KeyValue[];
  auth?: Auth | null;
  body: SignalRRequestBody;
  protocol?: 'json' | 'messagepack';
  script?: Script | null;
  vars?: {
    req: Variables;
    res: Variables;
  } | null;
  assertions?: KeyValue[] | null;
  tests?: string | null;
  docs?: string | null;
}
