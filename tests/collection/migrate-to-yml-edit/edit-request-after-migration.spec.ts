import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  confirmMigration,
  fillRequestUrl,
  openCollection,
  openMigrateToYmlModalFromOverview,
  openRequest,
  saveRequest
} from '../../utils/page';

const COLLECTION_NAME = 'migrate-edit-request';
const REQUEST_NAME = 'edit-after-migration';
const EDITED_URL = 'http://localhost:8081/ping?edited=true';

test.describe('Migrate to YML — edit request after migration', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-5964: Verify after migration user is able to edit the request', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const { tabs, toast } = buildCommonLocators(page);
    const collectionPath = collectionFixturePath!;
    const ymlPath = path.join(collectionPath, `${REQUEST_NAME}.yml`);

    await test.step('Precondition: migrate the bru collection to yml', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openMigrateToYmlModalFromOverview(page, COLLECTION_NAME);
      await confirmMigration(page);
      await toast.byMessage('Collection migrated to YML format successfully').waitFor({ state: 'visible' });
    });

    await test.step('Open the request and edit its URL', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await fillRequestUrl(page, EDITED_URL, { replace: true });
    });

    await test.step('The request has unsaved changes', async () => {
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeVisible();
    });

    await test.step('Save the request', async () => {
      await saveRequest(page);
    });

    await test.step('The request is saved with the new URL in yml format', async () => {
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeHidden();
      await expect.poll(() => fs.readFileSync(ymlPath, 'utf8')).toContain(EDITED_URL);
      expect(fs.existsSync(path.join(collectionPath, `${REQUEST_NAME}.bru`))).toBe(false);
    });
  });
});
