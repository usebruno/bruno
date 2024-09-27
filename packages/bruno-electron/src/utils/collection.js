const each = require('lodash/each');
const find = require('lodash/find');

const flattenItems = (items = []) => {
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

const findItem = (items = [], itemUid) => {
  return find(items, (i) => i.uid === itemUid);
};

const findItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return findItem(flattenedItems, itemUid);
};

const findParentItemInCollection = (collection, itemUid) => {
  let flattenedItems = flattenItems(collection.items);

  return find(flattenedItems, (item) => {
    return item.items && find(item.items, (i) => i.uid === itemUid);
  });
};

const getTreePathFromCollectionToItem = (collection, _item) => {
  let path = [];
  let item = findItemInCollection(collection, _item.uid);
  while (item) {
    path.unshift(item);
    item = findParentItemInCollection(collection, item.uid);
  }

  return path;
};

module.exports = {
  flattenItems,
  findItem,
  findItemInCollection,
  findParentItemInCollection,
  getTreePathFromCollectionToItem
};
