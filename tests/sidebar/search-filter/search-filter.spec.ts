import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import { buildCommonLocators, createApp, expandFolder } from '../../utils/page';
import { initBruCollection, writeBruRequest, writeBruFolder } from '../../utils/fixtures/bru-collection';

const COLLECTION_NAME = 'SearchCol';

const buildCollectionOnDisk = (dir: string) => {
  initBruCollection(dir, COLLECTION_NAME);
  writeBruRequest(dir, 'search-me', { seq: 1 });
  writeBruRequest(dir, 'health', { seq: 2 });

  const authDir = writeBruFolder(dir, 'auth', 1);
  writeBruRequest(authDir, 'login', { seq: 1 });
  writeBruRequest(authDir, 'logout', { seq: 2 });
};

test.describe('Sidebar search filtering', () => {
  test('filters by request name, force-expands matching folders, and excludes apps', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('search-filter'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await app.firstWindow();
    const locators = buildCommonLocators(page);
    const searchInput = page.getByTestId('sidebar-search-input');
    // Any sidebar row (folder / request / app) carries `.collection-item-name`.
    const row = (name: string) => page.locator('.collection-item-name').filter({ hasText: name });

    try {
      await test.step('Load the collection, expand the folder, add an app', async () => {
        await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(row('search-me')).toBeVisible({ timeout: 15000 });
        // Expand `auth` for real so its requests stay visible after the search is cleared.
        await expandFolder(page, 'auth');
        await expect(row('login')).toBeVisible();
        // An app whose name also matches "log" — it must still be excluded from search results.
        await createApp(page, 'log-app', { collectionName: COLLECTION_NAME });
        await expect(row('log-app')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Searching "log" shows matching requests, but hides non-matches and the app', async () => {
        await page.getByTitle('Search requests').click();
        await searchInput.fill('log');
        await expect(row('login')).toBeVisible();
        await expect(row('logout')).toBeVisible();
        await expect(row('auth')).toBeVisible();
        await expect(row('search-me')).toHaveCount(0);
        await expect(row('health')).toHaveCount(0);
        // Apps are never surfaced while searching, even though "log-app" matches "log".
        await expect(row('log-app')).toHaveCount(0);
      });

      await test.step('Clearing the search restores the entire tree', async () => {
        await searchInput.fill('');
        for (const name of ['search-me', 'health', 'auth', 'login', 'logout', 'log-app']) {
          await expect(row(name)).toBeVisible();
        }
      });

      await test.step('Searching a top-level name hides the non-matching folder', async () => {
        await searchInput.fill('health');
        await expect(row('health')).toBeVisible();
        await expect(row('login')).toHaveCount(0);
        await expect(row('logout')).toHaveCount(0);
        await expect(row('search-me')).toHaveCount(0);
        await expect(row('log-app')).toHaveCount(0);
        await expect(row('auth')).toHaveCount(0);
      });
    } finally {
      await closeElectronApp(app);
    }
  });
});
