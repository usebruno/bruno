import { Page } from '../../../../playwright';

/**
 * Migrate-to-yml UI: the "Convert to YML" entry points and the app-level migration
 * modal (confirm view + locked progress view with a Cancel button).
 */
export const buildMigrateToYmlLocators = (page: Page) => {
  const modal = () => page.locator('.bruno-modal').filter({ hasText: 'Migrate to YML format' });

  return {
    modal,
    migrateButton: () => modal().getByRole('button', { name: 'Migrate', exact: true }),
    cancelMigrationButton: () => modal().getByRole('button', { name: 'Cancel', exact: true }),
    exportBackupButton: () => page.getByTestId('export-collection-backup-button'),
    progress: () => page.getByTestId('migration-progress'),
    progressBar: () => page.getByTestId('migration-progress-bar'),
    progressLabel: () => page.getByTestId('migration-progress-label'),
    convertButton: () => page.getByTestId('migrate-collection-to-yml-button'),
    pill: () => page.getByTestId('migrate-yml-pill'),
    pillDismiss: () => page.getByTestId('migrate-yml-pill-dismiss')
  };
};

/**
 * Opens the migration modal from the collection Overview tab. Assumes the collection
 * settings pane is reachable (collection row visible in the sidebar).
 */
export const openMigrateToYmlModalFromOverview = async (page: Page, collectionName: string) => {
  const locators = buildMigrateToYmlLocators(page);
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  await page.getByTestId('collection-settings-tab-overview').click();
  await locators.convertButton().click();
  await locators.modal().waitFor({ state: 'visible', timeout: 5000 });
};

export const confirmMigration = async (page: Page) => {
  const locators = buildMigrateToYmlLocators(page);
  await locators.migrateButton().click();
};
