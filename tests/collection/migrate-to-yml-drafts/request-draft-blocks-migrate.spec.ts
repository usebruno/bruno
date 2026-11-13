import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  fillRequestUrl,
  openMigrateToYmlModalFromPill
} from '../../utils/page';

const REQUEST_NAME = 'Untitled';
const collectionName = 'migrate-unsaved-request';

test.describe('Migrate to YML — unsaved request', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-5984 an unsaved request is not silently discarded and Migrate shows the drafts warning', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { migrateToYml, sidebar, tabs } = buildCommonLocators(page);
    const migrate = migrateToYml;

    await test.step('Create a bru collection with a saved request', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), 'bru');
      await createRequest(page, REQUEST_NAME, collectionName, { method: 'GET', url: 'http://localhost:8081/ping' });
      await sidebar.request(REQUEST_NAME).click();
    });

    await test.step('Edit the request without saving', async () => {
      await fillRequestUrl(page, '/edited');
      await tabs.tabDraftIndicator(tabs.activeRequestTab()).waitFor({ state: 'visible' });
    });

    await test.step('Open the migrate modal and click Migrate', async () => {
      await openMigrateToYmlModalFromPill(page);
      await migrateToYml.migrateButton().click();
    });

    await test.step('Hold on.. warning lists the unsaved request with Discard All, Back and Save and Migrate', async () => {
      await expect(migrateToYml.draftsStep()).toBeVisible();
      await expect(migrateToYml.draftsTitle()).toBeVisible();
      await expect(migrateToYml.draftsSummary()).toHaveText('You have unsaved changes in 1 item. Save or discard them before migrating.');
      await migrateToYml.draftsItem(`Request: ${REQUEST_NAME}.bru`).waitFor({ state: 'visible' });

      await expect(migrateToYml.draftsDiscardAll()).toBeEnabled();
      await expect(migrateToYml.draftsDiscardAll()).toHaveText('Discard All');
      await expect(migrateToYml.draftsBack()).toBeEnabled();
      await expect(migrateToYml.draftsBack()).toHaveText('Back');
      await expect(migrateToYml.draftsSaveAll()).toBeEnabled();
      await expect(migrateToYml.draftsSaveAll()).toHaveText('Save and Migrate');
    });

    await test.step('Back returns to the migrate confirmation and the request is still unsaved', async () => {
      await migrateToYml.draftsBack().click();
      await expect(migrateToYml.draftsStep()).toBeHidden();
      await migrateToYml.cancelMigrationButton().click();
      await expect(migrateToYml.modal()).toBeHidden();
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeVisible();
    });
  });
});
