import each from 'lodash/each';
import find from 'lodash/find';
import filter from 'lodash/filter';
import cloneDeep from 'lodash/cloneDeep';

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

export const cloneItem = (item) => {
  return cloneDeep(item);
};

export const transformCollectionToSaveToIdb = (collection, options = {}) => {
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
            headers: si.draft.request.headers,
            body: si.draft.request.body
          };
        }
      } else {
        if(si.request) {
          di.request = {
            url: si.request.url,
            method: si.request.method,
            headers: si.request.headers,
            body: si.request.body
          }
        };
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
