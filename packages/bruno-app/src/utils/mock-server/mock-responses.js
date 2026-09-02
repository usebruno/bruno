import { uuid } from 'utils/common';
import { cloneDeep } from 'lodash';
import {
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked
} from 'utils/collections';
import { resolveMockServerWorkspacePath } from 'utils/mock-server/mock-server-instances';
import { validateName, validateNameError } from 'utils/common/regex';
import { extractMockRoutePath, getMockResponseRouteKey } from '@usebruno/common/utils';

export { extractMockRoutePath as extractMockResponseRoutePath, getMockResponseRouteKey };

export const resolveMockResponseLocation = (instance, workspaces = [], activeWorkspace = null) => ({
  mockServerUid: instance.uid,
  workspacePath: resolveMockServerWorkspacePath(instance, workspaces, activeWorkspace)
});

export const copyExampleToMockResponse = (example, parentRequest) => ({
  name: `${example.name || 'Example'} (mock)`,
  description: example.description || '',
  copiedFrom: {
    exampleName: example.name || null,
    requestPathname: parentRequest?.pathname || null
  },
  request: {
    url: extractMockRoutePath(example.request?.url || parentRequest?.request?.url || '/'),
    method: (example.request?.method || parentRequest?.request?.method || 'GET').toUpperCase(),
    headers: example.request?.headers || [],
    params: example.request?.params || [],
    body: example.request?.body || { mode: 'none' }
  },
  response: {
    status: Number(example.response?.status) || 200,
    statusText: example.response?.statusText || '',
    headers: example.response?.headers || [],
    body: {
      type: example.response?.body?.type || 'json',
      content: example.response?.body?.content || ''
    }
  },
  rules: {
    operator: 'AND',
    conditions: []
  }
});

const getMockResponseMergeKey = (response) => {
  const { exampleName, requestPathname } = response?.copiedFrom || {};

  return exampleName && requestPathname
    ? `example::${requestPathname}::${exampleName}`
    : getMockResponseRouteKey(response);
};

const mergeMockResponsesByRouteKey = (existingResponses = [], nextResponses = [], { keepExistingName = false } = {}) => {
  const responses = [...existingResponses];
  const indexByRouteKey = new Map(
    responses.map((response, index) => [getMockResponseMergeKey(response), index])
  );

  for (const nextResponse of nextResponses) {
    const routeKey = getMockResponseMergeKey(nextResponse);
    const existingIndex = indexByRouteKey.get(routeKey);

    if (existingIndex !== undefined) {
      const existing = responses[existingIndex];
      responses[existingIndex] = {
        ...nextResponse,
        uid: existing.uid,
        name: keepExistingName ? existing.name : nextResponse.name,
        rules: existing.rules
      };
      continue;
    }

    indexByRouteKey.set(routeKey, responses.length);
    responses.push(nextResponse);
  }

  return responses;
};

export const syncMockResponsesFromExamples = (existingResponses = [], exampleEntries = []) => (
  mergeMockResponsesByRouteKey(
    existingResponses,
    exampleEntries.map(({ item, example }) => copyExampleToMockResponse(example, item)),
    { keepExistingName: false }
  )
);

export const syncMockResponsesFromSpec = (existingResponses = [], specResponses = []) => (
  mergeMockResponsesByRouteKey(existingResponses, specResponses, {
    keepExistingName: true
  })
);

// Mirrors the main process rule matcher's path semantics: `$.a.b` walks
// dot-separated object keys.
const setJsonPathValue = (target, jsonPath, value) => {
  const segments = String(jsonPath || '').replace(/^\$\.?/, '').split('.').filter(Boolean);

  if (!segments.length) {
    return;
  }

  let current = target;
  segments.slice(0, -1).forEach((segment) => {
    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }
    current = current[segment];
  });

  current[segments[segments.length - 1]] = value;
};

// Expand common tokens into a literal the matcher will accept.
// Unrecognized patterns fall through to the raw value in demoValueForMatches.
const buildRegexSample = (pattern) => String(pattern)
  .replace(/^\^|\$$/g, '')
  .replace(/\\d(?:\{(\d+)\})?/g, (_, n) => '1'.repeat(Number(n) || 1))
  .replace(/\\(.)/g, '$1')
  .replace(/\(([^)|]*)(?:\|[^)]*)?\)/g, '$1')
  .replace(/\[([^\]]+)\](?:\{(\d+)\})?/g, (_, chars, n) => (
    (chars.startsWith('^') ? 'a' : chars[0]).repeat(Number(n) || 1)
  ))
  .replace(/[?*+]/g, '');

// The stored value of a 'matches' rule is a regex pattern, which usually does
// not satisfy itself, generate a sample the matcher will accept.
const demoValueForMatches = (pattern) => {
  let regex;
  try {
    regex = new RegExp(pattern);
  } catch {
    return pattern;
  }

  for (const candidate of [buildRegexSample(pattern), pattern]) {
    if (regex.test(candidate)) {
      return candidate;
    }
  }

  return pattern;
};

// 'not_equals' matches anything except the value; an empty sample keeps the demo readable.
const demoValueForCondition = (condition) => {
  if (condition.operator === 'not_equals') {
    return '';
  }

  if (condition.operator === 'matches') {
    return demoValueForMatches(condition.value || '');
  }

  return condition.value || '';
};

// Builds a request that satisfies the response's rules: header/query conditions
// become headers/params and body conditions build a JSON body from their $.paths.
// This is what the Demo Request tab shows and what Try sends.
export const buildDemoRequestFromRules = (request, rules) => {
  const conditions = (rules?.conditions || []).filter((condition) => condition?.key);

  const headers = conditions
    .filter((condition) => condition.target === 'header')
    .map((condition) => ({ name: condition.key, value: demoValueForCondition(condition), enabled: true }));

  const params = conditions
    .filter((condition) => condition.target === 'query')
    .map((condition) => ({ name: condition.key, value: demoValueForCondition(condition), type: 'query', enabled: true }));

  const bodyConditions = conditions.filter((condition) => condition.target === 'body');
  let body = null;
  if (bodyConditions.length) {
    const bodyObject = {};
    bodyConditions.forEach((condition) => setJsonPathValue(bodyObject, condition.key, demoValueForCondition(condition)));
    body = { mode: 'json', content: JSON.stringify(bodyObject, null, 2) };
    if (body?.mode === 'json' && body?.content) {
      body.json = JSON.parse(body.content);
    }
  }

  return {
    url: extractMockRoutePath(request?.url || '/'),
    method: (request?.method || 'GET').toUpperCase(),
    headers,
    params,
    body
  };
};

export const buildMockServerTryUrl = ({
  port,
  requestUrl,
  params = []
}) => {
  let path = extractMockRoutePath(requestUrl);
  const query = (params || [])
    .filter((param) => param?.enabled !== false && param?.name)
    .map((param) => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.value || '')}`)
    .join('&');

  if (query) {
    path += path.includes('?') ? `&${query}` : `?${query}`;
  }

  return `http://localhost:${port}${path}`;
};

export const buildMockServerTryRequest = ({
  port,
  request
}) => {
  const url = buildMockServerTryUrl({
    port,
    requestUrl: request?.url,
    params: request?.params
  });
  const method = (request?.method || 'GET').toUpperCase();
  const headers = (request?.headers || [])
    .filter((header) => header?.enabled !== false && header?.name)
    .reduce((acc, header) => {
      acc[header.name] = header.value || '';
      return acc;
    }, {});
  const body = request?.body;
  let requestBody = null;

  if (body?.mode === 'json' && body.json) {
    requestBody = body.json;
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  } else if (body?.mode === 'text' && body.text) {
    requestBody = body.text;
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'text/plain';
    }
  }

  return {
    url,
    method,
    headers,
    body: requestBody
  };
};

export const tryMockResponseRequest = async (options) => {
  const payload = buildMockServerTryRequest(options);
  const result = await window.ipcRenderer.invoke('renderer:mock-server-try-request', payload);

  if (!result?.success) {
    throw new Error(result?.error || 'Could not reach the mock server');
  }

  return result;
};

export const resolveMockResponseCollection = ({
  collection,
  instance,
  collections = [],
  activeWorkspace = null
}) => {
  if (collection?.uid) {
    return collection;
  }

  if (instance?.collectionUid) {
    const instanceCollection = collections.find((item) => item.uid === instance.collectionUid);
    if (instanceCollection) {
      return instanceCollection;
    }
  }

  if (activeWorkspace?.scratchCollectionUid) {
    return collections.find((item) => item.uid === activeWorkspace.scratchCollectionUid) || null;
  }

  return null;
};

export const resolveMockResponseEditorCollection = ({
  collection,
  globalEnvironments = [],
  activeGlobalEnvironmentUid = null,
  activeWorkspace = null
}) => {
  if (!collection?.uid) {
    return null;
  }

  const enrichedCollection = cloneDeep(collection);
  enrichedCollection.globalEnvironmentVariables = getGlobalEnvironmentVariables({
    globalEnvironments,
    activeGlobalEnvironmentUid
  });
  enrichedCollection.globalEnvSecrets = getGlobalEnvironmentVariablesMasked({
    globalEnvironments,
    activeGlobalEnvironmentUid
  });

  if (activeWorkspace?.processEnvVariables) {
    enrichedCollection.workspaceProcessEnvVariables = activeWorkspace.processEnvVariables;
  }

  return enrichedCollection;
};

export const MOCK_RESPONSE_NAME_MAX_LENGTH = 255;

export const MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH = 1000;

export const getMockResponseNameError = (name) => {
  const value = name == null ? '' : String(name).trim();

  if (!validateName(value)) {
    return validateNameError(value);
  }

  return null;
};

export const getMockResponseNameInputError = (name) => {
  const value = name == null ? '' : String(name).trim();

  if (!value) {
    return null;
  }

  return getMockResponseNameError(value);
};

export const getMockResponseDescriptionError = (description) => {
  const value = description == null ? '' : String(description).trim();

  if (value.length > MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH) {
    return `Description must be ${MOCK_RESPONSE_DESCRIPTION_MAX_LENGTH} characters or less`;
  }

  return null;
};

export const isMockResponseNameTaken = (responses = [], name, excludeUid = null) => {
  const normalized = name?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return responses.some((response) => (
    response.uid !== excludeUid && response.name?.trim().toLowerCase() === normalized
  ));
};

export const cloneMockResponseRecord = (response, { name } = {}) => {
  const cloned = JSON.parse(JSON.stringify(response));
  delete cloned.uid;
  cloned.name = name || `${response.name || 'Mock Response'} copy`;

  if (Array.isArray(cloned.response?.headers)) {
    cloned.response.headers = cloned.response.headers.map((header) => ({
      ...header,
      uid: uuid()
    }));
  }

  if (Array.isArray(cloned.request?.headers)) {
    cloned.request.headers = cloned.request.headers.map((header) => ({
      ...header,
      uid: uuid()
    }));
  }

  if (Array.isArray(cloned.request?.params)) {
    cloned.request.params = cloned.request.params.map((param) => ({
      ...param,
      uid: uuid()
    }));
  }

  if (Array.isArray(cloned.rules?.conditions)) {
    cloned.rules.conditions = cloned.rules.conditions.map((condition) => ({
      ...condition,
      uid: condition?.uid ? uuid() : condition?.uid
    }));
  }

  return cloned;
};

export const collectCollectionExamples = (collection) => {
  const examples = [];

  const walk = (items = []) => {
    for (const item of items) {
      if (item.type === 'http-request' && item.examples?.length) {
        for (const example of item.examples) {
          examples.push({
            item,
            example
          });
        }
      }

      if (item.items?.length) {
        walk(item.items);
      }
    }
  };

  walk(collection?.items || []);
  return examples;
};

export const buildMockRouteTable = (responses = []) => {
  const routeMap = new Map();

  for (const response of responses) {
    const method = (response?.request?.method || 'GET').toUpperCase();
    const path = extractMockRoutePath(response?.request?.url);
    const key = `${method} ${path}`;

    if (!routeMap.has(key)) {
      routeMap.set(key, []);
    }

    routeMap.get(key).push(response);
  }

  return Array.from(routeMap.entries())
    .map(([key, items]) => {
      const [method, ...pathParts] = key.split(' ');
      return {
        method,
        path: pathParts.join(' '),
        responseCount: items.length,
        responses: items.map((item) => ({
          uid: item.uid,
          name: item.name || 'Mock Response',
          status: Number(item.response?.status) || 200,
          sourceFile: 'mock-response'
        })),
        defaultResponse: items.find((item) => !item.rules?.conditions?.length)?.name || null
      };
    })
    .sort((left, right) => (
      `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`)
    ));
};

export const countMockRoutes = (responses = []) => buildMockRouteTable(responses).length;

export const countMatchedRouteHits = (entries = []) => {
  const hitCounts = {};

  for (const entry of entries) {
    if (!entry?.matched || entry.error) {
      continue;
    }

    const key = `${entry.method} ${entry.path}`;
    hitCounts[key] = (hitCounts[key] || 0) + 1;
  }

  return hitCounts;
};
