import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import {
  clearSearchIndex,
  openPreferences,
  selectPreferencesTab
} from '../../../../pages';
import {
  waitForReadyPage
} from '../../../../utils';
import { buildSidebarLocators } from '../../../../pages/sidebar/collection-tree';
import { initBruCollection, writeBruRequest } from '../../../../utils/data/bru-collection';
import { writePreferences } from '../helpers';

test.describe('Preferences > Cache > Search cache', () => {
  test('shows the cache size and resets it to 0B when cleared', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const root = await createTmpDir('search-index-size');
    const collection = path.join(root, 'SizeCollection');
    initBruCollection(collection, 'SizeCollection');
    writeBruRequest(collection, 'size-probe', { seq: 1, url: 'https://size.example/probe' });

    const userDataPath = await createTmpDir('search-index-size-userdata');
    writePreferences(userDataPath, [collection], false);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const sidebar = buildSidebarLocators(page);

    try {
      await clearSearchIndex(page);

      await test.step('populate the search index through a sidebar search', async () => {
        await sidebar.searchToggle().click();
        await sidebar.searchInput().fill('size-probe');
        await expect(sidebar.searchMatchCount()).toHaveText('1 match', { timeout: 30_000 });
      });

      const searchCache = page.getByTestId('cache-item-search-index');
      const size = searchCache.getByTestId('search-index-size');

      await test.step('show the cache size in Preferences > Cache', async () => {
        await openPreferences(page);
        await selectPreferencesTab(page, 'Cache');
        await expect(size).toBeVisible();
        await expect(size).not.toHaveText('—');
        await expect(size).not.toHaveText('0B');
        await expect(size).toHaveText(/^\d+(\.\d+)?(B|KB|MB)$/);
      });

      await test.step('clear the search cache', async () => {
        await searchCache.getByRole('button', { name: 'Clear search cache' }).click();
        await expect(page.getByText('Search cache cleared')).toBeVisible();
        await expect(size).toHaveText('0B');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('reads the size again on reopening the panel', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const root = await createTmpDir('search-index-size-reopen');
    const collection = path.join(root, 'ReopenCollection');
    initBruCollection(collection, 'ReopenCollection');
    writeBruRequest(collection, 'reopen-probe', { seq: 1, url: 'https://reopen.example/probe' });

    const userDataPath = await createTmpDir('search-index-size-reopen-userdata');
    writePreferences(userDataPath, [collection], false);

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const sidebar = buildSidebarLocators(page);

    try {
      await clearSearchIndex(page);

      const searchCache = page.getByTestId('cache-item-search-index');
      const size = searchCache.getByTestId('search-index-size');

      await test.step('open Preferences > Cache with an empty index', async () => {
        await openPreferences(page);
        await selectPreferencesTab(page, 'Cache');
        await expect(size).toHaveText('0B');
      });

      await test.step('populate the index and reopen the panel', async () => {
        await sidebar.searchToggle().click();
        await sidebar.searchInput().fill('reopen-probe');
        await expect(sidebar.searchMatchCount()).toHaveText('1 match', { timeout: 30_000 });
        await selectPreferencesTab(page, 'General');
        await selectPreferencesTab(page, 'Cache');
        await expect(size).not.toHaveText('0B');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
