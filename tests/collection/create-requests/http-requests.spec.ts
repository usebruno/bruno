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

test.describe('Create HTTP Requests', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-116, TC-126: Verify that Adding a new request under the collection and inside a folder.', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const collectionName = 'http-requests';
    const folderName = 'folder1';
    const rootRequestName = 'root-http';
    const folderRequestName = 'folder-http';
    const requestUrl = 'https://echo.usebruno.com';
    const collectionLocation = await createTmpDir('http-requests');
    const collectionDir = path.join(collectionLocation, collectionName);
    const { sidebar, tabs } = buildCommonLocators(page);

    await test.step('Create a collection with a folder', async () => {
      await createCollection(page, collectionName, collectionLocation, 'yml');
      await createFolder(page, folderName, collectionName);
      await expect(sidebar.scopedItem(collectionName, folderName)).toBeVisible();
    });

    await test.step('Create an HTTP request from the collection menu', async () => {
      await createRequest(page, rootRequestName, collectionName, { url: requestUrl });
    });

    await test.step('Request is listed at the collection root and opened as the active tab', async () => {
      const rootRequest = sidebar.request(rootRequestName);
      await expandFolder(page, folderName);
      await expect(rootRequest).toBeVisible();
      await expect(sidebar.folderRequest(folderName, rootRequestName)).toHaveCount(0);
      await rootRequest.click();
      await expect(tabs.activeRequestTab()).toContainText(rootRequestName);
    });

    await test.step('Request file is written at the collection root', async () => {
      const rootRequestPath = path.join(collectionDir, `${rootRequestName}.yml`);
      const requestInsideFolder = path.join(collectionDir, folderName, `${rootRequestName}.yml`);
      await expect.poll(() => fs.existsSync(rootRequestPath), { timeout: 10000 }).toBe(true);
      const contents = fs.readFileSync(rootRequestPath, 'utf8');
      expect(contents).toContain(`name: ${rootRequestName}`);
      expect(contents).toContain('type: http');
      expect(contents).toContain(`url: ${requestUrl}`);
      expect(fs.existsSync(requestInsideFolder)).toBe(false);
    });

    await test.step('Create an HTTP request from the folder menu', async () => {
      await createRequest(page, folderRequestName, folderName, { url: requestUrl, inFolder: true });
    });

    await test.step('Request is listed inside the folder and opened as the active tab', async () => {
      const folderRequest = sidebar.folderRequest(folderName, folderRequestName);
      await expect(folderRequest).toBeVisible();
      await folderRequest.click();
      await expect(tabs.activeRequestTab()).toContainText(folderRequestName);
    });

    await test.step('Request file is written inside the folder', async () => {
      const folderRequestPath = path.join(collectionDir, folderName, `${folderRequestName}.yml`);
      const requestAtRoot = path.join(collectionDir, `${folderRequestName}.yml`);
      await expect.poll(() => fs.existsSync(folderRequestPath), { timeout: 10000 }).toBe(true);
      const contents = fs.readFileSync(folderRequestPath, 'utf8');
      expect(contents).toContain(`name: ${folderRequestName}`);
      expect(contents).toContain('type: http');
      expect(contents).toContain(`url: ${requestUrl}`);
      expect(fs.existsSync(requestAtRoot)).toBe(false);
    });
  });
});
