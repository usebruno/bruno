import * as fs from 'fs';
import * as path from 'path';
import { test, Page } from '../../playwright';
import { buildOpenCollectionModalLocators, showOpenCollectionModal } from './shell';

export const buildImportPageLocators = (page: Page) => ({
  textInput: () => page.getByTestId('import-page-text'),
  loadButton: () => page.getByTestId('import-page-load'),
  hint: () => page.getByTestId('import-page-hint'),
  dropZone: () => page.getByTestId('import-page-drop-zone'),
  selectFilesLink: () => page.getByTestId('import-page-select-files'),
  fileInput: () => page.getByTestId('import-page-file-input')
});

export const selectImportFiles = async (page: Page, filePaths: string[]) => {
  await test.step(`Select "${filePaths.map((filePath) => path.basename(filePath)).join('", "')}" on the Import page`, async () => {
    await showOpenCollectionModal(page, 'import');
    await buildImportPageLocators(page).fileInput().setInputFiles(filePaths);
  });
};

export const loadImportText = async (page: Page, text: string) => {
  await test.step('Load a URL on the Import page', async () => {
    const importPage = buildImportPageLocators(page);
    await showOpenCollectionModal(page, 'import');
    await importPage.textInput().fill(text);
    await importPage.loadButton().click();
  });
};

export const selectImportFilesWithFileChooser = async (page: Page, filePaths: string[]) => {
  await test.step(`Select "${filePaths.map((filePath) => path.basename(filePath)).join('", "')}" in the file chooser of the Import page`, async () => {
    await showOpenCollectionModal(page, 'import');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await buildImportPageLocators(page).selectFilesLink().click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePaths);
  });
};

export const dropImportFiles = async (page: Page, filePaths: string[]) => {
  await test.step(`Drop "${filePaths.map((filePath) => path.basename(filePath)).join('", "')}" on the Open collection modal`, async () => {
    const files = filePaths.map((filePath) => ({ name: path.basename(filePath), base64: fs.readFileSync(filePath).toString('base64') }));
    const dataTransfer = await page.evaluateHandle((droppedFiles) => {
      const transfer = new DataTransfer();
      droppedFiles.forEach(({ name, base64 }) => {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        transfer.items.add(new File([bytes], name));
      });
      return transfer;
    }, files);
    await buildOpenCollectionModalLocators(page).root().dispatchEvent('drop', { dataTransfer });
    await dataTransfer.dispose();
  });
};
