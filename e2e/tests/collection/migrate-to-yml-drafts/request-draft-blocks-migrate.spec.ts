import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  cancelMigrationFromDraftsStep,
  confirmMigration,
  fillRequestUrl,
  openMigrateToYmlModalFromPill,
  openRequest
} from '../../../pages';

const COLLECTION_NAME = 'migrate-unsaved-request';
const REQUEST_NAME = 'Untitled';

test.describe('Migrate to YML — unsaved request', () => {
  test('TC-5984: Verify unsaved request is not silently discarded during migration', { tag: '@sanity' }, async ({ pageWithUserData: page }) => {
    const { migrateToYml, tabs, request } = buildCommonLocators(page);

    await test.step('Open the request and edit it without saving', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await fillRequestUrl(page, '/edited');
      await tabs.tabDraftIndicator(tabs.activeRequestTab()).waitFor({ state: 'visible' });
    });

    await test.step('Open Migrate to YML from the pill and click Migrate', async () => {
      await openMigrateToYmlModalFromPill(page);
      await confirmMigration(page);
    });

    await test.step('Verify that the Hold on.. warning lists the unsaved request with Discard All, Back and Save and Migrate', async () => {
      await expect(migrateToYml.draftsTitle()).toHaveText('Hold on..');
      await expect(migrateToYml.draftsSummary()).toHaveText('You have unsaved changes in 1 item. Save or discard them before migrating.');
      await expect(migrateToYml.draftsItems()).toHaveText([`• Request: ${REQUEST_NAME}.bru`]);

      await expect(migrateToYml.draftsDiscardAll()).toBeVisible();
      await expect(migrateToYml.draftsDiscardAll()).toBeEnabled();
      await expect(migrateToYml.draftsDiscardAll()).toHaveText('Discard All');

      await expect(migrateToYml.draftsBack()).toBeVisible();
      await expect(migrateToYml.draftsBack()).toBeEnabled();
      await expect(migrateToYml.draftsBack()).toHaveText('Back');

      await expect(migrateToYml.draftsSaveAll()).toBeVisible();
      await expect(migrateToYml.draftsSaveAll()).toBeEnabled();
      await expect(migrateToYml.draftsSaveAll()).toHaveText('Save and Migrate');
    });

    await test.step('Go back from the warning and cancel the migration', async () => {
      await cancelMigrationFromDraftsStep(page);
    });

    await test.step('Verify that the collection was not migrated and the Untitled request still has its unsaved edit', async () => {
      await expect(migrateToYml.pill()).toBeVisible();
      await expect(tabs.activeRequestTabLabel()).toContainText(REQUEST_NAME);
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeVisible();
      await expect(request.urlLine().first()).toContainText('/edited');
    });
  });
});
