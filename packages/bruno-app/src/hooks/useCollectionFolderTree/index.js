import { useState, useMemo, useCallback } from 'react';
import { isItemAFolder } from 'utils/collections';
import { sortByNameThenSequence } from 'utils/common/index';
import filter from 'lodash/filter';
import { useSelector } from 'react-redux';
import { findCollectionByUid } from 'utils/collections';

const buildTree = (items) => {
  const tree = {};

  if (!items || items.length === 0) {
    return tree;
  }

  const folders = filter(items, (i) => isItemAFolder(i) && !i.isTransient);
  const sortedFolders = sortByNameThenSequence(folders);

  for (const folder of sortedFolders) {
    tree[folder.name] = {
      uid: folder.uid,
      name: folder.name,
      item: folder,
      children: folder.items && folder.items.length > 0 ? buildTree(folder.items) : {}
    };
  }

  return tree;
};

const findFolderByUidInTree = (tree, uid) => {
  for (const folderName in tree) {
    const folder = tree[folderName];
    if (folder.uid === uid) {
      return folder;
    }
    if (folder.children && Object.keys(folder.children).length > 0) {
      const found = findFolderByUidInTree(folder.children, uid);
      if (found) return found;
    }
  }
  return null;
};

const getFoldersAtPath = (tree, path) => {
  if (path.length === 0) {
    return Object.values(tree).map((folder) => folder.item);
  }

  let currentTree = tree;
  for (const folderUid of path) {
    const folder = findFolderByUidInTree(currentTree, folderUid);
    if (folder && folder.children) {
      currentTree = folder.children;
    } else {
      return [];
    }
  }

  return Object.values(currentTree).map((folder) => folder.item);
};

const useCollectionFolderTree = (collectionUid) => {
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const [currentFolderPath, setCurrentFolderPath] = useState([]);
  const [selectedFolderUid, setSelectedFolderUid] = useState(null);
  const tree = useMemo(() => {
    if (!collection || !collection.items) {
      return {};
    }
    return buildTree(collection.items);
  }, [collection]);

  const currentFolders = useMemo(() => {
    return getFoldersAtPath(tree, currentFolderPath);
  }, [tree, currentFolderPath]);

  const breadcrumbs = useMemo(() => {
    if (currentFolderPath.length === 0) {
      return [];
    }

    const breadcrumbParts = [];
    let currentTree = tree;

    for (const folderUid of currentFolderPath) {
      const folder = findFolderByUidInTree(currentTree, folderUid);
      if (folder) {
        breadcrumbParts.push({
          uid: folder.uid,
          name: folder.name
        });
        currentTree = folder.children;
      }
    }

    return breadcrumbParts;
  }, [tree, currentFolderPath]);

  const navigateIntoFolder = useCallback((folderUid) => {
    setCurrentFolderPath((prev) => [...prev, folderUid]);
    setSelectedFolderUid(folderUid);
  }, []);

  const goBack = useCallback(() => {
    setCurrentFolderPath((prev) => {
      if (prev.length > 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setSelectedFolderUid(null);
  }, []);

  const navigateToRoot = useCallback(() => {
    setCurrentFolderPath([]);
    setSelectedFolderUid(null);
  }, []);

  const navigateToBreadcrumb = useCallback((index) => {
    setCurrentFolderPath((prev) => prev.slice(0, index + 1));
    setSelectedFolderUid(null);
  }, []);

  const getCurrentParentFolder = useCallback(() => {
    if (currentFolderPath.length === 0) {
      return null;
    }
    const lastFolderUid = currentFolderPath[currentFolderPath.length - 1];
    const folder = findFolderByUidInTree(tree, lastFolderUid);
    return folder ? folder.item : null;
  }, [tree, currentFolderPath]);

  const getCurrentSelectedFolder = useCallback(() => {
    if (selectedFolderUid) {
      const folder = findFolderByUidInTree(tree, selectedFolderUid);
      return folder ? folder.item : null;
    }
    return null;
  }, [tree, selectedFolderUid]);

  const reset = useCallback(() => {
    setCurrentFolderPath([]);
    setSelectedFolderUid(null);
  }, []);

  return {
    currentFolders,
    breadcrumbs,
    selectedFolderUid,
    setSelectedFolderUid,
    navigateIntoFolder,
    goBack,
    navigateToRoot,
    navigateToBreadcrumb,
    getCurrentParentFolder,
    getCurrentSelectedFolder,
    reset,
    isAtRoot: currentFolderPath.length === 0
  };
};

export default useCollectionFolderTree;
