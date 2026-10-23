import * as fs from 'fs';
import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  expandFolder
} from '../../utils/page';

const requestUrl = 'https://echo.usebruno.com';

test.describe('Create HTTP Requests', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-116: Verify adding a new request under the collection', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'http-requests';
    const requestName = 'root-http';
    const collectionLocation = await createTmpDir('http-requests-collection');
    const collectionDir = path.join(collectionLocation, collectionName);
    const { sidebar, tabs } = buildCommonLocators(page);

    await test.step('Create a collection', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
    });

    await test.step('Create an HTTP request from the collection menu', async () => {
      await createRequest(page, requestName, collectionName, { url: requestUrl });
    });

    await test.step('Request is listed at the collection root and opened as the active tab', async () => {
      const rootRequest = sidebar.request(requestName);
      await expect(rootRequest).toBeVisible();
      await rootRequest.click();
      await expect(tabs.activeRequestTab()).toContainText(requestName);
    });

    await test.step('Request file is written at the collection root', async () => {
      const rootRequestPath = path.join(collectionDir, `${requestName}.yml`);
      await expect.poll(() => fs.existsSync(rootRequestPath)).toBe(true);
      const contents = fs.readFileSync(rootRequestPath, 'utf8');
      expect(contents).toContain(`name: ${requestName}`);
      expect(contents).toContain('type: http');
      expect(contents).toContain(`url: ${requestUrl}`);
    });
  });

  test('TC-126: Verify adding a new request inside a folder', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'http-requests';
    const folderName = 'folder1';
    const requestName = 'folder-http';
    const collectionLocation = await createTmpDir('http-requests-folder');
    const collectionDir = path.join(collectionLocation, collectionName);
    const { sidebar, tabs } = buildCommonLocators(page);

    await test.step('Create a collection with a folder', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await createFolder(page, folderName, collectionName);
      await expect(sidebar.scopedItem(collectionName, folderName)).toBeVisible();
    });

    await test.step('Create an HTTP request from the folder menu', async () => {
      await expandFolder(page, folderName);
      await createRequest(page, requestName, folderName, { url: requestUrl, inFolder: true });
    });

    await test.step('Request is listed inside the folder and opened as the active tab', async () => {
      const folderRequest = sidebar.folderRequest(folderName, requestName);
      await expect(folderRequest).toBeVisible();
      await folderRequest.click();
      await expect(tabs.activeRequestTab()).toContainText(requestName);
    });

    await test.step('Request file is written inside the folder', async () => {
      const folderRequestPath = path.join(collectionDir, folderName, `${requestName}.yml`);
      const requestAtRoot = path.join(collectionDir, `${requestName}.yml`);
      await expect.poll(() => fs.existsSync(folderRequestPath)).toBe(true);
      const contents = fs.readFileSync(folderRequestPath, 'utf8');
      expect(contents).toContain(`name: ${requestName}`);
      expect(contents).toContain('type: http');
      expect(contents).toContain(`url: ${requestUrl}`);
      expect(fs.existsSync(requestAtRoot)).toBe(false);
    });
  });
});
