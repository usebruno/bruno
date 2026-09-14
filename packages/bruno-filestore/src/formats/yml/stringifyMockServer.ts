import { stringifyYml } from './utils';
import { isNonEmptyString } from '../../utils';
import { toOpenCollectionHttpHeaders, toOpenCollectionResponseHeaders } from './common/headers';
import { toOpenCollectionParams } from './common/params';
import { toOpenCollectionBody } from './common/body';
import type {
  MockServerFile,
  MockRouteEntry,
  BrunoMockServer,
  BrunoMockRoute
} from './mockServerTypes';

const toOcRuleConditions = (conditions: BrunoMockRoute['rules']['conditions']) => (
  conditions.map((condition) => ({
    target: condition.target || '',
    key: condition.key || '',
    operator: condition.operator || 'equals',
    value: condition.value || ''
  }))
);

const toOcMockRoute = (route: BrunoMockRoute): MockRouteEntry => {
  const ocRoute: MockRouteEntry = {
    name: route.name || 'Untitled Mock Response'
  };

  if (isNonEmptyString(route.description)) {
    ocRoute.description = route.description;
  }

  ocRoute.request = {
    method: route.request?.method || 'GET',
    url: route.request?.url || '/'
  };

  const requestHeaders = toOpenCollectionHttpHeaders(route.request?.headers);
  if (requestHeaders) {
    ocRoute.request.headers = requestHeaders;
  }

  const requestParams = toOpenCollectionParams(route.request?.params);
  if (requestParams) {
    ocRoute.request.params = requestParams;
  }

  const requestBody = toOpenCollectionBody(route.request?.body);
  if (requestBody !== undefined && !Array.isArray(requestBody)) {
    ocRoute.request.body = requestBody;
  }

  ocRoute.response = {
    status: Number(route.response?.status) || 200
  };

  if (isNonEmptyString(route.response?.statusText)) {
    ocRoute.response.statusText = route.response.statusText;
  }

  const responseHeaders = toOpenCollectionResponseHeaders(route.response?.headers);
  if (responseHeaders) {
    ocRoute.response.headers = responseHeaders;
  }

  const responseBody = route.response?.body;
  if (responseBody && responseBody.type) {
    const content = responseBody.content;
    ocRoute.response.body = {
      type: responseBody.type,
      data: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    };
  }

  if (route.rules?.conditions?.length) {
    ocRoute.rules = {
      operator: route.rules.operator === 'OR' ? 'OR' : 'AND',
      conditions: toOcRuleConditions(route.rules.conditions)
    };
  }

  if (route.copiedFrom && (route.copiedFrom.exampleName || route.copiedFrom.requestPathname)) {
    ocRoute.copiedFrom = {};
    if (route.copiedFrom.exampleName) {
      ocRoute.copiedFrom.example = route.copiedFrom.exampleName;
    }
    if (route.copiedFrom.requestPathname) {
      ocRoute.copiedFrom.requestPath = route.copiedFrom.requestPathname;
    }
  }

  return ocRoute;
};

const stringifyMockServer = (mockServer: BrunoMockServer): string => {
  try {
    const ocMockServer: MockServerFile = {
      info: {
        name: mockServer.name && mockServer.name.trim().length ? mockServer.name : 'Mock Server',
        type: 'mock'
      },
      mock: {
        port: Number(mockServer.port) || 4000
      }
    };

    const delay = Number(mockServer.delay);
    if (delay > 0) {
      ocMockServer.mock!.delay = delay;
    }

    const source = mockServer.source;
    if (source && (source.type === 'collection' || source.type === 'spec') && source.path) {
      ocMockServer.mock!.source = {
        type: source.type,
        path: source.path
      };
    }

    if (mockServer.routes?.length) {
      ocMockServer.routes = mockServer.routes.map(toOcMockRoute);
    }

    return stringifyYml(ocMockServer);
  } catch (error) {
    console.error('Error stringifying mock server:', error);
    throw error;
  }
};

export default stringifyMockServer;
