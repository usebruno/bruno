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

export const copyExampleToMockResponse = (example, parentRequest) => ({
  name: `${example.name || 'Example'} (mock)`,
  description: example.description || '',
  copiedFrom: {
    exampleName: example.name || null,
    requestPathname: parentRequest?.pathname || null
  },
  request: {
    url: example.request?.url || parentRequest?.request?.url || '/',
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
