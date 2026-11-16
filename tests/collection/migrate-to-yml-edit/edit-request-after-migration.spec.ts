import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  confirmMigration,
  createCollection,
  createRequest,
  fillRequestUrl,
  openMigrateToYmlModalFromOverview,
  saveRequest
} from '../../utils/page';

const REQUEST_NAME = 'edit-after-migration';
const ORIGINAL_URL = 'http://localhost:8081/ping';
const EDITED_URL = 'http://localhost:8081/ping?edited=true';

const firstDirIn = (dir: string) =>
  path.join(dir, fs.readdirSync(dir).find((entry) => fs.statSync(path.join(dir, entry)).isDirectory())!);

test.describe('Migrate to YML edit request after migration', { tag: '@sanity' }, () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-5964: Verify after migration user is able to edit the request', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { sidebar, tabs } = buildCommonLocators(page);
    const collectionName = 'migrate-edit-request';
    const parentDir = await createTmpDir(collectionName);

    await test.step('Precondition: migrate a bru collection to yml', async () => {
      await createCollection(page, collectionName, parentDir, 'bru');
      await createRequest(page, REQUEST_NAME, collectionName, { method: 'GET', url: ORIGINAL_URL });
      await openMigrateToYmlModalFromOverview(page, collectionName);
      await confirmMigration(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible();
    });

    await test.step('User clicks on the request', async () => {
      await sidebar.request(REQUEST_NAME).click();
      await expect(tabs.activeRequestTab()).toContainText(REQUEST_NAME);
    });

    await test.step('User edits the URL', async () => {
      await fillRequestUrl(page, EDITED_URL, { replace: true });
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeVisible();
    });

    await test.step('User saves; the request is saved with the new changes', async () => {
      await saveRequest(page);
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeHidden();

      const collectionDir = firstDirIn(parentDir);
      const ymlPath = path.join(collectionDir, `${REQUEST_NAME}.yml`);
      await expect.poll(() => fs.readFileSync(ymlPath, 'utf8')).toContain(EDITED_URL);
      expect(fs.existsSync(path.join(collectionDir, `${REQUEST_NAME}.bru`))).toBe(false);
    });
  });
});
