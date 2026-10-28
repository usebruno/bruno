import { test, expect, closeElectronApp } from '../../../../playwright';
import path from 'path';
import fs from 'fs';
import { clearSearchIndex, openPreferences, selectPreferencesTab, waitForReadyPage } from '../../../utils/page';
import { initBruCollection, writeBruRequest } from '../../../utils/fixtures/bru-collection';
import { version } from '../../../../packages/bruno-app/package.json';

test.describe('Preferences > Cache > Search index', () => {
  test('shows the index size and resets it to 0B when cleared', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const root = await createTmpDir('search-index-size');
    const collection = path.join(root, 'SizeCollection');
    initBruCollection(collection, 'SizeCollection');
    writeBruRequest(collection, 'size-probe', { seq: 1, url: 'https://size.example/probe' });

    const userDataPath = await createTmpDir('search-index-size-userdata');
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify({
      lastOpenedCollections: [collection],
      preferences: {
        onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
        cache: { file: { enabled: false }, searchIndex: { enabled: true } }
      }
    }));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    try {
      await clearSearchIndex(page);

      await test.step('populate the search index through a sidebar search', async () => {
        await page.getByTitle('Search requests').click();
        await page.getByTestId('sidebar-search-input').fill('size-probe');
        await expect(page.getByTestId('sidebar-search-match-count')).toHaveText('1 match', { timeout: 30_000 });
      });

      const searchIndex = page.getByTestId('cache-item-search-index');
      const size = searchIndex.getByTestId('search-index-size');

      await test.step('show the index size in Preferences > Cache', async () => {
        await openPreferences(page);
        await selectPreferencesTab(page, 'Cache');
        await expect(size).toBeVisible();
        await expect(size).not.toHaveText('—');
        await expect(size).not.toHaveText('0B');
        await expect(size).toHaveText(/^\d+(\.\d+)?(B|KB|MB)$/);
      });

      await test.step('clear the search index', async () => {
        await searchIndex.getByRole('button', { name: 'Clear search index' }).click();
        await expect(page.getByText('Search index cleared')).toBeVisible();
        await expect(size).toHaveText('0B');
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('reads the size again on reopening the panel and clears with the search index turned off', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(120_000);
    const root = await createTmpDir('search-index-size-toggle');
    const collection = path.join(root, 'ToggleCollection');
    initBruCollection(collection, 'ToggleCollection');
    writeBruRequest(collection, 'toggle-probe', { seq: 1, url: 'https://toggle.example/probe' });

    const userDataPath = await createTmpDir('search-index-size-toggle-userdata');
    fs.mkdirSync(userDataPath, { recursive: true });
    fs.writeFileSync(path.join(userDataPath, 'preferences.json'), JSON.stringify({
      lastOpenedCollections: [collection],
      preferences: {
        onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true, lastSeenVersion: version },
        cache: { file: { enabled: false }, searchIndex: { enabled: true } }
      }
    }));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    try {
      await clearSearchIndex(page);

      const searchIndex = page.getByTestId('cache-item-search-index');
      const size = searchIndex.getByTestId('search-index-size');

      await test.step('open Preferences > Cache with an empty index', async () => {
        await openPreferences(page);
        await selectPreferencesTab(page, 'Cache');
        await expect(size).toHaveText('0B');
      });

      await test.step('populate the index and reopen the panel', async () => {
        await page.getByTitle('Search requests').click();
        await page.getByTestId('sidebar-search-input').fill('toggle-probe');
        await expect(page.getByTestId('sidebar-search-match-count')).toHaveText('1 match', { timeout: 30_000 });
        await selectPreferencesTab(page, 'General');
        await selectPreferencesTab(page, 'Cache');
        await expect(size).not.toHaveText('0B');
      });

      await test.step('clear the index with the search index turned off', async () => {
        const toggle = searchIndex.getByTestId('cache.searchIndex.enabled');
        await toggle.locator('label').click();
        await expect(toggle.getByRole('checkbox')).not.toBeChecked();
        await searchIndex.getByRole('button', { name: 'Clear search index' }).click();
        await expect(page.getByText('Search index cleared')).toBeVisible();
        await expect(size).toHaveText('0B');
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
