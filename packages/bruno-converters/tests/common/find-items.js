// Helpers to locate a request or folder by name in a converted collection.
// Both search recursively, since imported items are often grouped into folders.

export const findRequestByName = (items, name) => {
  for (const item of items) {
    if (item.type === 'http-request' && item.name === name) {
      return item;
    }
    if (item.type === 'folder' && item.items) {
      const found = findRequestByName(item.items, name);
      if (found) return found;
    }
  }
  return undefined;
};

export const findFolderByName = (items, name) => {
  for (const item of items) {
    if (item.type === 'folder' && item.name === name) {
      return item;
    }
    if (item.type === 'folder' && item.items) {
      const found = findFolderByName(item.items, name);
      if (found) return found;
    }
  }
  return undefined;
};
