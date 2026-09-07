import { parseYml } from './utils';
import { ensureString, isNonEmptyString } from '../../utils';
import { toBrunoHttpHeaders } from './common/headers';
import { toBrunoParams } from './common/params';
import { toBrunoBody } from './common/body';
import type {
  MockServerFile,
  MockRouteEntry,
  BrunoMockServer,
  BrunoMockRoute,
  MockRuleCondition
} from './mockServerTypes';

const emptyRequestBody = () => ({
  mode: 'none',
  json: null,
  text: null,
  xml: null,
  sparql: null,
  formUrlEncoded: null,
  multipartForm: null,
  graphql: null,
  file: null
});

const toBrunoRuleConditions = (conditions: MockRuleCondition[] | null | undefined) => {
  if (!Array.isArray(conditions)) {
    return [];
  }

  return conditions.map((condition) => ({
    target: ensureString(condition?.target),
    key: ensureString(condition?.key),
    operator: ensureString(condition?.operator, 'equals'),
    value: ensureString(condition?.value)
  }));
};

const toBrunoMockRoute = (route: MockRouteEntry): BrunoMockRoute => {
  const responseStatus = Number(route?.response?.status) || 200;
  const responseStatusText = ensureString(route?.response?.statusText);

  const brunoRoute: BrunoMockRoute = {
    name: ensureString(route?.name, 'Untitled Mock Response'),
    description: ensureString(route?.description),
    request: {
      url: ensureString(route?.request?.url, '/'),
      method: ensureString(route?.request?.method, 'GET'),
      headers: toBrunoHttpHeaders(route?.request?.headers) || [],
      params: toBrunoParams(route?.request?.params) || [],
      body: toBrunoBody(route?.request?.body) || emptyRequestBody()
    },
    response: {
      status: responseStatus,
      statusText: responseStatusText === 'OK' && responseStatus !== 200 ? '' : responseStatusText,
      headers: toBrunoHttpHeaders(route?.response?.headers) || [],
      body: {
        type: ensureString(route?.response?.body?.type, 'json'),
        content: ensureString(route?.response?.body?.data)
      }
    },
    rules: {
      operator: route?.rules?.operator === 'OR' ? 'OR' : 'AND',
      conditions: toBrunoRuleConditions(route?.rules?.conditions)
    }
  };

  const rawExample = route?.copiedFrom?.example;
  const rawRequestPath = route?.copiedFrom?.requestPath;
  const copiedFromExample = isNonEmptyString(rawExample) ? rawExample : null;
  const copiedFromRequestPath = isNonEmptyString(rawRequestPath) ? rawRequestPath : null;

  if (copiedFromExample || copiedFromRequestPath) {
    brunoRoute.copiedFrom = {
      exampleName: copiedFromExample,
      requestPathname: copiedFromRequestPath
    };
  }

  return brunoRoute;
};

const parseMockServer = (content: string): BrunoMockServer => {
  const parsed: MockServerFile = parseYml(content);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid mock server file');
  }

  const info = parsed.info || ({} as NonNullable<MockServerFile['info']>);
  const mock = parsed.mock || ({} as NonNullable<MockServerFile['mock']>);

  const brunoMockServer: BrunoMockServer = {
    name: ensureString(info.name, 'Mock Server'),
    port: Number(mock.port) || null,
    delay: Number(mock.delay) || 0,
    source: null,
    routes: Array.isArray(parsed.routes) ? parsed.routes.map(toBrunoMockRoute) : []
  };

  const sourceType = mock.source?.type;
  const sourcePath = mock.source?.path;
  if ((sourceType === 'collection' || sourceType === 'spec') && isNonEmptyString(sourcePath)) {
    brunoMockServer.source = {
      type: sourceType,
      path: sourcePath
    };
  }

  return brunoMockServer;
};

export default parseMockServer;
