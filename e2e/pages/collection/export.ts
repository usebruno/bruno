import {
  test,
  expect,
  Page,
  ElectronApplication
} from '../../playwright';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { buildItemActionLocators } from '../sidebar/item-actions';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { buildModalLocators } from '../shared-ui/modal';
import { buildSidebarLocators } from '../sidebar/collection-tree';
import { openCollection } from './manage';

/**
 * Locators for the Share / Export collection modals.
 */
export const buildExportCollectionLocators = (page: Page) => ({
  postmanModal: () => page.getByTestId('export-to-postman-modal'),
  exportTab: () => page.getByTestId('share-collection-tab-export'),
  postmanFormatCard: () => page.getByTestId('export-format-postman'),
  yamlFormatCard: () => page.getByTestId('export-format-yaml'),
  nameInput: () => page.getByLabel('Name', { exact: true }),
  locationInput: () => page.getByLabel('Location', { exact: true }),
  optionsButton: () => page.getByRole('button', { name: 'Options' }),
  advancedOptionsToggle: () => page.getByTestId('show-advanced-options-toggle'),
  preserveScriptsToggle: () => page.getByTestId('preserve-scripts-toggle')
});

const buildLocators = (page: Page) => ({
  actions: buildItemActionLocators(page),
  dropdown: buildDropdownLocators(page),
  export: buildExportCollectionLocators(page),
  modal: buildModalLocators(page),
  sidebar: buildSidebarLocators(page)
});

export const openShareCollectionModal = async (page: Page, collectionName: string) => {
  await test.step(`Open Share Collection for "${collectionName}"`, async () => {
    const locators = buildLocators(page);

    await openCollection(page, collectionName);

    const collectionAction = locators.actions.collectionActions(collectionName);
    await locators.sidebar.collection(collectionName).hover();
    await expect(collectionAction).toBeVisible({ timeout: 2000 });
    await collectionAction.click();
    await locators.dropdown.item('Share').click();
    await expect(locators.modal.title('Share Collection')).toBeVisible();
  });
};

export const openExportToPostmanModal = async (page: Page, collectionName: string) => {
  await test.step(`Open Export to Postman for "${collectionName}"`, async () => {
    const locators = buildLocators(page);

    await openShareCollectionModal(page, collectionName);

    // In enterprise version, the export tab is visible, so need to click it to proceed.
    const exportTab = locators.export.exportTab();
    if (await exportTab.isVisible()) {
      await exportTab.click();
    }

    await locators.export.postmanFormatCard().click();
    await locators.modal.button('Proceed').click();
    await expect(locators.modal.title('Export to Postman')).toBeVisible();
  });
};

export const closeExportToPostmanModal = async (page: Page) => {
  await test.step('Close the export modal', async () => {
    const locators = buildLocators(page);

    await locators.export.postmanModal().getByTestId('modal-close-button').click();
    await expect(locators.modal.title('Export to Postman')).toBeHidden();
    await expect(locators.modal.title('Share Collection')).toBeHidden();
  });
};

export const exportCollectionToPostman = async (
  page: Page,
  collectionName: string,
  outputDir: string,
  { preserveScripts = false }: { preserveScripts?: boolean } = {}
) => {
  const locators = buildLocators(page);

  await openExportToPostmanModal(page, collectionName);

  await test.step('Set the export location', async () => {
    await locators.export.locationInput().fill(outputDir);
  });

  await test.step('Configure preserve scripts', async () => {
    if (preserveScripts) {
      await locators.export.optionsButton().click();
      await locators.export.advancedOptionsToggle().click();
      const checkbox = locators.export.preserveScriptsToggle();
      await expect(checkbox).toBeVisible();
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
  });

  return await test.step('Export and read the written file', async () => {
    await locators.modal.button('Export').click();
    const filePath = path.join(outputDir, `${collectionName}.json`);
    await expect.poll(() => fs.existsSync(filePath), { timeout: 5000 }).toBe(true);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });
};

export const exportCollectionAsSingleYaml = async (
  page: Page,
  electronApp: ElectronApplication,
  collectionName: string,
  outputDir: string
) => {
  const filePath = path.join(outputDir, `${collectionName}.yml`);
  const locators = buildLocators(page);

  // FileSaver.saveAs triggers Electron's will-download event;
  // set the save path to the temp directory to avoid the system save dialog.
  await electronApp.evaluate(({ session }, savePath) => {
    session.defaultSession.once('will-download', (_event, item) => {
      item.setSavePath(savePath);
    });
  }, filePath);

  await openShareCollectionModal(page, collectionName);

  // In enterprise version, the export tab is visible, so need to click it to proceed.
  const exportTab = locators.export.exportTab();
  if (await exportTab.isVisible()) {
    await exportTab.click();
  }

  await locators.export.yamlFormatCard().click();
  await locators.modal.button('Proceed').click();
  await expect.poll(() => fs.existsSync(filePath)).toBe(true);
  return fs.readFileSync(filePath, 'utf8');
};

export const exportCollectionAsZip = async (
  page: Page,
  electronApp: ElectronApplication,
  collectionName: string,
  outputDir: string
) => {
  const zipPath = path.join(outputDir, `${collectionName}.zip`);

  await electronApp.evaluate(({ dialog }, filePath) => {
    (dialog as any).__savedShowSaveDialog = dialog.showSaveDialog;
    dialog.showSaveDialog = async () => ({ filePath, canceled: false });
  }, zipPath);

  try {
    await openShareCollectionModal(page, collectionName);

    return await test.step('Export as ZIP and read the written entries', async () => {
      const locators = buildLocators(page);
      // In enterprise version, the export tab is visible, so need to click it to proceed.
      const exportTab = locators.export.exportTab();
      if (await exportTab.isVisible()) {
        await exportTab.click();
      }
      await locators.modal.button('Proceed').click();
      await expect(locators.modal.title('Share Collection')).toBeHidden();
      await expect.poll(() => fs.existsSync(zipPath), { timeout: 10000 }).toBe(true);
      return new AdmZip(zipPath).getEntries().map((entry) => entry.entryName);
    });
  } finally {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showSaveDialog = (dialog as any).__savedShowSaveDialog;
      delete (dialog as any).__savedShowSaveDialog;
    });
  }
};
