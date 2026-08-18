import type { HttpRequestHeader, HttpResponseHeader, HttpRequestParam, HttpRequestBody } from '@opencollection/types/requests/http';

export interface MockRuleCondition {
  target?: string;
  key?: string;
  operator?: string;
  value?: string;
}

export interface MockRouteRules {
  operator?: 'AND' | 'OR';
  conditions?: MockRuleCondition[];
}

export interface MockRouteEntry {
  name?: string;
  description?: string;
  request?: {
    method?: string;
    url?: string;
    headers?: HttpRequestHeader[];
    params?: HttpRequestParam[];
    body?: HttpRequestBody;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: HttpResponseHeader[];
    body?: {
      type?: string;
      data?: string;
    };
  };
  rules?: MockRouteRules;
  copiedFrom?: {
    example?: string | null;
    requestPath?: string | null;
  };
}

export interface MockServerFile {
  info?: {
    name?: string;
    type?: 'mock';
  };
  mock?: {
    port?: number;
    delay?: number;
    source?: {
      type?: 'collection' | 'spec';
      path?: string;
    };
  };
  routes?: MockRouteEntry[];
}

export interface BrunoMockRoute {
  name: string;
  description: string;
  request: {
    url: string;
    method: string;
    headers: any[];
    params: any[];
    body: any;
  };
  response: {
    status: number;
    statusText: string;
    headers: any[];
    body: {
      type: string;
      content: string;
    };
  };
  rules: {
    operator: 'AND' | 'OR';
    conditions: Array<{ target: string; key: string; operator: string; value: string }>;
  };
  copiedFrom?: {
    exampleName: string | null;
    requestPathname: string | null;
  };
}

export interface BrunoMockServer {
  name: string;
  port: number | null;
  delay: number;
  source: {
    type: 'collection' | 'spec';
    path: string;
  } | null;
  routes: BrunoMockRoute[];
}
