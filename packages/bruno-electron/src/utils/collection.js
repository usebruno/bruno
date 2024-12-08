const each = require('lodash/each');
const find = require('lodash/find');
const fs = require('fs');
const { getRequestUid } = require('../cache/requestUids');
const { get } = require('lodash');
const { uuid } = require('./common');

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

const getBruFileMeta = (data) => {
  try {
    const metaRegex = /meta\s*{\s*([\s\S]*?)\s*}/;
    const match = data.match(metaRegex);
    if (match) {
      const metaContent = match[1].trim();
      const lines = metaContent.replace(/\r\n/g, '\n').split('\n');
      const metaJson = {};
      lines.forEach(line => {
        const [key, value] = line.split(':').map(str => str.trim());
        if (key && value) {
          metaJson[key] = isNaN(value) ? value : Number(value);
        }
      });
      return { meta: metaJson };
    } else {
      console.log('No "meta" block found in the file.');
    }
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

const hydrateRequestWithUuid = (request, pathname) => {
  request.uid = getRequestUid(pathname);

  const params = get(request, 'request.params', []);
  const headers = get(request, 'request.headers', []);
  const requestVars = get(request, 'request.vars.req', []);
  const responseVars = get(request, 'request.vars.res', []);
  const assertions = get(request, 'request.assertions', []);
  const bodyFormUrlEncoded = get(request, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = get(request, 'request.body.multipartForm', []);

  params.forEach((param) => (param.uid = uuid()));
  headers.forEach((header) => (header.uid = uuid()));
  requestVars.forEach((variable) => (variable.uid = uuid()));
  responseVars.forEach((variable) => (variable.uid = uuid()));
  assertions.forEach((assertion) => (assertion.uid = uuid()));
  bodyFormUrlEncoded.forEach((param) => (param.uid = uuid()));
  bodyMultipartForm.forEach((param) => (param.uid = uuid()));

  return request;
};

module.exports = {
  flattenItems,
  findItem,
  findItemInCollection,
  findParentItemInCollection,
  getTreePathFromCollectionToItem,
  getBruFileMeta,
  hydrateRequestWithUuid
};
