import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  expandCollection,
  expandFolder,
  openItemActionsMenu,
  pasteIntoCollection,
  renameItemTo
} from '../../utils/page';
import { buildNewRequestLocators } from '../../utils/request';

const collectionName = 'folder-actions';

test.describe('Folder actions', () => {
  test('TC-367: Verify that user is able to Rename a parent folder.', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { sidebar, toast } = buildCommonLocators(page);

    await expandCollection(page, collectionName);
    await expandFolder(page, 'parent-folder');
    await sidebar.itemInFolder('parent-folder', 'child-folder').waitFor({ state: 'visible' });

    await renameItemTo(page, 'parent-folder', 'renamed-parent', 'folder');

    await test.step('Renamed parent stays in the collection and still contains the child folder', async () => {
      await expect(toast.byMessage('Item renamed successfully').first()).toBeVisible();
      await expect(sidebar.itemByName('renamed-parent')).toBeVisible();
      await expect(sidebar.itemByName('parent-folder')).toHaveCount(0);
      await expandFolder(page, 'renamed-parent');
      await expect(sidebar.itemInFolder('renamed-parent', 'child-folder')).toBeVisible();
    });
  });

  test('TC-179: verify that the user is able to Delete the Folder', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { modal, sidebar } = buildCommonLocators(page);

    await expandCollection(page, collectionName);
    await sidebar.scopedItem(collectionName, 'orders').waitFor({ state: 'visible' });

    await openItemActionsMenu(page, 'orders');
    await sidebar.rowMenu('orders').item('delete').click();
    await modal.button('Delete').click();

    await test.step('Folder is removed from the collection', async () => {
      await expect(sidebar.scopedItem(collectionName, 'orders')).toHaveCount(0);
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });
  });

  test('TC-178: Verify that the user is able to Clone the Folder', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { sidebar, toast } = buildCommonLocators(page);

    await expandCollection(page, collectionName);
    await sidebar.scopedItem(collectionName, 'billing').waitFor({ state: 'visible' });

    await openItemActionsMenu(page, 'billing');
    await sidebar.rowMenu('billing').item('clone').click();

    await test.step('Folder clone is added and the original folder remains', async () => {
      await expect(toast.byMessage('Folder cloned!').first()).toBeVisible();
      await expect(sidebar.scopedItem(collectionName, 'billing')).toBeVisible();
      await expect(sidebar.scopedItem(collectionName, 'billing copy')).toBeVisible();
    });
  });

  test('TC-172: Verify that the user is able to create a New Request inside a folder', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const folderName = 'empty-folder';
    const requestName = 'new-request-in-folder';
    const requestUrl = 'http://localhost:8081/ping';
    const { modal, request, sidebar, tabs, toast } = buildCommonLocators(page);
    const newRequest = buildNewRequestLocators(page);

    await test.step('Arrange: a folder with no requests', async () => {
      await expandCollection(page, collectionName);
      await sidebar.scopedItem(collectionName, folderName).waitFor({ state: 'visible' });
    });

    await test.step('Select New Request from the folder actions menu', async () => {
      await openItemActionsMenu(page, folderName);
      await sidebar.rowMenu(folderName).item('new-request').click();
    });

    await test.step('Verify that the new request modal and the request name input are visible', async () => {
      await expect(modal.byTitle('New Request')).toBeVisible();
      await expect(request.requestNameInput()).toBeVisible();
    });

    await test.step('Pick the HTTP request type, fill the name and URL, and create the request', async () => {
      await newRequest.requestTypeOption('http-request').click();
      await request.requestNameInput().fill(requestName);
      await request.newRequestUrl().click();
      await page.keyboard.type(requestUrl);
      await modal.button('Create').click();
    });

    await test.step('Verify that the request is created in the folder with a successful toast message', async () => {
      await expect(toast.byMessage('New request created!').first()).toBeVisible();
      await expect(modal.any()).toHaveCount(0);
      await expect(sidebar.itemInFolder(folderName, requestName)).toBeVisible();
      await expect(tabs.activeRequestTab()).toContainText(requestName);
      await expect(request.urlLine()).toContainText(requestUrl);
    });
  });

  test('TC-925: Verify that the Copy option is visible in the folder actions menu', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const folderName = 'copy-folder';
    const { sidebar } = buildCommonLocators(page);

    await test.step('Arrange: the collection has a folder', async () => {
      await expandCollection(page, collectionName);
      await sidebar.scopedItem(collectionName, folderName).waitFor({ state: 'visible' });
    });

    await test.step('Open the folder actions menu', async () => {
      await openItemActionsMenu(page, folderName);
    });

    await test.step('Verify the Copy option is visible', async () => {
      await expect(sidebar.rowMenu(folderName).item('copy')).toBeVisible();
    });

    await test.step('Close the folder actions menu', async () => {
      await page.keyboard.press('Escape');
    });
  });

  test('TC-929: Verify that user is able to copy a folder and paste it into the collection with the same requests', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const folderName = 'copy-paste-folder';
    const pastedFolderName = `${folderName} copy`;
    const requests = [
      { name: 'list-items', url: 'http://localhost:8081/api/echo/anything/items' },
      { name: 'get-item', url: 'http://localhost:8081/api/echo/anything/items/1' }
    ];
    const { sidebar, tabs, toast, request } = buildCommonLocators(page);

    await test.step('Arrange: the collection has a folder with requests', async () => {
      await expandCollection(page, collectionName);
      await sidebar.scopedItem(collectionName, folderName).waitFor({ state: 'visible' });
    });

    await test.step('Copy the folder from its menu and verify the toast message', async () => {
      await openItemActionsMenu(page, folderName);
      await sidebar.rowMenu(folderName).item('copy').click();
      await expect(toast.byMessage('Folder copied').first()).toBeVisible();
    });

    await test.step('Paste from the collection menu', async () => {
      await pasteIntoCollection(page, collectionName);
    });

    await test.step('Verify the toast message, pasted folder and the original folder are visible', async () => {
      await expect(toast.byMessage('Item pasted successfully').first()).toBeVisible();
      await expect(sidebar.scopedItem(collectionName, pastedFolderName)).toBeVisible();
      await expect(sidebar.scopedItem(collectionName, folderName)).toBeVisible();
    });

    await test.step('Verify the pasted folder opens and lists the same requests as the original folder', async () => {
      await sidebar.itemByName(pastedFolderName).click();
      await expect(tabs.activeRequestTab()).toContainText(pastedFolderName);
      await expandFolder(page, pastedFolderName);
      for (const { name, url } of requests) {
        await expect(sidebar.itemInFolder(pastedFolderName, name)).toBeVisible();
        await sidebar.itemInFolder(pastedFolderName, name).click();
        await expect(request.urlLine()).toContainText(url);
      }
    });

    await test.step('Verify the original folder still contains the requests', async () => {
      await expandFolder(page, folderName);
      for (const { name, url } of requests) {
        await expect(sidebar.itemInFolder(folderName, name)).toBeVisible();
        await sidebar.itemInFolder(folderName, name).click();
        await expect(request.urlLine()).toContainText(url);
      }
    });
  });
});
