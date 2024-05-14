import get from 'lodash/get';
import each from 'lodash/each';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import isString from 'lodash/isString';
import map from 'lodash/map';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import isEqual from 'lodash/isEqual';
import cloneDeep from 'lodash/cloneDeep';
import { uuid } from 'utils/common';
import path from 'path';

const replaceTabsWithSpaces = (str, numSpaces = 2) => {
  if (!str || !str.length || !isString(str)) {
    return '';
  }

  return str.replaceAll('\t', ' '.repeat(numSpaces));
};

export const addDepth = (items = []) => {
  const depth = (itms, initialDepth) => {
    each(itms, (i) => {
      i.depth = initialDepth;

      if (i.items && i.items.length) {
        depth(i.items, initialDepth + 1);
      }
    });
  };

  depth(items, 1);
};

export const collapseCollection = (collection) => {
  collection.collapsed = true;

  const collapseItem = (items) => {
    each(items, (i) => {
      i.collapsed = true;

      if (i.items && i.items.length) {
        collapseItem(i.items);
      }
    });
  };

  collapseItem(collection.items, 1);
};

export const sortItems = (collection) => {
  const sort = (obj) => {
    if (obj.items && obj.items.length) {
      obj.items = sortBy(obj.items, 'type');
    }

    each(obj.items, (i) => sort(i));
  };

  sort(collection);
};

export const flattenItems = (items = []) => {
  const flattenedItems = [];

  const flatten = (itms, flattened) => {
    each(itms, (i) => {
      flattened.push(i);

      if (i.items && i.items.length) {
        flatten(i.items, flattened);
      }
    });
  };

  flatten(items, flattenedItems);

  return flattenedItems;
};

export const findItem = (items = [], itemUid) => {
  return find(items, (i) => i.uid === itemUid);
};

export const findCollectionByUid = (collections, collectionUid) => {
  return find(collections, (c) => c.uid === collectionUid);
};

export const findCollectionByPathname = (collections, pathname) => {
  return find(collections, (c) => c.pathname === pathname);
};

export const findCollectionByItemUid = (collections, itemUid) => {
  return find(collections, (c) => {
    return findItemInCollection(c, itemUid);
  });
};

export const findItemByPathname = (items = [], pathname) => {
  return find(items, (i) => i.pathname === pathname);
};

export const findItemInCollectionByPathname = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return findItemByPathname(flattenedItems, pathname);
};

export const findItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return findItem(flattenedItems, itemUid);
};

export const findParentItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.uid === itemUid);
  });
};

export const recursivelyGetAllItemUids = (items = []) => {
  let flattenedItems = flattenItems(items);

  return map(flattenedItems, (i) => i.uid);
};

export const findEnvironmentInCollection = (collection, envUid) => {
  return find(collection.environments, (e) => e.uid === envUid);
};

export const moveCollectionItem = (collection, draggedItem, targetItem) => {
  let draggedItemParent = findParentItemInCollection(collection, draggedItem.uid);

  if (draggedItemParent) {
    draggedItemParent.items = sortBy(draggedItemParent.items, (item) => item.seq);
    draggedItemParent.items = filter(draggedItemParent.items, (i) => i.uid !== draggedItem.uid);
    draggedItem.pathname = path.join(draggedItemParent.pathname, draggedItem.filename);
  } else {
    collection.items = sortBy(collection.items, (item) => item.seq);
    collection.items = filter(collection.items, (i) => i.uid !== draggedItem.uid);
  }

  if (targetItem.type === 'folder') {
    targetItem.items = sortBy(targetItem.items || [], (item) => item.seq);
    targetItem.items.push(draggedItem);
    draggedItem.pathname = path.join(targetItem.pathname, draggedItem.filename);
  } else {
    let targetItemParent = findParentItemInCollection(collection, targetItem.uid);

    if (targetItemParent) {
      targetItemParent.items = sortBy(targetItemParent.items, (item) => item.seq);
      let targetItemIndex = findIndex(targetItemParent.items, (i) => i.uid === targetItem.uid);
      targetItemParent.items.splice(targetItemIndex + 1, 0, draggedItem);
      draggedItem.pathname = path.join(targetItemParent.pathname, draggedItem.filename);
    } else {
      collection.items = sortBy(collection.items, (item) => item.seq);
      let targetItemIndex = findIndex(collection.items, (i) => i.uid === targetItem.uid);
      collection.items.splice(targetItemIndex + 1, 0, draggedItem);
      draggedItem.pathname = path.join(collection.pathname, draggedItem.filename);
    }
  }
};

export const moveCollectionItemToRootOfCollection = (collection, draggedItem) => {
  let draggedItemParent = findParentItemInCollection(collection, draggedItem.uid);

  // If the dragged item is already at the root of the collection, do nothing
  if (!draggedItemParent) {
    return;
  }

  draggedItemParent.items = sortBy(draggedItemParent.items, (item) => item.seq);
  draggedItemParent.items = filter(draggedItemParent.items, (i) => i.uid !== draggedItem.uid);
  collection.items = sortBy(collection.items, (item) => item.seq);
  collection.items.push(draggedItem);
  if (draggedItem.type == 'folder') {
    draggedItem.pathname = path.join(collection.pathname, draggedItem.name);
  } else {
    draggedItem.pathname = path.join(collection.pathname, draggedItem.filename);
  }
};

export const getItemsToResequence = (parent, collection) => {
  let itemsToResequence = [];

  if (!parent) {
    let index = 1;
    each(collection.items, (item) => {
      if (isItemARequest(item)) {
        itemsToResequence.push({
          pathname: item.pathname,
          seq: index++
        });
      }
    });
    return itemsToResequence;
  }

  if (parent.items && parent.items.length) {
    let index = 1;
    each(parent.items, (item) => {
      if (isItemARequest(item)) {
        itemsToResequence.push({
          pathname: item.pathname,
          seq: index++
        });
      }
    });
    return itemsToResequence;
  }

  return itemsToResequence;
};

export const transformCollectionToSaveToExportAsFile = (collection, options = {}) => {
  const copyHeaders = (headers) => {
    return map(headers, (header) => {
      return {
        uid: header.uid,
        name: header.name,
        value: header.value,
        description: header.description,
        enabled: header.enabled
      };
    });
  };

  const copyQueryParams = (params) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: param.enabled
      };
    });
  };

  const copyFormUrlEncodedParams = (params = []) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: param.enabled
      };
    });
  };

  const copyMultipartFormParams = (params = []) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        type: param.type,
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: param.enabled
      };
    });
  };

  const copyRequest = (request) => {
    return {
      url: request.url,
      method: request.method,
      headers: copyHeaders(request.headers),
      params: copyQueryParams(request.params),
      body: {
        mode: request.body.mode,
        json: request.body.json,
        text: request.body.text,
        xml: request.body.xml,
        graphql: request.body.graphql,
        sparql: request.body.sparql,
        formUrlEncoded: copyFormUrlEncodedParams(request.body.formUrlEncoded),
        multipartForm: copyMultipartFormParams(request.body.multipartForm)
      },
      auth: {
        mode: get(request, 'auth.mode', 'none'),
        basic: {
          username: get(request, 'auth.basic.username', ''),
          password: get(request, 'auth.basic.password', '')
        },
        bearer: {
          token: get(request, 'auth.bearer.token', '')
        }
      },
      script: request.script,
      vars: request.vars,
      assertions: request.assertions,
      tests: request.tests
    };
  };

  const copyItems = (sourceItems, destItems) => {
    each(sourceItems, (si) => {
      if (!isItemAFolder(si) && !isItemARequest(si) && si.type !== 'js') {
        return;
      }

      const di = {
        uid: si.uid,
        type: si.type,
        name: si.name,
        seq: si.seq
      };

      /* If the item is a draft, we take the data from the draft to save.
       The condition "!options.ignoreDraft" might seem confusing at first.
       When saving a collection, this option allows the caller to specify whether to ignore any draft changes while still saving the rest of the collection.
       This is particularly useful when renaming requests/collections, as it allows changes in the draft to remain unsaved in the indexeddb, thus not affecting the original data.
      */

      // If the item type is 'js', we directly save the raw content of the item.
      if (si.type === 'js') {
        di.fileContent = si.raw;
      } else if (si.draft && !options.ignoreDraft) {
        if (si.draft.request) {
          di.request = copyRequest(si.draft.request);
        }
      } else {
        if (si.request) {
          di.request = copyRequest(si.request);
        }
      }

      if (di.request && di.request.body.mode === 'json') {
        di.request.body.json = replaceTabsWithSpaces(di.request.body.json);
      }

      destItems.push(di);

      if (si.items && si.items.length) {
        di.items = [];
        copyItems(si.items, di.items);
      }
    });
  };

  const collectionToSave = {};
  collectionToSave.name = collection.name;
  collectionToSave.uid = collection.uid;

  // todo: move this to the place where collection gets created
  collectionToSave.version = '1';
  collectionToSave.items = [];
  collectionToSave.activeEnvironmentUid = collection.activeEnvironmentUid;
  collectionToSave.environments = collection.environments || [];

  collectionToSave.brunoConfig = cloneDeep(collection?.brunoConfig);

  // delete proxy password if present
  if (collectionToSave?.brunoConfig?.proxy?.auth?.password) {
    delete collectionToSave.brunoConfig.proxy.auth.password;
  }

  copyItems(collection.items, collectionToSave.items);
  return collectionToSave;
};

export const transformRequestToSaveToFilesystem = (item) => {
  const _item = item.draft ? item.draft : item;
  const itemToSave = {
    uid: _item.uid,
    type: _item.type,
    name: _item.name,
    seq: _item.seq,
    request: {
      method: _item.request.method,
      url: _item.request.url,
      params: [],
      headers: [],
      auth: _item.request.auth,
      body: _item.request.body,
      script: _item.request.script,
      vars: _item.request.vars,
      assertions: _item.request.assertions,
      tests: _item.request.tests,
      docs: _item.request.docs
    }
  };

  each(_item.request.params, (param) => {
    itemToSave.request.params.push({
      uid: param.uid,
      name: param.name,
      value: param.value,
      description: param.description,
      enabled: param.enabled
    });
  });

  each(_item.request.headers, (header) => {
    itemToSave.request.headers.push({
      uid: header.uid,
      name: header.name,
      value: header.value,
      description: header.description,
      enabled: header.enabled
    });
  });

  if (itemToSave.request.body.mode === 'json') {
    itemToSave.request.body = {
      ...itemToSave.request.body,
      json: replaceTabsWithSpaces(itemToSave.request.body.json)
    };
  }

  return itemToSave;
};

// todo: optimize this
export const deleteItemInCollection = (itemUid, collection) => {
  collection.items = filter(collection.items, (i) => i.uid !== itemUid);

  let flattenedItems = flattenItems(collection.items);
  each(flattenedItems, (i) => {
    if (i.items && i.items.length) {
      i.items = filter(i.items, (i) => i.uid !== itemUid);
    }
  });
};

export const deleteItemInCollectionByPathname = (pathname, collection) => {
  collection.items = filter(collection.items, (i) => i.pathname !== pathname);

  let flattenedItems = flattenItems(collection.items);
  each(flattenedItems, (i) => {
    if (i.items && i.items.length) {
      i.items = filter(i.items, (i) => i.pathname !== pathname);
    }
  });
};

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request') && ['http-request', 'graphql-request'].includes(item.type) && !item.items;
};

export const isItemAFolder = (item) => {
  return !item.hasOwnProperty('request') && item.type === 'folder';
};

export const humanizeRequestBodyMode = (mode) => {
  let label = 'No Body';
  switch (mode) {
    case 'json': {
      label = 'JSON';
      break;
    }
    case 'text': {
      label = 'TEXT';
      break;
    }
    case 'xml': {
      label = 'XML';
      break;
    }
    case 'sparql': {
      label = 'SPARQL';
      break;
    }
    case 'formUrlEncoded': {
      label = 'Form URL Encoded';
      break;
    }
    case 'multipartForm': {
      label = 'Multipart Form';
      break;
    }
  }

  return label;
};

export const humanizeRequestAuthMode = (mode) => {
  let label = 'No Auth';
  switch (mode) {
    case 'inherit': {
      label = 'Inherit';
      break;
    }
    case 'awsv4': {
      label = 'AWS Sig V4';
      break;
    }
    case 'basic': {
      label = 'Basic Auth';
      break;
    }
    case 'bearer': {
      label = 'Bearer Token';
      break;
    }
    case 'digest': {
      label = 'Digest Auth';
      break;
    }
    case 'oauth2': {
      label = 'OAuth 2.0';
      break;
    }
  }

  return label;
};

export const humanizeGrantType = (mode) => {
  let label = 'No Auth';
  switch (mode) {
    case 'password': {
      label = 'Password Credentials';
      break;
    }
    case 'authorization_code': {
      label = 'Authorization Code';
      break;
    }
    case 'client_credentials': {
      label = 'Client Credentials';
      break;
    }
  }

  return label;
};

export const refreshUidsInItem = (item) => {
  item.uid = uuid();

  each(get(item, 'request.headers'), (header) => (header.uid = uuid()));
  each(get(item, 'request.params'), (param) => (param.uid = uuid()));
  each(get(item, 'request.body.multipartForm'), (param) => (param.uid = uuid()));
  each(get(item, 'request.body.formUrlEncoded'), (param) => (param.uid = uuid()));

  return item;
};

export const deleteUidsInItem = (item) => {
  delete item.uid;
  const params = get(item, 'request.params', []);
  const headers = get(item, 'request.headers', []);
  const bodyFormUrlEncoded = get(item, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = get(item, 'request.body.multipartForm', []);

  params.forEach((param) => delete param.uid);
  headers.forEach((header) => delete header.uid);
  bodyFormUrlEncoded.forEach((param) => delete param.uid);
  bodyMultipartForm.forEach((param) => delete param.uid);

  return item;
};

export const areItemsTheSameExceptSeqUpdate = (_item1, _item2) => {
  let item1 = cloneDeep(_item1);
  let item2 = cloneDeep(_item2);

  // remove seq from both items
  delete item1.seq;
  delete item2.seq;

  // remove draft from both items
  delete item1.draft;
  delete item2.draft;

  // get projection of both items
  item1 = transformRequestToSaveToFilesystem(item1);
  item2 = transformRequestToSaveToFilesystem(item2);

  // delete uids from both items
  deleteUidsInItem(item1);
  deleteUidsInItem(item2);

  return isEqual(item1, item2);
};

export const getDefaultRequestPaneTab = (item) => {
  if (item.type === 'http-request') {
    return 'params';
  }

  if (item.type === 'graphql-request') {
    return 'query';
  }
};

export const getEnvironmentVariables = (collection) => {
  let variables = {};
  if (collection) {
    const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
    if (environment) {
      each(environment.variables, (variable) => {
        if (variable.name && variable.value && variable.enabled) {
          variables[variable.name] = variable.value;
        }
      });
    }
  }

  return variables;
};

export const getTotalRequestCountInCollection = (collection) => {
  let count = 0;
  each(collection.items, (item) => {
    if (isItemARequest(item)) {
      count++;
    } else if (isItemAFolder(item)) {
      count += getTotalRequestCountInCollection(item);
    }
  });

  return count;
};

export const getAllVariables = (collection) => {
  const environmentVariables = getEnvironmentVariables(collection);

  return {
    ...environmentVariables,
    ...collection.collectionVariables,
    process: {
      env: {
        ...collection.processEnvVariables
      }
    }
  };
};

export const maskInputValue = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .split('')
    .map(() => '*')
    .join('');
};
