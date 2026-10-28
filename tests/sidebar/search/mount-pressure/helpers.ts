import path from 'path';
import fs from 'fs';
import { Page } from '../../../../playwright';
import { initBruCollection, writeBruFolder, writeBruRequest } from '../../../utils/fixtures/bru-collection';
import { buildSidebarLocators } from '../../../utils/page/sidebar';
import { version } from '../../../../packages/bruno-app/package.json';

/** Default sidebar search stress: each pressure collection holds this many generated requests. */
export const PRESSURE_REQUEST_COUNT = 7000;

/**
 * The v1 mount dispatches one redux action per file, and in dev builds Redux Toolkit's serializable-state
 * check walks the whole store on each dispatch, so 7000 files freeze the renderer for minutes.
 */
export const V1_PRESSURE_REQUEST_COUNT = 1500;

export const writePreferences = (userDataPath: string, collections: string[], fileCacheEnabled: boolean) => {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify({
    lastOpenedCollections: collections,
    preferences: {
      onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
      cache: { file: { enabled: fileCacheEnabled }, searchIndex: { enabled: true } }
    }
  }));
};

const writeBulkBruRequests = (dir: string, name: string, requestCount: number, requestsPerFolder: number) => {
  initBruCollection(dir, name);
  const folderCount = Math.ceil(requestCount / requestsPerFolder);
  for (let f = 0; f < folderCount; f += 1) {
    const folderDir = writeBruFolder(dir, `folder-${f}`, f + 1);
    const count = Math.min(requestsPerFolder, requestCount - f * requestsPerFolder);
    for (let r = 0; r < count; r += 1) {
      const seq = f * requestsPerFolder + r + 1;
      writeBruRequest(folderDir, `request-${seq}`, {
        seq,
        url: `https://example.com/api/v1/resource/${seq}`
      });
    }
  }
};

export const buildPressureCollection = (
  dir: string,
  name: string,
  needle: { name: string; url: string; seq?: number },
  requestCount = PRESSURE_REQUEST_COUNT
) => {
  writeBulkBruRequests(dir, name, requestCount, 25);
  writeBruRequest(dir, needle.name, { seq: needle.seq ?? 1, url: needle.url });
  return dir;
};

export const startMountingCollections = async (
  page: Page,
  collections: { name: string; pathname: string }[],
  fileCacheEnabled: boolean
) => {
  const channel = fileCacheEnabled ? 'renderer:mount-collection-v2' : 'renderer:mount-collection';
  const mounts = [];
  for (const collection of collections) {
    const uid = await buildSidebarLocators(page)
      .collectionRow(collection.name)
      .evaluate((el) => el.closest('[data-collection-uid]')?.getAttribute('data-collection-uid'));
    if (!uid) throw new Error(`Missing collection uid for ${collection.name}`);
    mounts.push({
      collectionUid: uid,
      collectionPathname: collection.pathname,
      brunoConfig: { name: collection.name, type: 'collection', ignore: ['node_modules', '.git'] }
    });
  }
  await page.evaluate(async ({ channel: mountChannel, mounts: payload }) => {
    payload.forEach((mount) => window.ipcRenderer.invoke(mountChannel, mount));
  }, { channel, mounts });
};
