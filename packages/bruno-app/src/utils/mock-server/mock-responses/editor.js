import { cloneDeep } from 'lodash';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { extractMockResponseRoutePath } from 'utils/mock-server/mock-responses';

export const MOCK_RESPONSE_ITEM_UID_PREFIX = 'mock-response-item-';

export const getMockResponseItemUid = (responseUid) => `${MOCK_RESPONSE_ITEM_UID_PREFIX}${responseUid}`;

export const getMockResponseUidFromItemUid = (itemUid) => {
  if (!itemUid?.startsWith(MOCK_RESPONSE_ITEM_UID_PREFIX)) {
    return null;
  }

  return itemUid.slice(MOCK_RESPONSE_ITEM_UID_PREFIX.length);
};

export const isMockResponseEditorItemUid = (itemUid) => Boolean(getMockResponseUidFromItemUid(itemUid));

export const buildMockResponseEditorItem = (mockResponse) => {
  const responseUid = mockResponse.uid;
  const itemUid = getMockResponseItemUid(responseUid);
  const requestBody = cloneDeep(mockResponse.request?.body || {});

  if (!requestBody.mode) {
    requestBody.mode = 'none';
  }

  const example = {
    uid: responseUid,
    itemUid,
    name: mockResponse.name || '',
    description: mockResponse.description || '',
    type: 'http-request',
    request: {
      url: extractMockResponseRoutePath(mockResponse.request?.url || '/'),
      method: (mockResponse.request?.method || 'GET').toUpperCase(),
      headers: cloneDeep(mockResponse.request?.headers || []),
      params: cloneDeep(mockResponse.request?.params || []),
      body: requestBody
    },
    response: {
      status: Number(mockResponse.response?.status) || 200,
      statusText: mockResponse.response?.statusText || 'OK',
      headers: cloneDeep(mockResponse.response?.headers || []),
      body: cloneDeep(mockResponse.response?.body || { type: 'json', content: '' })
    }
  };

  const request = cloneDeep(example.request);

  return {
    uid: itemUid,
    name: 'Mock Response',
    type: 'http-request',
    request,
    examples: [],
    draft: {
      type: 'http-request',
      request,
      examples: [example]
    }
  };
};

export const mockResponseFromEditorItem = (item, responseUid, rules, savedMockResponse = {}) => {
  const examples = item.draft?.examples || item.examples || [];
  const example = examples.find((entry) => entry.uid === responseUid);

  if (!example) {
    throw new Error('Mock response draft not found');
  }

  return {
    uid: responseUid,
    name: example.name || '',
    description: example.description || '',
    request: {
      ...cloneDeep(example.request),
      url: extractMockResponseRoutePath(example.request?.url)
    },
    response: cloneDeep(example.response),
    rules: cloneDeep(rules || { operator: 'AND', conditions: [] }),
    ...(savedMockResponse.copiedFrom ? { copiedFrom: cloneDeep(savedMockResponse.copiedFrom) } : {})
  };
};

export const findItemForExampleEditor = (state, collectionUid, itemUid) => {
  const responseUid = getMockResponseUidFromItemUid(itemUid);

  if (responseUid) {
    return state.mockResponseEditors?.[responseUid]?.item || null;
  }

  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) {
    return null;
  }

  return findItemInCollection(collection, itemUid);
};
