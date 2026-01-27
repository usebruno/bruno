import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, createRequest, saveRequest, selectRequestPaneTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Tag persistence', () => {
  test.afterEach(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify tag persistence while moving requests within a collection', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'test-collection';
    const requestUrl = 'https://httpfaker.org/api/echo';
    const tagName = 'smoke';

    // Create first collection
    await createCollection(page, collectionName, await createTmpDir(collectionName));
    // Create three requests via the dialog/modal flow, then add a tag to each
    const requestNames = ['request-1', 'request-2', 'request-3'];
    for (const requestName of requestNames) {
      await createRequest(page, requestName, collectionName, { url: requestUrl });
      await locators.sidebar.request(requestName).click();
      await locators.tabs.requestTab(requestName).waitFor({ state: 'visible' });
      await selectRequestPaneTab(page, 'Settings');
      await expect(locators.tags.input()).toBeVisible();
      await locators.tags.input().fill(tagName);
      await locators.tags.input().press('Enter');
      await expect(locators.tags.item(tagName)).toBeVisible();
      await saveRequest(page);
    }

    // Move the last request to just above the first request within the same collection
    const r3Request = locators.sidebar.request('request-3');
    const r1Request = locators.sidebar.request('request-1');

    await expect(r3Request).toBeVisible();
    await expect(r1Request).toBeVisible();

    // Perform drag and drop operation to move the last request above the first using source position
    await r3Request.dragTo(r1Request, {
      targetPosition: { x: 0, y: 1 }
    });

    // Verify the requests are still in the collection
    for (const requestName of requestNames) {
      await expect(locators.sidebar.request(requestName)).toBeVisible();
    }

    // Click on the moved request to verify the tag persisted after the move
    await r3Request.click();
    await locators.tabs.requestTab('request-3').waitFor({ state: 'visible' });
    await selectRequestPaneTab(page, 'Settings');
    // Verify the tag is still present after the move
    await expect(locators.tags.item(tagName)).toBeVisible();
  });

  test('verify tag persistence while moving requests between folders', async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    // Create first collection
    await createCollection(page, 'test-collection', await createTmpDir('test-collection'));

    // Create a new folder
    await locators.sidebar.collectionRow('test-collection').hover();
    await locators.actions.collectionActions('test-collection').click();
    await page.waitForTimeout(1);
    await locators.dropdown.item('New Folder').click();
    await page.locator('#folder-name').fill('folder-1');
    await locators.modal.button('Create').click();
    await expect(locators.sidebar.folder('folder-1')).toBeVisible();

    // Create a new request within folder-1 folder
    await locators.sidebar.folder('folder-1').click();

    await locators.sidebar.folder('folder-1').hover();
    await locators.actions.collectionItemActions('folder-1').click();
    await locators.dropdown.item('New Request').click();
    await locators.request.requestNameInput().fill('request-1');
    await locators.request.newRequestUrl().click();
    await page.keyboard.type('https://httpfaker.org/api/echo');
    await locators.modal.button('Create').click();

    // create another request within folder-1 folder
    await locators.sidebar.folder('folder-1').hover();
    await locators.actions.collectionItemActions('folder-1').click();
    await locators.dropdown.item('New Request').click();
    await locators.request.requestNameInput().fill('request-2');
    await locators.request.newRequestUrl().click();
    await page.keyboard.type('https://httpfaker.org/api/echo');
    await locators.modal.button('Create').click();
    await expect(locators.sidebar.folderRequest('folder-1', 'request-2')).toBeVisible();
    await locators.sidebar.folderRequest('folder-1', 'request-2').click();
    await expect(locators.tabs.activeRequestTab()).toContainText('request-2');

    // Add a tag to the request
    await selectRequestPaneTab(page, 'Settings');
    await expect(locators.tags.input()).toBeVisible();

    await locators.tags.input().fill('smoke');
    await locators.tags.input().press('Enter');
    await expect(locators.tags.item('smoke')).toBeVisible();
    await page.keyboard.press('Meta+s');

    // Create another folder
    await locators.sidebar.collectionRow('test-collection').hover();
    await locators.actions.collectionActions('test-collection').click();
    await locators.dropdown.item('New Folder').click();
    await page.locator('#folder-name').fill('folder-2');
    await locators.modal.button('Create').click();

    // open folder-2 folder
    await locators.sidebar.folder('folder-2').click();
    await locators.sidebar.folder('folder-2').hover();
    await locators.actions.collectionItemActions('folder-2').click();
    await locators.dropdown.item('New Request').click();
    await locators.request.requestNameInput().fill('request-3');
    await locators.request.newRequestUrl().click();
    await page.keyboard.type('https://httpfaker.org/api/echo');
    await locators.modal.button('Create').click();

    // Drag and drop request-2 request to folder-2 folder
    const r2Request = locators.sidebar.request('request-2');
    const f2Folder = locators.sidebar.folder('folder-2');
    await r2Request.dragTo(f2Folder);

    const request2 = locators.sidebar.folderRequest('folder-2', 'request-2');
    await expect(request2).toBeVisible();

    // Click on request-2 to verify the tag persisted after the move
    await request2.click();
    await locators.tabs.requestTab('request-2').waitFor({ state: 'visible' });

    await selectRequestPaneTab(page, 'Settings');
    await expect(locators.tags.item('smoke')).toBeVisible();
  });
});
