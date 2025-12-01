import type { UID, KeyValue } from '../common';
import type { HttpRequestBody, HttpRequestParam } from '../requests';

export type ExampleType = 'http-request' | 'graphql-request' | 'grpc-request';

export interface ExampleRequest {
  url: string;
  method: string;
  headers: KeyValue[];
  params: HttpRequestParam[];
  body: HttpRequestBody;
}

export interface ExampleResponseBody {
  type?: 'json' | 'text' | 'xml' | 'html' | 'binary' | null;
  content?: unknown;
}

export interface ExampleResponse {
  status?: string | null;
  statusText?: string | null;
  headers?: KeyValue[] | null;
  body?: ExampleResponseBody | null;
}

export interface Example {
  uid: UID;
  itemUid: UID;
  name: string;
  description?: string | null;
  type: ExampleType;
  request?: ExampleRequest | null;
  response?: ExampleResponse | null;
}

