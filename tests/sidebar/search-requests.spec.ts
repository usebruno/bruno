import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  clearSidebarSearch,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandCollection,
  expandFolder,
  searchSidebarRequests
} from '../utils/page';

test.describe('TC-365: Search requests in the sidebar', { tag: '@sanity' }, () => {
  test.afterEach(async ({ page }) => {
    await clearSidebarSearch(page);
    await closeAllCollections(page);
  });

  test('filters requests by the name typed in the search above the collection list', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
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
      await locators.sidebar.searchToggle().click();
      await expect(locators.sidebar.searchInput()).toBeVisible();

      const searchBox = await locators.sidebar.searchInput().boundingBox();
      const collectionBox = await locators.sidebar.collectionExact(peopleCollection).boundingBox();
      expect(searchBox).not.toBeNull();
      expect(collectionBox).not.toBeNull();
      expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(collectionBox!.y);
    });

    await test.step('Filter to requests whose name matches the keyword', async () => {
      await searchSidebarRequests(page, 'user');

      await expect(locators.sidebar.itemByName(matchingRootRequest)).toBeVisible();
      await expect(locators.sidebar.itemByName(matchingFolderRequest)).toBeVisible();
      await expect(locators.sidebar.itemByName(accountsFolder)).toBeVisible();
      await expect(locators.sidebar.collectionExact(peopleCollection)).toBeVisible();

      await expect(locators.sidebar.itemByName(otherRootRequest)).toBeHidden();
      await expect(locators.sidebar.itemByName(otherFolderRequest)).toBeHidden();
      await expect(locators.sidebar.itemByName(unrelatedRequest)).toBeHidden();
      await expect(locators.sidebar.collectionExact(healthCollection)).toBeHidden();
    });

    await test.step('Clearing the search shows every request again', async () => {
      await clearSidebarSearch(page);
      await expandCollection(page, peopleCollection);
      await expandFolder(page, accountsFolder);
      await expandCollection(page, healthCollection);

      await expect(locators.sidebar.itemByName(matchingRootRequest)).toBeVisible();
      await expect(locators.sidebar.itemByName(otherRootRequest)).toBeVisible();
      await expect(locators.sidebar.itemByName(matchingFolderRequest)).toBeVisible();
      await expect(locators.sidebar.itemByName(otherFolderRequest)).toBeVisible();
      await expect(locators.sidebar.itemByName(unrelatedRequest)).toBeVisible();
      await expect(locators.sidebar.collectionExact(healthCollection)).toBeVisible();
    });
  });
});
