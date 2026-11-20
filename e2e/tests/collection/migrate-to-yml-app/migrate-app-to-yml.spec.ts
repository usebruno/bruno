import { test, expect } from '../../../playwright';
import {
  activeAppView,
  buildCommonLocators,
  closeAllCollections,
  confirmMigration,
  createCollection,
  createRequest,
  getAppWebviewHtml,
  openMigrateToYmlModalFromOverview,
  openRequest,
  saveRequest,
  setAppCode
} from '../../../pages';

const COLLECTION_NAME = 'app-migration';
const APP_CODE = '<div id="request-app">Hello from the request app</div>';

test.describe('Migrating a collection with app code from bru to yml', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-5986: Verify after migration user is able to view app code at request level', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    createTmpDir,
    reuseOrLaunchElectronApp
  }, testInfo) => {
    const electronApp = await reuseOrLaunchElectronApp({ testFile: testInfo.file });
    const { toast } = buildCommonLocators(page);

    await test.step('Write app code into a bru collection', async () => {
      await createCollection(page, COLLECTION_NAME, await createTmpDir('migrate-app'), 'bru');
      await createRequest(page, 'app-req', COLLECTION_NAME, { url: 'http://localhost:8081/ping', method: 'GET' });
      await openRequest(page, COLLECTION_NAME, 'app-req', { persist: true });
      await setAppCode(page, APP_CODE);
      await saveRequest(page);
    });

    await test.step('Migrate the collection to yml', async () => {
      await openMigrateToYmlModalFromOverview(page, COLLECTION_NAME);
      await confirmMigration(page);
      await toast.byMessage('Collection migrated to YML format successfully').waitFor({ state: 'visible', timeout: 30000 });
    });

    await test.step('Reopen the migrated request', async () => {
      await openRequest(page, COLLECTION_NAME, 'app-req', { persist: true });
    });

    await test.step('Verify that the request still opens in its app view with its code intact', async () => {
      await expect(activeAppView(page)).toBeVisible({ timeout: 10000 });
      expect(await getAppWebviewHtml(page, electronApp)).toContain('Hello from the request app');
    });
  });
});
