import find from 'lodash/find';

export const findCollectionInWorkspace = (workspace, collectionUid) => {
  return find(workspace.collections, (c) => c.uid === collectionUid);
};
