import { find, map, filter, cloneDeep, each, concat } from 'lodash';
import { parseQueryParams, buildQueryString as stringifyQueryParams } from '@usebruno/common/utils';
import { uuid } from 'utils/common';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { parsePathParams, splitOnFirst, interpolateUrlPathParams } from 'utils/url';

export const addResponseExample = (state, action) => {
  const { itemUid, collectionUid, example } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }
  if (!item.draft.examples) {
    item.draft.examples = [];
  }

  const newExample = {
    uid: uuid(),
    itemUid: item.uid,
    name: example.name,
    description: example.description,
    type: item.draft.type,
    request: {
      url: item.draft.request.url,
      method: item.draft.request.method,
      headers: item.draft.request.headers,
      params: item.draft.request.params,
      body: item.draft.request.body
    },
    response: {
      status: String(example.status ?? ''),
      statusText: String(example.statusText ?? ''),
      headers: (example.headers || []).map((header) => ({
        uid: uuid(),
        name: String(header.name),
        value: String(header.value),
        description: String(header.description),
        enabled: header.enabled
      })),
      body: example.body
    }
  };

  item.draft.examples.push(newExample);
};

export const updateResponseExample = (state, action) => {
  const { itemUid, collectionUid, exampleUid, example: details } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (item.draft.examples.length === 0) return;

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  item.draft.examples = item.draft.examples.map((e) =>
    e.uid === exampleUid ? { ...e, ...details } : e);
};

export const deleteResponseExample = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) return;

  item.draft.examples = item.draft.examples.filter((e) => e.uid !== exampleUid);
};

export const cancelResponseExampleEdit = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;
  if (!item.draft) return;
  if (!item.draft.examples) return;
  if (!item.examples) return;

  const originalExample = item.examples.find((e) => e.uid === exampleUid);
  if (!originalExample) return;

  // Replace the draft example with the original example
  const exampleIndex = item.draft.examples.findIndex((e) => e.uid === exampleUid);
  if (exampleIndex === -1) return;

  item.draft.examples[exampleIndex] = cloneDeep(originalExample);
};

// Response Example Headers
export const addResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.response.headers = example.response.headers || [];
  example.response.headers.push({
    uid: uuid(),
    name: '',
    value: '',
    description: '',
    enabled: true
  });
};

export const updateResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, header } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.response.headers) return;

  const headerToUpdate = find(example.response.headers, (h) => h.uid === header.uid);
  if (!headerToUpdate) return;

  headerToUpdate.name = header.name;
  headerToUpdate.value = header.value;
  headerToUpdate.description = header.description;
  headerToUpdate.enabled = header.enabled;
};

export const deleteResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headerUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.response.headers) return;

  example.response.headers = filter(example.response.headers, (h) => h.uid !== headerUid);
};

export const moveResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, updateReorderedItem } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.response) return;
  if (!example.response.headers) return;

  example.response.headers = updateReorderedItem.map((uid) => {
    return example.response.headers.find((h) => h.uid === uid);
  });
};

export const setResponseExampleHeaders = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headers } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.response.headers = map(headers, ({ name = '', value = '', enabled = true }) => ({
    uid: uuid(),
    name: name,
    value: value,
    description: '',
    enabled: enabled
  }));
};

// Response Example Params
export const addResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.request.params = example.request.params || [];
  example.request.params.push({
    uid: uuid(),
    name: '',
    value: '',
    description: '',
    type: 'query',
    enabled: true
  });
};

export const updateResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.params) return;

  const paramToUpdate = find(example.request.params, (p) => p.uid === param.uid);
  if (!paramToUpdate) return;

  paramToUpdate.name = param.name;
  paramToUpdate.value = param.value;
  paramToUpdate.description = param.description;
  paramToUpdate.enabled = param.enabled;

  if (paramToUpdate.type === 'query') {
    const parts = splitOnFirst(example.request.url, '?');
    const query = stringifyQueryParams(filter(example.request.params, (p) => p.enabled && p.type === 'query'));

    if (!query || !query.length) {
      if (parts.length) {
        example.request.url = parts[0];
      }
    } else {
      if (!parts.length) {
        example.request.url += '?' + query;
      } else {
        example.request.url = parts[0] + '?' + query;
      }
    }
  }
};

export const deleteResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.params) return;

  const paramToDelete = find(example.request.params, (p) => p.uid === paramUid);
  example.request.params = filter(example.request.params, (p) => p.uid !== paramUid);

  if (paramToDelete && paramToDelete.type === 'query') {
    const parts = splitOnFirst(example.request.url, '?');
    const query = stringifyQueryParams(filter(example.request.params, (p) => p.enabled && p.type === 'query'));

    if (!query || !query.length) {
      if (parts.length) {
        example.request.url = parts[0];
      }
    } else {
      if (!parts.length) {
        example.request.url += '?' + query;
      } else {
        example.request.url = parts[0] + '?' + query;
      }
    }
  }
};

export const moveResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, updateReorderedItem } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.params) return;

  example.request.params = updateReorderedItem.map((uid) => {
    return example.request.params.find((p) => p.uid === uid);
  });
};

// Response Example Request/Response Updates
export const updateResponseExampleMultipartFormParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request) {
    example.request = {};
  }
  if (!example.request.body) {
    example.request.body = { mode: 'multipartForm', multipartForm: [] };
  }

  // Ensure all params have unique UIDs
  const paramsWithUids = params.map((param, index) => ({
    ...param,
    uid: param.uid || uuid()
  }));

  example.request.body.multipartForm = paramsWithUids;
};

export const updateResponseExampleFileBodyParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request) {
    example.request = {};
  }
  if (!example.request.body) {
    example.request.body = { mode: 'file', file: [] };
  }

  // Ensure all params have unique UIDs
  const paramsWithUids = params.map((param, index) => ({
    ...param,
    uid: param.uid || uuid()
  }));

  example.request.body.file = paramsWithUids;
};

export const updateResponseExampleFormUrlEncodedParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request) {
    example.request = {};
  }
  if (!example.request.body) {
    example.request.body = { mode: 'formUrlEncoded', formUrlEncoded: [] };
  }

  // Ensure all params have unique UIDs
  const paramsWithUids = params.map((param, index) => ({
    ...param,
    uid: param.uid || uuid()
  }));

  example.request.body.formUrlEncoded = paramsWithUids;
};

export const updateResponseExampleRequest = (state, action) => {
  const { itemUid, collectionUid, exampleUid, request } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.request = { ...example.request, ...request };
};

export const updateResponseExampleRequestUrl = (state, action) => {
  const { itemUid, collectionUid, exampleUid, request } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request) {
    example.request = {};
  }

  example.request.url = request.url;

  const parts = splitOnFirst(example.request.url, '?');
  const urlQueryParams = parseQueryParams(parts[1]);
  let urlPathParams = [];

  try {
    urlPathParams = parsePathParams(parts[0]);
  } catch (err) {
    console.error(err);
  }

  const existingParams = example.request.params || [];
  const disabledQueryParams = filter(existingParams, (p) => !p.enabled && p.type === 'query');
  let enabledQueryParams = filter(existingParams, (p) => p.enabled && p.type === 'query');
  let oldPathParams = filter(existingParams, (p) => p.enabled && p.type === 'path');
  let newPathParams = [];

  each(urlQueryParams, (urlQueryParam) => {
    const existingQueryParam = find(enabledQueryParams, (p) => p?.name === urlQueryParam?.name || p?.value === urlQueryParam?.value);
    urlQueryParam.uid = existingQueryParam?.uid || uuid();
    urlQueryParam.enabled = true;
    urlQueryParam.type = 'query';

    if (existingQueryParam) {
      enabledQueryParams = filter(enabledQueryParams, (p) => p?.uid !== existingQueryParam?.uid);
    }
  });

  newPathParams = filter(urlPathParams, (urlPath) => {
    const existingPathParam = find(oldPathParams, (p) => p.name === urlPath.name);
    if (existingPathParam) {
      // Preserve existing path parameter values
      urlPath.value = existingPathParam.value;
      return false;
    }
    urlPath.uid = uuid();
    urlPath.enabled = true;
    urlPath.type = 'path';
    return true;
  });

  oldPathParams = filter(oldPathParams, (urlPath) => {
    return find(urlPathParams, (p) => p.name === urlPath.name);
  });

  example.request.params = concat(urlQueryParams, newPathParams, disabledQueryParams, oldPathParams);
};

export const updateResponseExampleResponse = (state, action) => {
  const { itemUid, collectionUid, exampleUid, response } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.response = { ...example.response, ...response };
};

export const updateResponseExampleDetails = (state, action) => {
  const { itemUid, collectionUid, exampleUid, details } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.name = details.name || example.name;
  example.description = details.description || example.description;
};

export const updateResponseExampleName = (state, action) => {
  const { itemUid, collectionUid, exampleUid, name } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.name = name;
};

export const updateResponseExampleDescription = (state, action) => {
  const { itemUid, collectionUid, exampleUid, description } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.description = description;
};

// Response Example Request Headers
export const addResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.request.headers = example.request.headers || [];
  example.request.headers.push({
    uid: uuid(),
    name: '',
    value: '',
    description: '',
    enabled: true
  });
};

export const updateResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, header } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.headers) return;

  const headerToUpdate = find(example.request.headers, (h) => h.uid === header.uid);
  if (!headerToUpdate) return;

  headerToUpdate.name = header.name;
  headerToUpdate.value = header.value;
  headerToUpdate.description = header.description;
  headerToUpdate.enabled = header.enabled;
};

export const deleteResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headerUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.headers) return;

  example.request.headers = filter(example.request.headers, (h) => h.uid !== headerUid);
};

export const moveResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, updateReorderedItem } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.headers) return;

  example.request.headers = updateReorderedItem.map((uid) => {
    return example.request.headers.find((h) => h.uid === uid);
  });
};

export const setResponseExampleRequestHeaders = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headers } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.request.headers = map(headers, ({ name = '', value = '', enabled = true }) => ({
    uid: uuid(),
    name: name,
    value: value,
    description: '',
    enabled: enabled
  }));
};

export const setResponseExampleParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.request.params = map(params, ({ name = '', value = '', enabled = true, type = 'query' }) => ({
    uid: uuid(),
    name: name,
    value: value,
    description: '',
    enabled: enabled,
    type: type
  }));
};

// Response Example Body Types
export const updateResponseExampleBody = (state, action) => {
  const { itemUid, collectionUid, exampleUid, body } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  example.request.body = { ...example.request.body, ...body };
};

// Response Example File Body
export const addResponseExampleFileParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request.body) {
    example.request.body = { mode: 'file', file: [] };
  }
  if (!example.request.body.file) {
    example.request.body.file = [];
  }

  example.request.body.file.push({
    uid: uuid(),
    name: '',
    value: '',
    description: '',
    enabled: true
  });
};

export const updateResponseExampleFileParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.body) return;
  if (!example.request.body.file) return;

  const paramToUpdate = find(example.request.body.file, (p) => p.uid === param.uid);
  if (!paramToUpdate) return;

  paramToUpdate.name = param.name;
  paramToUpdate.value = param.value;
  paramToUpdate.description = param.description;
  paramToUpdate.enabled = param.enabled;
};

export const deleteResponseExampleFileParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.body) return;
  if (!example.request.body.file) return;

  example.request.body.file = filter(example.request.body.file, (p) => p.uid !== paramUid);
};

// Response Example Form URL Encoded Body
export const addResponseExampleFormUrlEncodedParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request.body) {
    example.request.body = { mode: 'formUrlEncoded', formUrlEncoded: [] };
  }
  if (!example.request.body.formUrlEncoded) {
    example.request.body.formUrlEncoded = [];
  }

  example.request.body.formUrlEncoded.push({
    uid: uuid(),
    name: '',
    value: '',
    description: '',
    enabled: true
  });
};

export const updateResponseExampleFormUrlEncodedParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.body) return;
  if (!example.request.body.formUrlEncoded) return;

  const paramToUpdate = find(example.request.body.formUrlEncoded, (p) => p.uid === param.uid);
  if (!paramToUpdate) return;

  paramToUpdate.name = param.name;
  paramToUpdate.value = param.value;
  paramToUpdate.description = param.description;
  paramToUpdate.enabled = param.enabled;
};

export const deleteResponseExampleFormUrlEncodedParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.body) return;
  if (!example.request.body.formUrlEncoded) return;

  example.request.body.formUrlEncoded = filter(example.request.body.formUrlEncoded, (p) => p.uid !== paramUid);
};

// Response Example Multipart Form Body
export const addResponseExampleMultipartFormParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.request.body) {
    example.request.body = { mode: 'multipartForm', multipartForm: [] };
  }
  if (!example.request.body.multipartForm) {
    example.request.body.multipartForm = [];
  }

  example.request.body.multipartForm.push({
    uid: uuid(),
    name: '',
    value: '',
    description: '',
    enabled: true,
    type: 'text',
    contentType: ''
  });
};

export const updateResponseExampleMultipartFormParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.body) return;
  if (!example.request.body.multipartForm) return;

  const paramToUpdate = find(example.request.body.multipartForm, (p) => p.uid === param.uid);
  if (!paramToUpdate) return;

  paramToUpdate.name = param.name;
  paramToUpdate.value = param.value;
  paramToUpdate.description = param.description;
  paramToUpdate.enabled = param.enabled;
  paramToUpdate.type = param.type;
  paramToUpdate.contentType = param.contentType;
};

export const deleteResponseExampleMultipartFormParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;
  if (!example.request.body) return;
  if (!example.request.body.multipartForm) return;

  example.request.body.multipartForm = filter(example.request.body.multipartForm, (p) => p.uid !== paramUid);
};

// Response Status Code and Status Text Reducers
export const updateResponseExampleStatusCode = (state, action) => {
  const { itemUid, collectionUid, exampleUid, statusCode } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.response) {
    example.response = {};
  }

  example.response.status = String(statusCode ?? '');
};

export const updateResponseExampleStatusText = (state, action) => {
  const { itemUid, collectionUid, exampleUid, statusText } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (!collection) return;

  const item = findItemInCollection(collection, itemUid);
  if (!item) return;

  if (!item.draft) {
    item.draft = cloneDeep(item);
  }

  if (!item.draft.examples) {
    item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
  }

  const example = item.draft.examples.find((e) => e.uid === exampleUid);
  if (!example) return;

  if (!example.response) {
    example.response = {};
  }

  example.response.statusText = String(statusText ?? '');
};
