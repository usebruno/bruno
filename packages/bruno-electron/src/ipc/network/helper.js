const { each, filter } = require('lodash');

const sortCollection = (collection) => {
  const items = collection.items || [];
  let folderItems = filter(items, (item) => item.type === 'folder');
  let requestItems = filter(items, (item) => item.type !== 'folder');

  folderItems = folderItems.sort((a, b) => a.name.localeCompare(b.name));
  requestItems = requestItems.sort((a, b) => a.seq - b.seq);

  collection.items = folderItems.concat(requestItems);

  each(folderItems, (item) => {
    sortCollection(item);
  });
};

const sortFolder = (folder = {}) => {
  const items = folder.items || [];
  let folderItems = filter(items, (item) => item.type === 'folder');
  let requestItems = filter(items, (item) => item.type !== 'folder');

  folderItems = folderItems.sort((a, b) => a.name.localeCompare(b.name));
  requestItems = requestItems.sort((a, b) => a.seq - b.seq);

  folder.items = folderItems.concat(requestItems);

  each(folderItems, (item) => {
    sortFolder(item);
  });

  return folder;
};

const findItemInCollection = (collection, itemId) => {
  let foundItem = null;

  if (collection.uid === itemId) {
    return collection;
  }

  if (collection.items && collection.items.length) {
    collection.items.forEach((item) => {
      if (item.uid === itemId) {
        foundItem = item;
      } else if (item.type === 'folder') {
        foundItem = findItemInCollection(item, itemId);
      }
    });
  }

  return foundItem;
};

const getAllRequestsInFolderRecursively = (folder = {}) => {
  let requests = [];

  if (folder.items && folder.items.length) {
    folder.items.forEach((item) => {
      if (item.type !== 'folder') {
        requests.push(item);
      } else {
        requests = requests.concat(getAllRequestsInFolderRecursively(item));
      }
    });
  }

  return requests;
};

module.exports = {
  sortCollection,
  sortFolder,
  findItemInCollection,
  getAllRequestsInFolderRecursively
};
