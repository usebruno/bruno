import { get, each } from 'lodash';
import { getIntrospectionQuery } from 'graphql';
import { setAuthHeaders, PreparedAuthRequest, SetAuthHeadersOptions } from './set-auth-headers';

export interface RequestHeader {
  name: string;
  value: string;
  enabled?: boolean;
}

export interface InterpolateFn {
  (value: string, vars: Record<string, any>): string;
}

export interface PrepareGqlIntrospectionOptions {
  endpoint: string;
  resolvedVars: Record<string, any>;
  request: {
    headers?: RequestHeader[];
    auth?: any;
  };
  collectionRoot?: {
    request?: {
      headers?: RequestHeader[];
      auth?: any;
    };
  };
  interpolate: InterpolateFn;
}

export interface GqlIntrospectionRequest extends PreparedAuthRequest {
  method: string;
  url: string;
  data: string;
}

const mapHeaders = (
  requestHeaders: RequestHeader[] | undefined,
  collectionHeaders: RequestHeader[] | undefined,
  resolvedVars: Record<string, any>,
  interpolate: InterpolateFn
): Record<string, string> => {
  const headers: Record<string, string> = {};

  each(collectionHeaders, (h: RequestHeader) => {
    if (h.enabled) {
      headers[h.name] = interpolate(h.value, resolvedVars);
    }
  });

  each(requestHeaders, (h: RequestHeader) => {
    if (h.enabled) {
      headers[h.name] = interpolate(h.value, resolvedVars);
    }
  });

  return headers;
};

export const prepareGqlIntrospectionRequest = (options: PrepareGqlIntrospectionOptions): GqlIntrospectionRequest => {
  const { endpoint: rawEndpoint, resolvedVars, request, collectionRoot, interpolate } = options;

  let endpoint = rawEndpoint;
  if (endpoint && endpoint.length) {
    endpoint = interpolate(endpoint, resolvedVars);
  }

  const queryParams = {
    query: getIntrospectionQuery()
  };

  let axiosRequest: GqlIntrospectionRequest = {
    method: 'POST',
    url: endpoint,
    headers: {
      ...mapHeaders(request.headers, get(collectionRoot, 'request.headers', []), resolvedVars, interpolate),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    data: JSON.stringify(queryParams)
  };

  return setAuthHeaders(axiosRequest, {
    request: { auth: request.auth },
    collectionRoot
  } as SetAuthHeadersOptions);
};
