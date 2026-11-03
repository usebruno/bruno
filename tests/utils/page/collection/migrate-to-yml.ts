import { Locator, Page, expect, test } from '../../../../playwright';
import { buildSidebarLocators } from '../sidebar';

/**
 * Migrate-to-yml UI: the "Convert to YML" entry points, the app-level migration
 * modal (confirm view + locked progress view with a Cancel button), and the
 * "Unsaved changes" drafts-resolution step that gates migration on any collection
 * draft (request, folder, collection settings, environments, transient requests).
 */
export const buildMigrateToYmlLocators = (page: Page) => {
  const modal = () => page.getByRole('dialog').filter({ hasText: 'Migrate to YML format' });
  const draftsStep = () => page.getByTestId('migration-drafts-step');
  const draftsTransientRow = (name: string) =>
    page.locator(`[data-testid="migration-drafts-transient-row"][data-transient-name=${JSON.stringify(name)}]`);

  return {
    modal,
    migrateButton: () => modal().getByRole('button', { name: 'Migrate', exact: true }),
    cancelMigrationButton: () => modal().getByRole('button', { name: 'Cancel', exact: true }),
    exportBackupButton: () => page.getByTestId('export-collection-backup-button'),
    progress: () => page.getByTestId('migration-progress'),
    progressBar: () => page.getByTestId('migration-progress-bar'),
    progressLabel: () => page.getByTestId('migration-progress-label'),
    convertButton: () => page.getByTestId('migrate-collection-to-yml-button'),
    cancelledMessage: () => page.getByText('Migration cancelled'),
    missingRequestMessage: () => page.getByText('Request no longer exists'),
    draftsStep,
    draftsSaveAll: () => page.getByTestId('migration-drafts-save-all'),
    draftsDiscardAll: () => page.getByTestId('migration-drafts-discard-all'),
    draftsBack: () => page.getByTestId('migration-drafts-back'),
    draftsTransientRow,
    draftsTransientSave: (name: string) =>
      draftsTransientRow(name).getByTestId('migration-drafts-transient-save')
  };
};

/**
 * Opens the migration modal from the collection Overview tab. Assumes the collection
 * settings pane is reachable (collection row visible in the sidebar).
 */
export const openMigrateToYmlModalFromOverview = async (page: Page, collectionName: string) => {
  const locators = buildMigrateToYmlLocators(page);
  await buildSidebarLocators(page).collection(collectionName).click();
  await page.getByTestId('collection-settings-tab-overview').click();
  await locators.convertButton().click();
  await locators.modal().waitFor({ state: 'visible', timeout: 5000 });
};

export const openCollectionOverview = async (page: Page, collectionName: string) => {
  await buildSidebarLocators(page).collection(collectionName).click();
  await page.getByTestId('collection-settings-tab-overview').click();
};

export const confirmMigration = async (page: Page) => {
  const locators = buildMigrateToYmlLocators(page);
  await locators.migrateButton().click();
};

/**
 * Click Migrate and wait for the "Unsaved changes" drafts step to appear. Use when
 * the collection is expected to have drafts so the migrate button routes to the
 * drafts-resolution view instead of starting migration.
 */
export const openMigrateDraftsStep = async (page: Page): Promise<Locator> => {
  const locators = buildMigrateToYmlLocators(page);
  await locators.migrateButton().click();
  await expect(locators.draftsStep()).toBeVisible({ timeout: 5000 });
  return locators.draftsStep();
};

/**
 * From the drafts step, resolve every draft by clicking "Save All / Save and
 * Migrate". Waits for the drafts step to close (i.e. migration has been kicked off).
 */
export const saveAllDraftsAndMigrate = async (page: Page) => {
  await test.step('Save all drafts and migrate', async () => {
    const locators = buildMigrateToYmlLocators(page);
    await locators.draftsSaveAll().click();
    await expect(locators.draftsStep()).toBeHidden({ timeout: 10000 });
  });
};

/**
 * From the drafts step, discard every draft and continue with migration. Waits for
 * the drafts step to close.
 */
export const discardAllDraftsAndMigrate = async (page: Page) => {
  await test.step('Discard all drafts and migrate', async () => {
    const locators = buildMigrateToYmlLocators(page);
    await locators.draftsDiscardAll().click();
    await expect(locators.draftsStep()).toBeHidden({ timeout: 10000 });
  });
};

/**
 * Return to the migrate confirmation view from the drafts step.
 */
export const returnFromDraftsStep = async (page: Page) => {
  const locators = buildMigrateToYmlLocators(page);
  await locators.draftsBack().click();
  await expect(locators.draftsStep()).toBeHidden({ timeout: 5000 });
};
