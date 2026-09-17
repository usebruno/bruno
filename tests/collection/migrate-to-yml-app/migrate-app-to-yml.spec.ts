import { test, expect } from '../../../playwright';
import {
  activeAppView,
  closeAllCollections,
  confirmMigration,
  createCollection,
  createRequest,
  getAppWebviewHtml,
  openMigrateToYmlModalFromOverview,
  openRequest,
  saveRequest,
  setAppCode
} from '../../utils/page';

const COLLECTION_NAME = 'app-migration';
const APP_CODE = '<div id="request-app">Hello from the request app</div>';

test.describe('Migrating a collection with app code from bru to yml', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('keeps the request app enabled with its code after migration', async ({
    pageWithUserData: page,
    createTmpDir
  }) => {
    await test.step('Write app code into a bru collection', async () => {
      await createCollection(page, COLLECTION_NAME, await createTmpDir('migrate-app'), 'bru');
      await createRequest(page, 'app-req', COLLECTION_NAME, { url: 'https://example.com', method: 'GET' });
      await openRequest(page, COLLECTION_NAME, 'app-req', { persist: true });
      await setAppCode(page, APP_CODE);
      await saveRequest(page);
    });

    await test.step('Migrate the collection to yml', async () => {
      await openMigrateToYmlModalFromOverview(page, COLLECTION_NAME);
      await confirmMigration(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });

    await test.step('Reopening the request still lands in its app view, code intact', async () => {
      await openRequest(page, COLLECTION_NAME, 'app-req', { persist: true });
      await expect(activeAppView(page)).toBeVisible({ timeout: 10000 });
      expect(await getAppWebviewHtml(page)).toContain(APP_CODE);
    });
  });
});
