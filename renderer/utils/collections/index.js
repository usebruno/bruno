import each from 'lodash/each';
import find from 'lodash/find';
import isString from 'lodash/isString';
import map from 'lodash/map';
import filter from 'lodash/filter';
import sortBy from 'lodash/sortBy';
import cloneDeep from 'lodash/cloneDeep';

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

  const copyItems = (sourceItems, destItems) => {
    each(sourceItems, (si) => {
      const di = {
        uid: si.uid,
        type: si.type
      };

      di.name = si.name;

      // if items is draft, then take data from draft to save
      if(!options.ignoreDraft && si.draft) {
        if(si.draft.request) {
          di.request = {
            url: si.draft.request.url,
            method: si.draft.request.method,
            headers: copyHeaders(si.draft.request.headers),
            params: copyQueryParams(si.draft.request.params),
            body: {
              mode: si.draft.request.body.mode,
              content: replaceTabsWithSpaces(si.draft.request.body.content)
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
              content: replaceTabsWithSpaces(si.request.body.content)
            }
          }
        };
      }

      if(di.request && di.request.body.mode === 'json') {
        di.request.body.content = replaceTabsWithSpaces(di.request.body.content);
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
  collectionToSave.userId = collection.userId;
  collectionToSave.orgId = collection.orgId;
  collectionToSave.environments = cloneDeep(collection.environments);
  collectionToSave.items = [];

  copyItems(collection.items, collectionToSave.items);

  return collectionToSave;
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
