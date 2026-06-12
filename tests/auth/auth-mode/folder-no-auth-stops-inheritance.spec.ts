import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  openRequest,
  saveRequest,
  selectAuthMode,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest,
  typeIntoField
} from '../../utils/page';
import { AUTH_MODE_LABELS } from '../../utils/constants';

test.afterEach(async ({ page }) => {
  await closeAllCollections(page);
});

test('Request inherits No Auth from the folder — collection Bearer Token is overridden', async ({ page, createTmpDir }) => {
  const collectionName = 'folder-no-auth-inheritance';
  const locators = buildCommonLocators(page);

  await test.step('Create a collection', async () => {
    await createCollection(page, collectionName, await createTmpDir());
  });

  await test.step('Set auth type for the collection as Bearer Token', async () => {
    await locators.paneTabs.collectionSettingsTab('auth').click();
    await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
    await typeIntoField(page, 'Token', 'your_secret_token');
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('Create folder-1 inside the collection and set auth type for folder-1 as No Auth', async () => {
    await createFolder(page, 'folder-1', collectionName, true);
    await locators.sidebar.folder('folder-1').dblclick();
    await locators.paneTabs.folderSettingsTab('auth').click();
    await selectAuthMode(page, AUTH_MODE_LABELS.NONE);
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('Create an HTTP request inside folder-1 and set auth type for the request as Inherit', async () => {
    const requestName = 'http-request-1';
    await createRequest(page, requestName, 'folder-1', {
      inFolder: true,
      requestType: 'http',
      method: 'GET',
      url: 'https://testbench-sanity.usebruno.com/api/auth/bearer/protected'
    });
    await openRequest(page, collectionName, requestName);
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, AUTH_MODE_LABELS.INHERIT);
    await saveRequest(page);
  });

  await test.step('Send the request and open the Timeline tab', async () => {
    await sendRequest(page);
    await selectResponsePaneTab(page, 'Timeline');
  });

  await test.step('Verify the response status code is 401 Unauthorized', async () => {
    await expect(locators.response.statusCode()).toContainText('401 Unauthorized');
  });

  await test.step('Open the latest timeline entry and verify no Authorization header was sent', async () => {
    const timelineItem = locators.timeline.lastItem();
    await locators.timeline.itemHeader(timelineItem).click();
    await expect(timelineItem).toContainText('No Headers');
    await locators.timeline.clearButton().click();
  });

  await test.step('Change folder-1 auth type to Bearer Token with the expected token', async () => {
    await locators.sidebar.folder('folder-1').dblclick();
    await locators.paneTabs.folderSettingsTab('auth').click();
    await selectAuthMode(page, AUTH_MODE_LABELS.BEARER);
    await typeIntoField(page, 'Token', 'your_secret_token');
    await page.getByRole('button', { name: 'Save' }).click();
  });

  await test.step('Send the request again and verify the response status code is 200', async () => {
    await openRequest(page, collectionName, 'http-request-1');
    await sendRequest(page);
    await selectResponsePaneTab(page, 'Timeline');
    await expect(locators.response.statusCode()).toContainText('200');
  });

  await test.step('Open the latest timeline entry and verify the Bearer token was sent', async () => {
    const timelineItem = locators.timeline.lastItem();
    await locators.timeline.itemHeader(timelineItem).click();
    await expect(timelineItem).toContainText('Bearer your_secret_token');
  });
});
