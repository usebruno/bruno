import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createApp,
  createCollection,
  saveRequest

} from '../../utils/page';
import {
  addCollectionAppCodeFromEmptyState,
  openMigrateToYmlModalFromPill,
  setCollectionAppCode
} from '../../utils/page/collection/collection-app';
import { CLICK_COUNTER_APP, CLICK_COUNTER_APP_EDITED } from '../../utils/constants';

const APP_NAME = 'Demo_app';
const collectionName = 'migrate-unsaved-app';

test.describe('Migrate to YML — unsaved collection app', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-6131 an unsaved app edit routes Migrate to the drafts step with Discard All, Back and Save', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const { migrateToYml: migrate, collectionApp, tabs } = buildCommonLocators(page);

    await test.step('Create a bru collection with an empty app', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), 'bru');
      await createApp(page, APP_NAME, { collectionName });
      await expect(collectionApp.emptyStateAddCodeButton()).toBeVisible();
    });

    await test.step('Add the click-counter app code via "Add app code" and save it', async () => {
      await addCollectionAppCodeFromEmptyState(page);
      await setCollectionAppCode(page, CLICK_COUNTER_APP);
      await saveRequest(page);
    });

    await test.step('Edit the app without saving', async () => {
      await setCollectionAppCode(page, CLICK_COUNTER_APP_EDITED);
      await expect(tabs.tabDraftIndicator(tabs.activeRequestTab())).toBeVisible();
    });

    await test.step('Open the migrate modal from the "Migrate to YML" pill', async () => {
      await expect(collectionApp.pill()).toBeVisible();
      await expect(collectionApp.pill()).toContainText('Migrate to YML');
      await openMigrateToYmlModalFromPill(page);
    });

    await test.step('Migrate modal shows the collection, Export Collection, Cancel and Migrate', async () => {
      await expect(collectionApp.modalTitle()).toBeVisible();
      await expect(collectionApp.modalCollectionName(collectionName)).toBeVisible();
      await expect(migrate.exportBackupButton()).toBeVisible();
      await expect(migrate.exportBackupButton()).toHaveText('Export Collection');
      await expect(migrate.cancelMigrationButton()).toBeVisible();
      await expect(migrate.migrateButton()).toBeVisible();
      await expect(migrate.migrateButton()).toBeEnabled();
    });

    await test.step('Click Migrate', async () => {
      await migrate.migrateButton().click();
    });

    await test.step('Unsaved changes step lists the app and offers Discard All, Back and Save', async () => {
      await expect(collectionApp.draftsStep()).toBeVisible();
      await expect(collectionApp.draftsTitle()).toBeVisible();
      await expect(collectionApp.draftsSummary()).toHaveText('You have unsaved changes in 1 item. Save or discard them before migrating.');
      await expect(collectionApp.draftsItem(`App: ${APP_NAME}`)).toBeVisible();

      await expect(migrate.draftsDiscardAll()).toBeVisible();
      await expect(migrate.draftsDiscardAll()).toBeEnabled();
      await expect(migrate.draftsDiscardAll()).toHaveText('Discard All');

      await expect(migrate.draftsBack()).toBeVisible();
      await expect(migrate.draftsBack()).toBeEnabled();
      await expect(migrate.draftsBack()).toHaveText('Back');

      await expect(migrate.draftsSaveAll()).toBeVisible();
      await expect(migrate.draftsSaveAll()).toBeEnabled();
      await expect(migrate.draftsSaveAll()).toHaveText('Save and Migrate');
    });

    await test.step('Back returns to the migrate confirmation', async () => {
      await migrate.draftsBack().click();
      await expect(migrate.draftsStep()).toBeHidden();
      await expect(migrate.modal()).toBeVisible();
      await migrate.cancelMigrationButton().click();
      await expect(migrate.modal()).toBeHidden();
    });
  });
});
