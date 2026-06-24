import { uuid } from 'utils/common';
import { cloneDeep } from 'lodash';
import {
  getGlobalEnvironmentVariables,
  getGlobalEnvironmentVariablesMasked
} from 'utils/collections';
import { resolveMockServerWorkspacePath } from 'utils/mock-server-instances';

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

export const extractMockResponseRoutePath = (rawUrl) => {
  if (!rawUrl) {
    return '/';
  }

  let cleaned = String(rawUrl).trim();
  cleaned = cleaned.replace(/^\{\{[^}]+\}\}/, '');

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      cleaned = new URL(cleaned).pathname;
    } catch {
      const qIndex = cleaned.indexOf('?');
      if (qIndex !== -1) {
        cleaned = cleaned.substring(0, qIndex);
      }
    }
  } else {
    const ipHostMatch = cleaned.match(/^(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?(\/[^?#]*)?/);
    if (ipHostMatch) {
      cleaned = ipHostMatch[1] || '/';
    } else {
      const domainHostMatch = cleaned.match(/^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?(\/[^?#]*)?/);
      if (domainHostMatch) {
        cleaned = domainHostMatch[1] || '/';
      }
    }

    const qIndex = cleaned.indexOf('?');
    if (qIndex !== -1) {
      cleaned = cleaned.substring(0, qIndex);
    }
  }

  cleaned = cleaned.replace(/\{\{([^}]+)\}\}/g, ':$1');

  if (!cleaned.startsWith('/')) {
    cleaned = `/${cleaned}`;
  }
  if (cleaned.length > 1 && cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.replace(/\/+/g, '/');

  return cleaned || '/';
};

export const getMockResponseRouteKey = (response) => {
  const method = (response?.request?.method || 'GET').toUpperCase();
  const url = extractMockResponseRoutePath(response?.request?.url);
  const status = Number(response?.response?.status) || 200;
  return `${method} ${url}::${status}`;
};

export const copyExampleToMockResponse = (example, parentRequest) => ({
  name: `${example.name || 'Example'} (mock)`,
  description: example.description || '',
  copiedFrom: {
    exampleName: example.name || null,
    requestPathname: parentRequest?.pathname || null
  },
  request: {
    url: extractMockResponseRoutePath(example.request?.url || parentRequest?.request?.url || '/'),
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

export const syncMockResponsesFromExamples = (existingResponses = [], exampleEntries = []) => {
  const responses = [...existingResponses];
  const indexByRouteKey = new Map(
    responses.map((response, index) => [getMockResponseRouteKey(response), index])
  );

  for (const { item, example } of exampleEntries) {
    const nextResponse = copyExampleToMockResponse(example, item);
    const routeKey = getMockResponseRouteKey(nextResponse);
    const existingIndex = indexByRouteKey.get(routeKey);

    if (existingIndex !== undefined) {
      const existing = responses[existingIndex];
      responses[existingIndex] = {
        ...nextResponse,
        uid: existing.uid,
        name: nextResponse.name,
        rules: existing.rules
      };
      continue;
    }

    nextResponse.uid = uuid();
    indexByRouteKey.set(routeKey, responses.length);
    responses.push(nextResponse);
  }

  return responses;
};

export const buildMockServerTryUrl = ({
  port,
  requestUrl,
  sharedSlug,
  isSharedMode,
  params = []
}) => {
  let path = extractMockResponseRoutePath(requestUrl);
  const query = (params || [])
    .filter((param) => param?.enabled !== false && param?.name)
    .map((param) => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.value || '')}`)
    .join('&');

  if (query) {
    path += path.includes('?') ? `&${query}` : `?${query}`;
  }

  const base = `http://localhost:${port}`;

  if (isSharedMode && sharedSlug) {
    return `${base}/${sharedSlug}${path === '/' ? '' : path}`;
  }

  return `${base}${path}`;
};

export const buildMockServerTryRequest = ({
  port,
  request,
  sharedSlug,
  isSharedMode
}) => {
  const url = buildMockServerTryUrl({
    port,
    requestUrl: request?.url,
    sharedSlug,
    isSharedMode,
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
