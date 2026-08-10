import { uuid } from 'utils/common';
import { cloneDeep } from 'lodash';
import {
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked
} from 'utils/collections';
import { resolveMockServerWorkspacePath } from 'utils/mock-server/mock-server-instances';
import { extractMockRoutePath, getMockResponseRouteKey } from '@usebruno/common/utils';

export { extractMockRoutePath as extractMockResponseRoutePath, getMockResponseRouteKey };

export const resolveMockResponseLocation = (
  instance,
  collection,
  collections = [],
  workspaces = [],
  activeWorkspace = null
) => {
  let collectionPath = null;

  if (instance?.sourceType === 'collection') {
    collectionPath = collection?.pathname
      || collections.find((item) => item.uid === instance.collectionUid)?.pathname
      || null;
  }

  return {
    mockServerUid: instance.uid,
    sourceType: instance.sourceType,
    collectionPath,
    workspacePath: resolveMockServerWorkspacePath(instance, workspaces, activeWorkspace)
  };
};

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
    statusText: example.response?.statusText || 'OK',
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

const mergeMockResponsesByRouteKey = (existingResponses = [], nextResponses = [], { keepExistingName = false, ensureUid = false } = {}) => {
  const responses = [...existingResponses];
  const indexByRouteKey = new Map(
    responses.map((response, index) => [getMockResponseRouteKey(response), index])
  );

  for (const nextResponse of nextResponses) {
    const routeKey = getMockResponseRouteKey(nextResponse);
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

    const toPush = ensureUid && !nextResponse.uid
      ? { ...nextResponse, uid: uuid() }
      : nextResponse;
    indexByRouteKey.set(routeKey, responses.length);
    responses.push(toPush);
  }

  return responses;
};

export const syncMockResponsesFromExamples = (existingResponses = [], exampleEntries = []) => (
  mergeMockResponsesByRouteKey(
    existingResponses,
    exampleEntries.map(({ item, example }) => copyExampleToMockResponse(example, item)),
    { keepExistingName: false, ensureUid: true }
  )
);

export const syncMockResponsesFromSpec = (existingResponses = [], specResponses = []) => (
  mergeMockResponsesByRouteKey(existingResponses, specResponses, {
    keepExistingName: true,
    ensureUid: false
  })
);

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

  if (body?.mode === 'json' && body.content) {
    requestBody = body.content;
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }
  } else if (body?.mode === 'text' && body.content) {
    requestBody = body.content;
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

export const getMockResponseNameError = (name) => {
  const value = name == null ? '' : String(name).trim();

  if (!value) {
    return 'Mock response name is required';
  }

  if (value.length > MOCK_RESPONSE_NAME_MAX_LENGTH) {
    return `Name must be ${MOCK_RESPONSE_NAME_MAX_LENGTH} characters or less`;
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
  cloned.uid = uuid();
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
        defaultResponse: items[0]?.name || null
      };
    })
    .sort((left, right) => (
      `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`)
    ));
};

export const countMatchedRouteHits = (entries = []) => {
  const hitCounts = {};

  for (const entry of entries) {
    if (!entry?.matched) {
      continue;
    }

    const key = `${entry.method} ${entry.path}`;
    hitCounts[key] = (hitCounts[key] || 0) + 1;
  }

  return hitCounts;
};
