import path from 'path';
import fs from 'fs';
import { Page } from '../../../playwright';
import { initBruCollection, writeBruFolder, writeBruRequest } from '../../utils/fixtures/bru-collection';
import { buildSidebarLocators } from '../../utils/page/sidebar';
import { version } from '../../../packages/bruno-app/package.json';

export const CACHE_MODES = [
  { label: 'file cache off', enabled: false },
  { label: 'file cache on', enabled: true }
];

/**
 * Each pressure collection holds 7000 generated requests. With the file cache off, the v1 mount
 * dispatches one redux action per file, and in dev builds Redux Toolkit's serializable-state check
 * walks the whole store on each dispatch, so 7000 files freeze the renderer for minutes.
 */
export const PRESSURE_CACHE_MODES = [
  { ...CACHE_MODES[0], requestCount: 1500 },
  { ...CACHE_MODES[1], requestCount: 7000 }
];

export const writePreferences = (
  userDataPath: string,
  collections: string[],
  fileCacheEnabled: boolean,
  searchIndexEnabled = true
) => {
  fs.mkdirSync(userDataPath, { recursive: true });
  fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify({
    lastOpenedCollections: collections,
    preferences: {
      onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
      cache: { file: { enabled: fileCacheEnabled }, searchIndex: { enabled: searchIndexEnabled } }
    }
  }));
};

const REQUESTS_PER_FOLDER = 25;

const buildPressureCollection = (dir: string, name: string, needle: { name: string; url: string }, requestCount: number) => {
  initBruCollection(dir, name);
  for (let f = 0; f * REQUESTS_PER_FOLDER < requestCount; f += 1) {
    const folderDir = writeBruFolder(dir, `folder-${f}`, f + 1);
    const count = Math.min(REQUESTS_PER_FOLDER, requestCount - f * REQUESTS_PER_FOLDER);
    for (let r = 0; r < count; r += 1) {
      const seq = f * REQUESTS_PER_FOLDER + r + 1;
      writeBruRequest(folderDir, `request-${seq}`, { seq, url: `https://example.com/api/v1/resource/${seq}` });
    }
  }
  writeBruRequest(dir, needle.name, { seq: 1, url: needle.url });
  return dir;
};

/** Builds PressureA and PressureB under `root`, each with one uniquely named needle request. */
export const buildPressureCollections = (root: string, requestCount: number) => [
  buildPressureCollection(path.join(root, 'PressureA'), 'PressureA', {
    name: 'needle-alpha-unique',
    url: 'https://needle-alpha.unique.example/resource'
  }, requestCount),
  buildPressureCollection(path.join(root, 'PressureB'), 'PressureB', {
    name: 'needle-bravo-unique',
    url: 'https://needle-bravo.unique.example/resource'
  }, requestCount)
];

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
