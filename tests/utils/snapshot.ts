import path from 'path';
import fs from 'fs';
import { expect } from '../../playwright';

export const getSnapshotPath = (userDataPath: string) =>
  path.join(userDataPath, 'ui-state-snapshot.json');

/**
 * Write a snapshot file seeded with the given collection entries (and, optionally,
 * workspace entries). Useful for asserting on snapshot normalization/dedup behavior
 * that runs on app launch.
 */
export const seedSnapshotWithCollections = (
  userDataPath: string,
  collections: any[],
  options: { workspaces?: any[] } = {}
) => {
  fs.writeFileSync(
    getSnapshotPath(userDataPath),
    JSON.stringify(
      {
        version: '0.0.1',
        activeWorkspacePath: null,
        extras: {
          devTools: {
            open: false
          }
        },
        workspaces: options.workspaces ?? [],
        collections
      },
      null,
      2
    )
  );
};

/**
 * Read the snapshot JSON from the user data directory.
 * electron-store saves it as `ui-state-snapshot.json`.
 */
export const readSnapshot = (userDataPath: string) => {
  const snapshotPath = getSnapshotPath(userDataPath);
  if (!fs.existsSync(snapshotPath)) return null;
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
};

export const waitForSnapshotFile = async (userDataPath: string) => {
  await expect.poll(() => fs.existsSync(getSnapshotPath(userDataPath))).toBe(true);
};

export const findSnapshotFolderTab = (snapshot: any, folderName: string) => {
  if (!snapshot || !Array.isArray(snapshot.collections)) return null;
  for (const collection of snapshot.collections) {
    if (!Array.isArray(collection?.tabs)) continue;
    const tab = collection.tabs.find(
      (t: any) => t?.type === 'folder-settings' && typeof t?.pathname === 'string' && t.pathname.includes(folderName)
    );
    if (tab) return tab;
  }
  return null;
};

export const findSnapshotCollectionTab = (snapshot: any, collectionPath: string) => {
  if (!snapshot || !Array.isArray(snapshot.collections)) return null;
  for (const collection of snapshot.collections) {
    if (collectionPath && collection?.pathname && !collection.pathname.includes(collectionPath)) continue;
    if (!Array.isArray(collection?.tabs)) continue;
    const tab = collection.tabs.find((t: any) => t?.type === 'collection-settings');
    if (tab) return tab;
  }
  return null;
};

export const findSnapshotCollectionEntry = (snapshot: any, collectionPath: string, workspacePathname?: string) => {
  if (!snapshot || !Array.isArray(snapshot.collections)) {
    return null;
  }

  const normalizedTarget = path.normalize(collectionPath);
  return snapshot.collections.find(
    (collection: any) => typeof collection?.pathname === 'string'
      && path.normalize(collection.pathname) === normalizedTarget
      && (workspacePathname === undefined || (collection?.workspacePathname ?? '') === workspacePathname)
  ) || null;
};

export const waitForSnapshotCollectionEnvironment = async (
  userDataPath: string,
  collectionPath: string,
  selectedEnvironment: string,
  options: { timeout?: number } = {}
) => {
  const { timeout = 15000 } = options;

  await expect.poll(() => {
    const snapshot = readSnapshot(userDataPath);
    const entry = findSnapshotCollectionEntry(snapshot, collectionPath);
    return entry ? (entry.selectedEnvironment ?? '') : null;
  }, { timeout }).toBe(selectedEnvironment);
};
