import template from 'lodash/template';
import get from 'lodash/get';
import each from 'lodash/each';
import find from 'lodash/find';
import isString from 'lodash/isString';
import map from 'lodash/map';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import { uuid } from 'utils/common';

const replaceTabsWithSpaces = (str, numSpaces = 2) => {
  if(!str || !str.length || !isString(str)) {
    return '';
  }

  return str.replaceAll('\t', ' '.repeat(numSpaces));
};

export const addDepth = (items = []) => {
  const depth = (itms, initialDepth) => {
    each(itms, (i) => {
      i.depth = initialDepth;

      if(i.items && i.items.length) {
        depth(i.items, initialDepth + 1);
      }
    })
  }

  depth(items, 1);
};

export const collapseCollection = (collection) => {
  collection.collapsed = true;

  const collapseItem = (items) => {
    each(items, (i) => {
      i.collapsed = true;

      if(i.items && i.items.length) {
        collapseItem(i.items);
      }
    })
  }

  collapseItem(collection.items, 1);
};

export const sortItems = (collection) => {
  const sort = (obj) => {
    if(obj.items && obj.items.length) {
      obj.items = sortBy(obj.items, 'type');
    }

    each(obj.items, (i) => sort(i));
  }

  sort(collection);
};

export const flattenItems = (items = []) => {
  const flattenedItems = [];

  const flatten = (itms, flattened) => {
    each(itms, (i) => {
      flattened.push(i);

      if(i.items && i.items.length) {
        flatten(i.items, flattened);
      }
    })
  }

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

export const findItemByPathname = (items = [], pathname) => {
  return find(items, (i) => i.pathname === pathname);
};

export const findItemInCollectionByPathname = (collection, pathname) => {
  let flattenedItems = flattenItems(collection.items);

  return findItemByPathname(flattenedItems, pathname);
}

export const findItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return findItem(flattenedItems, itemUid);
}

export const findParentItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, i => i.uid === itemUid);
  });
}

export const recursivelyGetAllItemUids = (items = []) => {
  let flattenedItems = flattenItems(items);

  return map(flattenedItems, (i) => i.uid);
};

export const findEnvironmentInCollection = (collection, envUid) => {
  return find(collection.environments, (e) => e.uid === envUid);
}

export const transformCollectionToSaveToIdb = (collection, options = {}) => {
  const copyHeaders = (headers) => {
    return map(headers, (header) => {
      return {
        uid: header.uid,
        name: header.name,
        value: header.value,
        description: header.description,
        enabled: header.enabled
      }
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
      }
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
      }
    });
  };

  const copyMultipartFormParams = (params = []) => {
    return map(params, (param) => {
      return {
        uid: param.uid,
        name: param.name,
        value: param.value,
        description: param.description,
        enabled: param.enabled
      }
    });
  };

  const copyItems = (sourceItems, destItems) => {
    each(sourceItems, (si) => {
      const di = {
        uid: si.uid,
        type: si.type
      };

      di.name = si.name;

      // if items is draft, then take data from draft to save
      // The condition "!options.ignoreDraft" may appear confusing
      // When saving a collection, this option allows the caller to specify to ignore any draft changes while still saving rest of the collection.
      // This is useful for performing rename request/collections while still leaving changes in draft not making its way into the indexeddb
      if(si.draft && !options.ignoreDraft) {
        if(si.draft.request) {
          di.request = {
            url: si.draft.request.url,
            method: si.draft.request.method,
            headers: copyHeaders(si.draft.request.headers),
            params: copyQueryParams(si.draft.request.params),
            body: {
              mode: si.draft.request.body.mode,
              json: si.draft.request.body.json,
              text: si.draft.request.body.text,
              xml: si.draft.request.body.xml,
              multipartForm: si.draft.request.body.multipartForm,
              formUrlEncoded: copyFormUrlEncodedParams(si.draft.request.body.formUrlEncoded),
              multipartForm: copyMultipartFormParams(si.draft.request.body.multipartForm)
            }
          };
        }
      } else {
        if(si.request) {
          di.request = {
            url: si.request.url,
            method: si.request.method,
            headers: copyHeaders(si.request.headers),
            params: copyQueryParams(si.request.params),
            body:  {
              mode: si.request.body.mode,
              json: si.request.body.json,
              text: si.request.body.text,
              xml: si.request.body.xml,
              formUrlEncoded: copyFormUrlEncodedParams(si.request.body.formUrlEncoded),
              multipartForm: copyMultipartFormParams(si.request.body.multipartForm)
            }
          }
        };
      }

      if(di.request && di.request.body.mode === 'json') {
        di.request.body.json = replaceTabsWithSpaces(di.request.body.json);
      }

      destItems.push(di);

      if(si.items && si.items.length) {
        di.items = [];
        copyItems(si.items, di.items);
      }
    });
  }

  const collectionToSave = {};
  collectionToSave.name = collection.name;
  collectionToSave.uid = collection.uid;
  collectionToSave.items = [];
  collectionToSave.activeEnvironmentUid = collection.activeEnvironmentUid;
  collectionToSave.environments = collection.environments || [];

  copyItems(collection.items, collectionToSave.items);

  return collectionToSave;
};

export const transformRequestToSaveToFilesystem = (item) => {
  const _item = item.draft ? item.draft : item;
  const itemToSave = {
    uid: _item.uid,
    type: _item.type,
    name: _item.name,
    request: {
      method: _item.request.method,
      url: _item.request.url,
      params: [],
      headers: [],
      body: _item.request.body
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
      enabled: header.enabled,
    });
  });

  if(itemToSave.request.body.mode === 'json') {
    itemToSave.request.body.json = replaceTabsWithSpaces(itemToSave.request.body.json);
  }

  return itemToSave;
};

// todo: optimize this
export const deleteItemInCollection = (itemUid, collection) => {
  collection.items = filter(collection.items, (i) => i.uid !== itemUid);

  let flattenedItems = flattenItems(collection.items);

  each(flattenedItems, (i) => {
    if(i.items && i.items.length) {
      i.items = filter(i.items, (i) => i.uid !== itemUid);
    }
  });
};

export const isItemARequest = (item) => {
  return item.hasOwnProperty('request')
            && ['http-request', 'graphql-request'].includes(item.type)
            && !item.items;
};

export const isItemAFolder = (item) => {
  return !item.hasOwnProperty('request') && item.type === 'folder';
};

export const humanizeRequestBodyMode = (mode) => {
  let label = 'No Body';
  switch(mode) {
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
    case 'formUrlEncoded': {
      label = 'Form Url Encoded';
      break;
    }
    case 'multipartForm': {
      label = 'Multipart Form';
      break;
    }
  }

  return label;
};

export const refreshUidsInItem = (item) => {
  item.uid = uuid();

  each(get(item, 'request.headers'), (header) => header.uid = uuid());
  each(get(item, 'request.params'), (param) => param.uid = uuid());
  each(get(item, 'request.body.multipartForm'), (param) => param.uid = uuid());
  each(get(item, 'request.body.formUrlEncoded'), (param) => param.uid = uuid());

  return item;
}

export const isLocalCollection = (collection) => {
  return collection.pathname ? true : false;
};

export const interpolateEnvironmentVars = (item, variables) => {
  const envVars = {};
  const { request } = item;
  each(variables, (variable) => {
    envVars[variable.name] = variable.value;
  });

  const templateOpts = {
    interpolate: /{{([\s\S]+?)}}/g, //interpolate content using markers `{{}}`
    evaluate: null, // prevent any js evaluation
    escape: null, // disable any escaping
  };

  const interpolate = (str) => template(str, templateOpts)(envVars);

  request.url = interpolate(request.url);

  each(request.headers, (header) => {
    header.value = interpolate(header.value);
  });
  each(request.params, (param) => {
    param.value = interpolate(param.value);
  });

  // Todo: Make interpolation work with body mode json
  switch(request.body.mode) {
    case 'text': {
      request.body.text = interpolate(request.body.text);
      break;
    }
    case 'xml': {
      request.body.text = interpolate(request.body.text);
      break;
    }
    case 'multipartForm': {
      each(request.body.multipartForm, (param) => {
        param.value = interpolate(param.value);
      });
      break;
    }
    case 'formUrlEncoded': {
      each(request.body.formUrlEncoded, (param) => {
        param.value = interpolate(param.value);
      });
      break;
    }
  }

  return request;
};