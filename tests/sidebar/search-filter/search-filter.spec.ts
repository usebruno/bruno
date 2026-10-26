import { test, expect, closeElectronApp } from '../../../playwright';
import path from 'path';
import {
  buildCommonLocators,
  collapseFolder,
  createApp,
  expandFolder,
  waitForReadyPage,
  createCollection,
  createFolder,
  createRequest,
  expandCollection,
  searchSidebarRequests
} from '../../utils/page';
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
  test('filters by request name, force-expands collapsed matches without persisting it, and excludes apps', async ({ launchElectronApp, createTmpDir }) => {
    const collectionDir = path.join(await createTmpDir('search-filter'), COLLECTION_NAME);
    buildCollectionOnDisk(collectionDir);

    const app = await launchElectronApp({
      initUserDataPath: path.join(__dirname, 'init-user-data'),
      templateVars: { collectionPath: collectionDir.split(path.sep).join('/') }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);
    const searchInput = page.getByTestId('sidebar-search-input');
    const row = locators.sidebar.item;

    try {
      await test.step('Load the collection and add an app, leaving `auth` collapsed', async () => {
        await locators.sidebar.collection(COLLECTION_NAME).click();
        await expect(row('search-me')).toBeVisible({ timeout: 15000 });
        await expect(row('auth')).toBeVisible();
        // Folders mount collapsed, so `auth`'s requests start hidden. That is the precondition
        // for the force-expand assertion below — pre-expanding the folder would make it vacuous.
        await expect(row('login')).toHaveCount(0);
        await expect(row('logout')).toHaveCount(0);
        // An app whose name also matches "log" — it must still be excluded from search results.
        await createApp(page, 'log-app', { collectionName: COLLECTION_NAME });
        await expect(row('log-app')).toBeVisible({ timeout: 10000 });
        await page.getByTitle('Search requests').click();
      });

      await test.step('Searching "log" force-expands the collapsed folder and hides non-matches', async () => {
        await searchInput.fill('log');
        await expect(row('auth')).toBeVisible();
        // `auth` is still collapsed in state; the search overrides that at render time.
        await expect(row('login')).toBeVisible();
        await expect(row('logout')).toBeVisible();
        await expect(row('search-me')).toHaveCount(0);
        await expect(row('health')).toHaveCount(0);
        // Apps are never surfaced while searching, even though "log-app" matches "log".
        await expect(row('log-app')).toHaveCount(0);
      });

      await test.step('Clearing the search collapses `auth` again', async () => {
        await searchInput.fill('');
        // The force-expand is a render-time override, not a state change, so the folder must
        // go back to collapsed rather than staying open.
        await expect(row('login')).toHaveCount(0);
        await expect(row('logout')).toHaveCount(0);
        for (const name of ['search-me', 'health', 'auth', 'log-app']) {
          await expect(row(name)).toBeVisible();
        }
      });

      await test.step('Opening a filtered match reveals it, expanding `auth` for real rather than at render time', async () => {
        await searchInput.fill('login');
        await expect(row('login')).toBeVisible();

        await row('login').click();
        await expect(locators.tabs.activeRequestTab()).toContainText('login');

        await searchInput.fill('');
        await expect(row('login')).toBeVisible();
        await expect(row('logout')).toBeVisible();

        await collapseFolder(page, 'auth');
        await expect(row('login')).toHaveCount(0);
      });

      await test.step('A folder the user expanded stays expanded across a search', async () => {
        await expandFolder(page, 'auth');
        await expect(row('login')).toBeVisible();

        await searchInput.fill('log');
        await expect(row('login')).toBeVisible();
        await expect(row('logout')).toBeVisible();

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

  test('TC-365: filters requests by the name typed in the search above the collection list', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { sidebar } = buildCommonLocators(page);
    const peopleCollection = 'people';
    const healthCollection = 'health';
    const accountsFolder = 'accounts';
    const matchingRootRequest = 'list-users';
    const otherRootRequest = 'list-orders';
    const matchingFolderRequest = 'create-user';
    const otherFolderRequest = 'delete-order';
    const unrelatedRequest = 'ping';

    await test.step('Create collections, a folder, and requests', async () => {
      await createCollection(page, peopleCollection, await createTmpDir(peopleCollection));
      await createRequest(page, matchingRootRequest, peopleCollection);
      await createRequest(page, otherRootRequest, peopleCollection);
      await createFolder(page, accountsFolder, peopleCollection);
      await expandFolder(page, accountsFolder);
      await createRequest(page, matchingFolderRequest, accountsFolder, { inFolder: true });
      await createRequest(page, otherFolderRequest, accountsFolder, { inFolder: true });

      await createCollection(page, healthCollection, await createTmpDir(healthCollection));
      await createRequest(page, unrelatedRequest, healthCollection);

      await expandCollection(page, peopleCollection);
      await expandFolder(page, accountsFolder);
    });

    await test.step('Open the search above the collection list', async () => {
      await sidebar.searchToggle().click();
      await expect(sidebar.searchInput()).toBeVisible();

      const searchBox = await sidebar.searchInput().boundingBox();
      const collectionBox = await sidebar.collectionExact(peopleCollection).boundingBox();
      expect(searchBox).not.toBeNull();
      expect(collectionBox).not.toBeNull();
      expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(collectionBox!.y);
    });

    await test.step('Filter to requests whose name matches the keyword', async () => {
      await searchSidebarRequests(page, 'user');

      // Requests, folders, and collections matching the search term are visible.
      await expect(sidebar.itemByName(matchingRootRequest)).toBeVisible();
      await expect(sidebar.itemByName(matchingFolderRequest)).toBeVisible();
      await expect(sidebar.itemByName(accountsFolder)).toBeVisible();
      await expect(sidebar.collectionExact(peopleCollection)).toBeVisible();

      // Requests, folders, and collections not matching the search term are hidden.
      await expect(sidebar.itemByName(otherRootRequest)).toBeHidden();
      await expect(sidebar.itemByName(otherFolderRequest)).toBeHidden();
      await expect(sidebar.itemByName(unrelatedRequest)).toBeHidden();
      await expect(sidebar.collectionExact(healthCollection)).toBeHidden();
    });

    await test.step('Clearing the search shows every request again', async () => {
      await sidebar.searchClear().click();
      await expandCollection(page, peopleCollection);
      await expandFolder(page, accountsFolder);
      await expandCollection(page, healthCollection);

      // All requests, folders, and collections are visible again after clearing the search.
      await expect(sidebar.itemByName(matchingRootRequest)).toBeVisible();
      await expect(sidebar.itemByName(matchingFolderRequest)).toBeVisible();
      await expect(sidebar.itemByName(accountsFolder)).toBeVisible();
      await expect(sidebar.collectionExact(peopleCollection)).toBeVisible();
      await expect(sidebar.itemByName(otherRootRequest)).toBeVisible();
      await expect(sidebar.itemByName(otherFolderRequest)).toBeVisible();
      await expect(sidebar.itemByName(unrelatedRequest)).toBeVisible();
      await expect(sidebar.collectionExact(healthCollection)).toBeVisible();
    });
  });
});
