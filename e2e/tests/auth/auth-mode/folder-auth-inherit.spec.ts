import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createRequest,
  expandFolder,
  openCollectionFromDialog,
  openfolder,
  openRequest,
  readField,
  selectfolderPaneTab,
  selectRequestPaneTab,
  selectResponsePaneTab,
  sendRequest
} from '../../../pages';
import { AUTH_MODE_LABELS } from '../../../constants';

const FOLDER_TOKEN = 'your_secret_token';
const BEARER_URL = 'http://localhost:8081/api/auth/bearer/protected';
const BASIC_URL = 'http://localhost:8081/api/auth/basic/protected';

const BEARER_COLLECTION = 'folder-bearer-inherit';
const BASIC_COLLECTION = 'folder-basic-inherit';
const BEARER_FOLDER = 'bearer-folder';
const BEARER_REQUEST = 'bearer-request';
const BASIC_FOLDER = 'basic-folder';
const BASIC_REQUEST = 'basic-request';
const FOLDER_USERNAME = 'bruno';
const FOLDER_PASSWORD = 'della';
const BASIC_AUTHORIZATION = `Basic ${Buffer.from(`${FOLDER_USERNAME}:${FOLDER_PASSWORD}`).toString('base64')}`;

const PARENT_COLLECTION = 'parent-bearer-inherit';
const PARENT_FOLDER = 'parent-folder';
const NESTED_FOLDER = 'nested-folder';
const NESTED_REQUEST = 'nested-protected-request';

test.describe('Folder authentication inheritance', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-522: Verify that the folder Bearer Token is Inherited to folder requests and executed successfully', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const { auth, timeline } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, BEARER_COLLECTION));
    await openfolder(page, BEARER_COLLECTION, BEARER_FOLDER, { persist: true });
    await selectfolderPaneTab(page, 'auth');
    await expandFolder(page, BEARER_FOLDER);
    await createRequest(page, BEARER_REQUEST, BEARER_FOLDER, {
      inFolder: true,
      method: 'GET',
      url: BEARER_URL
    });

    await openRequest(page, BEARER_COLLECTION, BEARER_REQUEST);
    await selectRequestPaneTab(page, 'Auth');

    await test.step(`${BEARER_REQUEST} shows the folder Bearer token`, async () => {
      await expect(auth.modeSelector()).toContainText(AUTH_MODE_LABELS.INHERIT);
      await expect(auth.inheritedSource(BEARER_FOLDER)).toBeVisible();
      await expect.poll(() => readField(page, 'Token')).toBe(FOLDER_TOKEN);
    });

    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Timeline');

    await test.step(`${BEARER_REQUEST} sent Authorization: Bearer ${FOLDER_TOKEN}`, async () => {
      const timelineItem = timeline.items();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerRow(timelineItem, 'Authorization')).toHaveCount(1);
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(`Bearer ${FOLDER_TOKEN}`);
    });
  });

  test('TC-544: Verify that the folder Bearer Token is Inherited to a nested folder request and executed successfully', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const { auth, timeline } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, PARENT_COLLECTION));
    await openfolder(page, PARENT_COLLECTION, PARENT_FOLDER, { persist: true });
    await selectfolderPaneTab(page, 'auth');
    await expandFolder(page, PARENT_FOLDER);
    await createRequest(page, NESTED_REQUEST, NESTED_FOLDER, {
      inFolder: true,
      method: 'GET',
      url: BEARER_URL
    });

    await openRequest(page, PARENT_COLLECTION, NESTED_REQUEST);
    await selectRequestPaneTab(page, 'Auth');

    await test.step(`${NESTED_REQUEST} shows the parent folder Bearer token`, async () => {
      await expect(auth.modeSelector()).toContainText(AUTH_MODE_LABELS.INHERIT);
      await expect(auth.inheritedSource(PARENT_FOLDER)).toBeVisible();
      await expect.poll(() => readField(page, 'Token')).toBe(FOLDER_TOKEN);
    });

    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Timeline');

    await test.step(`${NESTED_REQUEST} sent Authorization: Bearer ${FOLDER_TOKEN}`, async () => {
      const timelineItem = timeline.items();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerRow(timelineItem, 'Authorization')).toHaveCount(1);
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(`Bearer ${FOLDER_TOKEN}`);
    });
  });

  test('TC-509: Verify that folder Basic Authentication is inherited to a request and executed successfully', { tag: '@sanity' }, async ({ page, electronApp, collectionFixturePath }) => {
    const { auth, timeline } = buildCommonLocators(page);

    await openCollectionFromDialog(page, electronApp, path.join(collectionFixturePath!, BASIC_COLLECTION));
    await openfolder(page, BASIC_COLLECTION, BASIC_FOLDER, { persist: true });
    await selectfolderPaneTab(page, 'auth');
    await expandFolder(page, BASIC_FOLDER);
    await createRequest(page, BASIC_REQUEST, BASIC_FOLDER, {
      inFolder: true,
      method: 'POST',
      url: BASIC_URL
    });

    await openRequest(page, BASIC_COLLECTION, BASIC_REQUEST);
    await selectRequestPaneTab(page, 'Auth');

    await test.step(`${BASIC_REQUEST} shows the folder Basic credentials`, async () => {
      await expect(auth.modeLabel()).toHaveText(AUTH_MODE_LABELS.INHERIT);
      await expect.poll(() => readField(page, 'Username')).toBe(FOLDER_USERNAME);
      await expect.poll(() => readField(page, 'Password')).toBe(FOLDER_PASSWORD);
    });

    await sendRequest(page, 200);
    await selectResponsePaneTab(page, 'Timeline');

    await test.step(`${BASIC_REQUEST} sent ${BASIC_AUTHORIZATION}`, async () => {
      const timelineItem = timeline.items();
      await timeline.itemHeader(timelineItem).click();
      await expect(timeline.headerRow(timelineItem, 'Authorization')).toHaveCount(1);
      await expect(timeline.headerValue(timelineItem, 'Authorization')).toHaveText(BASIC_AUTHORIZATION);
    });
  });
});
