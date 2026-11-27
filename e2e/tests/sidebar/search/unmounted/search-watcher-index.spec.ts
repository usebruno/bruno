import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import {
  clearSearchIndex,
  getSearchIndexSize,
  waitForCollectionMount
} from '../../../../pages';
import {
  waitForReadyPage
} from '../../../../utils';
import { buildSidebarLocators } from '../../../../pages/sidebar/collection-tree';
import { initBruCollection, writeBruRequest } from '../../../../utils/data/bru-collection';
import { startMountingCollections, writePreferences } from '../helpers';

test('indexes a request the watcher picks up after mount', async ({ launchElectronApp, createTmpDir }) => {
  test.setTimeout(120_000);
  const root = await createTmpDir('search-watcher-index');
  const collection = path.join(root, 'WatchedCollection');
  initBruCollection(collection, 'WatchedCollection');
  writeBruRequest(collection, 'seed-request', { seq: 1, url: 'https://seed.example/one' });

  const userDataPath = await createTmpDir('search-watcher-index-userdata');
  writePreferences(userDataPath, [collection], true);

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  await clearSearchIndex(page);
  const sidebar = buildSidebarLocators(page);

  try {
    await test.step('mount the collection so the watcher is running', async () => {
      await startMountingCollections(page, [{ name: 'WatchedCollection', pathname: collection }], true);
      await waitForCollectionMount(page, 'WatchedCollection');
      await sidebar.collectionRow('WatchedCollection').click();
      await expect(sidebar.itemByName('seed-request')).toBeVisible();
      await expect.poll(() => getSearchIndexSize(page), { timeout: 30_000 }).toBeGreaterThan(0);
    });

    const sizeAfterMount = await getSearchIndexSize(page);

    await test.step('a new file appears in the sidebar and grows the search index', async () => {
      writeBruRequest(collection, 'watcher-index-hit', { seq: 2, url: 'https://watcher.unique.example/charge' });
      await expect(sidebar.itemByName('watcher-index-hit')).toBeVisible({ timeout: 30_000 });
      await expect.poll(() => getSearchIndexSize(page), { timeout: 30_000 }).toBeGreaterThan(sizeAfterMount);
    });

    await test.step('sidebar search finds the watched file by URL', async () => {
      await sidebar.searchToggle().click();
      await sidebar.searchInput().fill('watcher.unique');
      await expect(sidebar.itemByName('watcher-index-hit')).toBeVisible({ timeout: 30_000 });
      await expect(sidebar.searchMatchCount()).toHaveText('1 match');
    });
  } finally {
    await closeElectronApp(app);
  }
});
