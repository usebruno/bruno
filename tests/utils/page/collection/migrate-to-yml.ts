import { Page } from '../../../../playwright';
import { buildSidebarLocators } from '../sidebar';

/**
 * Migrate-to-yml UI: the "Convert to YML" entry points and the app-level migration
 * modal (confirm view + locked progress view with a Cancel button).
 */
export const buildMigrateToYmlLocators = (page: Page) => {
  const modal = () => page.getByRole('dialog').filter({ hasText: 'Migrate to YML format' });

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
    missingRequestMessage: () => page.getByText('Request no longer exists')
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
