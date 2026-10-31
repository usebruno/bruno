import { test, expect, Page, Locator } from '../..';
import { buildCollectionsPlusMenuLocators, openCollection } from './manage';

/**
 * Locators for the Import Collection modals and the import-issues toast.
 */
export const buildImportCollectionLocators = (page: Page) => ({
  modal: () => page.locator('[data-testid="import-collection-modal"]'),
  locationModal: () => page.locator('[data-testid="import-collection-location-modal"]'),
  locationInput: () => page.locator('#collection-location'),
  fileInput: () => page.locator('input[type="file"]'),
  advancedOptionsToggle: () => page.getByTestId('show-advanced-options-toggle'),
  preserveScriptsToggle: () => page.getByTestId('preserve-scripts-toggle'),
  bulkModal: () => page.getByTestId('bulk-import-collection-location-modal'),
  bulkFormatSelect: () => page.getByTestId('bulk-import-collection-location-modal').getByTestId('bulk-import-collection-format-selector'),
  bulkLocationInput: () => page.getByTestId('bulk-import-collection-location-modal').getByTestId('bulk-import-collection-location-input'),
  bulkSubmitButton: () => page.getByTestId('bulk-import-collection-location-modal-submit-btn'),
  envOption: (name: string) => page.locator('.dropdown-item').getByText(name, { exact: true }),
  parsingError: () => page.getByTestId('import-error-message'),
  browseLink: (root?: Locator) => (root ?? page).getByTestId('import-collection-browse-link'),
  importButton: (root?: Locator) => (root ?? page).getByTestId('import-collection-location-modal-submit-btn'),
  formatSelect: (root?: Locator) => (root ?? page).locator('#format'),
  ...(() => {
    const issuesToast = () => page.getByTestId('import-issues-toast').last();
    return {
      issuesToast,
      issuesToastTitle: () => issuesToast().getByTestId('import-issues-toast-title'),
      issuesToastCopyBtn: () => issuesToast().getByTestId('import-issues-copy-btn'),
      issuesToastReportBtn: () => issuesToast().getByTestId('import-issues-report-btn'),
      issuesToastIncludeItemsCheckbox: () => issuesToast().getByTestId('import-issues-include-items-checkbox'),
      issuesToastCloseBtn: () => issuesToast().getByTestId('import-issues-toast-close'),
      issuesToastUrlTooLongWarning: () => issuesToast().getByTestId('import-issues-url-too-long-warning')
    };
  })()
});

const buildLocators = (page: Page) => ({
  import: buildImportCollectionLocators(page),
  plusMenu: buildCollectionsPlusMenuLocators(page)
});

/**
 * Dismiss all import issues toasts (they use infinite duration and persist across tests).
 * @param page - The page object
 * @returns void
 */
export const dismissImportIssuesToasts = async (page: Page) => {
  await test.step('Dismiss import issues toasts', async () => {
    const toasts = page.getByTestId('import-issues-toast');
    while (await toasts.count() > 0) {
      const toast = toasts.first();
      await toast.getByTestId('import-issues-toast-close').click();
      await expect(toast).not.toBeVisible({ timeout: 5000 });
    }
  });
};

/**
 * Import a collection from a file
 * @param page - The page object
 * @param filePath - The path to the collection file to import
 * @param collectionLocation - The directory where the collection will be saved
 * @param options - Optional settings for import
 * @returns void
 */
export type ImportCollectionOptions = {
  expectedCollectionName?: string;
  expectIssues?: boolean;
  sidebarTimeout?: number;
  preserveScripts?: boolean;
};

export const importCollection = async (
  page: Page,
  filePath: string,
  collectionLocation: string,
  options: ImportCollectionOptions = {}
) => {
  await test.step(`Import collection from "${filePath}"`, async () => {
    const locators = buildLocators(page);

    await locators.plusMenu.button().click();
    await locators.plusMenu.importCollection().click();

    // Wait for import modal
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Set the file
    await page.setInputFiles('input[type="file"]', filePath);

    // Wait for location modal to appear
    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Verify expected collection name if provided
    if (options.expectedCollectionName) {
      await expect(locationModal.getByText(options.expectedCollectionName)).toBeVisible();
    }

    // Enable 'Preserve scripts' option via the Advanced Options toggle
    if (options.preserveScripts) {
      await locationModal.getByRole('button', { name: 'Options' }).click();
      await locators.import.advancedOptionsToggle().click();
      const preserveScriptsCheckbox = locators.import.preserveScriptsToggle();
      await preserveScriptsCheckbox.check();
      await expect(preserveScriptsCheckbox).toBeChecked();
    }

    // Set location and import
    await page.locator('#collection-location').fill(collectionLocation);
    await locationModal.getByRole('button', { name: 'Import' }).click();

    // Wait for collection to appear in sidebar
    if (options.expectedCollectionName) {
      await expect(
        page.locator('#sidebar-collection-name').filter({ hasText: options.expectedCollectionName })
      ).toBeVisible({ timeout: options.sidebarTimeout ?? 5000 });
    }

    // Wait for import issues toast if expected
    if (options.expectIssues) {
      await expect(locators.import.issuesToast()).toBeVisible({ timeout: 10000 });
    }

    if (options.expectedCollectionName) {
      await openCollection(page, options.expectedCollectionName);
    }
  });
};

/**
 * Open the Bulk Import modal by importing multiple files at once.
 * Selecting more than one file routes the import flow to the Bulk Import modal
 * (instead of the single-collection location modal).
 * @param page - The page object
 * @param filePaths - Absolute paths of the files to import (must be 2 or more)
 */
export const openBulkImportModal = async (page: Page, filePaths: string[]) => {
  await test.step('Open the Bulk Import modal', async () => {
    const locators = buildLocators(page);

    await locators.plusMenu.button().click();
    await locators.plusMenu.importCollection().click();
    await expect(locators.import.modal()).toBeVisible();

    await locators.import.fileInput().setInputFiles(filePaths);
    await expect(locators.import.bulkModal()).toBeVisible();
  });
};
