import { find, map, filter, cloneDeep } from 'lodash';
import { uuid } from 'utils/common';
import { findCollectionByUid, findItemInCollection } from 'utils/collections';

// Response Example Actions
export const addResponseExample = (state, action) => {
  const { itemUid, collectionUid, example } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item) {
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
          status: String(example.status),
          statusText: String(example.statusText),
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
    }
  }
};

export const updateResponseExample = (state, action) => {
  const { itemUid, collectionUid, exampleUid, example: details } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item.draft.examples.length > 0) {
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        item.draft.examples = item.draft.examples.map((e) =>
          e.uid === exampleUid ? { ...e, ...details } : e);
      }
    }
  }
};

export const deleteResponseExample = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft && item.draft.examples) {
      item.draft.examples = item.draft.examples.filter((e) => e.uid !== exampleUid);
    }
  }
};

export const cancelResponseExampleEdit = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && item.draft && item.draft.examples && item.examples) {
      const originalExample = item.examples.find((e) => e.uid === exampleUid);
      if (originalExample) {
        // Replace the draft example with the original example
        const exampleIndex = item.draft.examples.findIndex((e) => e.uid === exampleUid);
        if (exampleIndex !== -1) {
          item.draft.examples[exampleIndex] = cloneDeep(originalExample);
        }
      }
    }
  }
};

// Response Example Headers
export const addResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.response.headers = example.response.headers || [];
        example.response.headers.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          enabled: true
        });
      }
    }
  }
};

export const updateResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, header } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.response.headers) {
        const headerToUpdate = find(example.response.headers, (h) => h.uid === header.uid);
        if (headerToUpdate) {
          headerToUpdate.name = header.name;
          headerToUpdate.value = header.value;
          headerToUpdate.description = header.description;
          headerToUpdate.enabled = header.enabled;
        }
      }
    }
  }
};

export const deleteResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headerUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.response.headers) {
        example.response.headers = filter(example.response.headers, (h) => h.uid !== headerUid);
      }
    }
  }
};

export const moveResponseExampleHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, updateReorderedItem } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.response && example.response.headers) {
        example.response.headers = updateReorderedItem.map((uid) => {
          return example.response.headers.find((h) => h.uid === uid);
        });
      }
    }
  }
};

export const setResponseExampleHeaders = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headers } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.response.headers = map(headers, ({ name = '', value = '', enabled = true }) => ({
          uid: uuid(),
          name: name,
          value: value,
          description: '',
          enabled: enabled
        }));
      }
    }
  }
};

// Response Example Params
export const addResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request.params = example.request.params || [];
        example.request.params.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          type: 'query',
          enabled: true
        });
      }
    }
  }
};

export const updateResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.params) {
        const paramToUpdate = find(example.request.params, (p) => p.uid === param.uid);
        if (paramToUpdate) {
          paramToUpdate.name = param.name;
          paramToUpdate.value = param.value;
          paramToUpdate.description = param.description;
          paramToUpdate.enabled = param.enabled;
        }
      }
    }
  }
};

export const deleteResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.params) {
        example.request.params = filter(example.request.params, (p) => p.uid !== paramUid);
      }
    }
  }
};

export const moveResponseExampleParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, updateReorderedItem } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.params) {
        example.request.params = updateReorderedItem.map((uid) => {
          return example.request.params.find((p) => p.uid === uid);
        });
      }
    }
  }
};

// Response Example Request/Response Updates
export const updateResponseExampleMultipartFormParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
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
      }
    }
  }
};

export const updateResponseExampleFileBodyParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
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
      }
    }
  }
};

export const updateResponseExampleFormUrlEncodedParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
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
      }
    }
  }
};

export const updateResponseExampleRequest = (state, action) => {
  const { itemUid, collectionUid, exampleUid, request } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request = { ...example.request, ...request };
      }
    }
  }
};

export const updateResponseExampleRequestUrl = (state, action) => {
  const { itemUid, collectionUid, exampleUid, request } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request.url = request.url;
      }
    }
  }
};

export const updateResponseExampleResponse = (state, action) => {
  const { itemUid, collectionUid, exampleUid, response } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.response = { ...example.response, ...response };
      }
    }
  }
};

export const updateResponseExampleDetails = (state, action) => {
  const { itemUid, collectionUid, exampleUid, details } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.name = details.name || example.name;
        example.description = details.description || example.description;
      }
    }
  }
};

export const updateResponseExampleName = (state, action) => {
  const { itemUid, collectionUid, exampleUid, name } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.name = name;
      }
    }
  }
};

export const updateResponseExampleDescription = (state, action) => {
  const { itemUid, collectionUid, exampleUid, description } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.description = description;
      }
    }
  }
};

// Response Example Request Headers
export const addResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request.headers = example.request.headers || [];
        example.request.headers.push({
          uid: uuid(),
          name: '',
          value: '',
          description: '',
          enabled: true
        });
      }
    }
  }
};

export const updateResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, header } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.headers) {
        const headerToUpdate = find(example.request.headers, (h) => h.uid === header.uid);
        if (headerToUpdate) {
          headerToUpdate.name = header.name;
          headerToUpdate.value = header.value;
          headerToUpdate.description = header.description;
          headerToUpdate.enabled = header.enabled;
        }
      }
    }
  }
};

export const deleteResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headerUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.headers) {
        example.request.headers = filter(example.request.headers, (h) => h.uid !== headerUid);
      }
    }
  }
};

export const moveResponseExampleRequestHeader = (state, action) => {
  const { itemUid, collectionUid, exampleUid, updateReorderedItem } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.headers) {
        example.request.headers = updateReorderedItem.map((uid) => {
          return example.request.headers.find((h) => h.uid === uid);
        });
      }
    }
  }
};

export const setResponseExampleRequestHeaders = (state, action) => {
  const { itemUid, collectionUid, exampleUid, headers } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request.headers = map(headers, ({ name = '', value = '', enabled = true }) => ({
          uid: uuid(),
          name: name,
          value: value,
          description: '',
          enabled: enabled
        }));
      }
    }
  }
};

export const setResponseExampleParams = (state, action) => {
  const { itemUid, collectionUid, exampleUid, params } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request.params = map(params, ({ name = '', value = '', enabled = true, type = 'query' }) => ({
          uid: uuid(),
          name: name,
          value: value,
          description: '',
          enabled: enabled,
          type: type
        }));
      }
    }
  }
};

// Response Example Body Types
export const updateResponseExampleBody = (state, action) => {
  const { itemUid, collectionUid, exampleUid, body } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        example.request.body = { ...example.request.body, ...body };
      }
    }
  }
};

// Response Example File Body
export const addResponseExampleFileParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
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
      }
    }
  }
};

export const updateResponseExampleFileParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.body && example.request.body.file) {
        const paramToUpdate = find(example.request.body.file, (p) => p.uid === param.uid);
        if (paramToUpdate) {
          paramToUpdate.name = param.name;
          paramToUpdate.value = param.value;
          paramToUpdate.description = param.description;
          paramToUpdate.enabled = param.enabled;
        }
      }
    }
  }
};

export const deleteResponseExampleFileParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.body && example.request.body.file) {
        example.request.body.file = filter(example.request.body.file, (p) => p.uid !== paramUid);
      }
    }
  }
};

// Response Example Form URL Encoded Body
export const addResponseExampleFormUrlEncodedParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
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
      }
    }
  }
};

export const updateResponseExampleFormUrlEncodedParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.body && example.request.body.formUrlEncoded) {
        const paramToUpdate = find(example.request.body.formUrlEncoded, (p) => p.uid === param.uid);
        if (paramToUpdate) {
          paramToUpdate.name = param.name;
          paramToUpdate.value = param.value;
          paramToUpdate.description = param.description;
          paramToUpdate.enabled = param.enabled;
        }
      }
    }
  }
};

export const deleteResponseExampleFormUrlEncodedParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.body && example.request.body.formUrlEncoded) {
        example.request.body.formUrlEncoded = filter(example.request.body.formUrlEncoded, (p) => p.uid !== paramUid);
      }
    }
  }
};

// Response Example Multipart Form Body
export const addResponseExampleMultipartFormParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
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
      }
    }
  }
};

export const updateResponseExampleMultipartFormParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, param } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.body && example.request.body.multipartForm) {
        const paramToUpdate = find(example.request.body.multipartForm, (p) => p.uid === param.uid);
        if (paramToUpdate) {
          paramToUpdate.name = param.name;
          paramToUpdate.value = param.value;
          paramToUpdate.description = param.description;
          paramToUpdate.enabled = param.enabled;
          paramToUpdate.type = param.type;
          paramToUpdate.contentType = param.contentType;
        }
      }
    }
  }
};

export const deleteResponseExampleMultipartFormParam = (state, action) => {
  const { itemUid, collectionUid, exampleUid, paramUid } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example && example.request.body && example.request.body.multipartForm) {
        example.request.body.multipartForm = filter(example.request.body.multipartForm, (p) => p.uid !== paramUid);
      }
    }
  }
};

// Response Status Code and Status Text Reducers
export const updateResponseExampleStatusCode = (state, action) => {
  const { itemUid, collectionUid, exampleUid, statusCode } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        if (!example.response) {
          example.response = {};
        }
        example.response.status = String(statusCode);
      }
    }
  }
};

export const updateResponseExampleStatusText = (state, action) => {
  const { itemUid, collectionUid, exampleUid, statusText } = action.payload;
  const collection = findCollectionByUid(state.collections, collectionUid);

  if (collection) {
    const item = findItemInCollection(collection, itemUid);
    if (item && !item.draft) {
      item.draft = cloneDeep(item);
    }
    if (item && item.draft) {
      if (!item.draft.examples) {
        item.draft.examples = item.examples ? cloneDeep(item.examples) : [];
      }
      const example = item.draft.examples.find((e) => e.uid === exampleUid);
      if (example) {
        if (!example.response) {
          example.response = {};
        }
        example.response.statusText = String(statusText);
      }
    }
  }
};
