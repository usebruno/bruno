import * as fs from 'fs';
import * as path from 'path';
import { test, Page } from '../../playwright';
import { buildOpenCollectionModalLocators, showOpenCollectionModal } from './shell';

export const buildImportPageLocators = (page: Page) => ({
  textInput: () => page.getByTestId('import-page-text'),
  loadingSpinner: () => page.getByTestId('import-page-loading'),
  enterHint: () => page.getByTestId('import-page-enter-hint'),
  zipWarning: () => page.getByTestId('import-page-zip-warning'),
  dropZone: () => page.getByTestId('import-page-drop-zone'),
  selectFilesLink: () => page.getByTestId('import-page-select-files'),
  shortcut: () => page.getByTestId('import-page-drop-zone-shortcut'),
  fileInput: () => page.getByTestId('import-page-file-input'),
  docsLink: () => page.getByTestId('import-page-docs-link')
});

export const selectImportFiles = async (page: Page, filePaths: string[]) => {
  await test.step(`Select "${filePaths.map((filePath) => path.basename(filePath)).join('", "')}" on the Import page`, async () => {
    await showOpenCollectionModal(page, 'import');
    await buildImportPageLocators(page).fileInput().setInputFiles(filePaths);
  });
};

export const loadImportText = async (page: Page, text: string) => {
  await test.step('Enter a URL or text on the Import page and press Enter', async () => {
    const importPage = buildImportPageLocators(page);
    await showOpenCollectionModal(page, 'import');
    await importPage.textInput().fill(text);
    await importPage.textInput().press('Enter');
  });
};

export const pasteImportText = async (page: Page, text: string) => {
  await test.step('Paste a URL or text on the Import page', async () => {
    await showOpenCollectionModal(page, 'import');
    await buildImportPageLocators(page).textInput().evaluate((input, value) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', value);
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
    }, text);
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
