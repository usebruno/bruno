import path from 'path';
import fs from 'fs';
import { expect } from '../../playwright';

export const getSnapshotPath = (userDataPath: string) =>
  path.join(userDataPath, 'ui-state-snapshot.json');

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
