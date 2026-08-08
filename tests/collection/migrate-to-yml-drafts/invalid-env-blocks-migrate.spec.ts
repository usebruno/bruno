import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  createEnvironment,
  addEnvironmentVariable,
  openMigrateToYmlModalFromOverview,
  openMigrateDraftsStep,
  discardAllDraftsAndMigrate
} from '../../utils/page';

test.describe('Migrate to YML — invalid environment draft blocks migrate', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('Save All surfaces the invalid-name error and keeps the drafts step; Discard All then unblocks migrate', async ({ page, createTmpDir }) => {
    const loc = buildCommonLocators(page);
    const migrate = loc.migrateToYml;
    const parentDir = await createTmpDir('migrate-drafts-invalid-env');
    const collectionName = 'migrate-drafts-invalid-env';
    const invalidVarName = 'bad name!';

    await createCollection(page, collectionName, parentDir, 'bru');
    await createRequest(page, 'req', collectionName, { method: 'GET', url: 'http://localhost:8081/ping' });

    await test.step('Leave an environment draft with an invalid variable name', async () => {
      await createEnvironment(page, 'MigrateEnv', 'collection');
      await addEnvironmentVariable(page, { name: invalidVarName, value: 'v1' });
      const envTab = page.locator('.request-tab').filter({ hasText: 'Environments' });
      await expect(loc.tabs.tabDraftIndicator(envTab)).toBeVisible({ timeout: 5000 });
    });

    await openMigrateToYmlModalFromOverview(page, collectionName);
    await openMigrateDraftsStep(page);

    await test.step('Save All shows the invalid-name toast and keeps the drafts step open', async () => {
      await migrate.draftsSaveAll().click();
      await expect(loc.toast.byMessage(/invalid variable name/i)).toBeVisible({ timeout: 10000 });
      await expect(migrate.draftsStep()).toBeVisible();
    });

    await test.step('Discard All resolves the draft and lets migration complete', async () => {
      await discardAllDraftsAndMigrate(page);
      await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({ timeout: 30000 });
    });
  });
});
