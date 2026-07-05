import { test, expect } from '../../../playwright';
import * as path from 'path';
import * as fs from 'fs/promises';
import { buildCommonLocators, closeAllCollections } from '../../utils/page';

const collectFilesRecursive = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesRecursive(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
};

test.describe('Single Import - Default OpenCollection format', () => {
  const postmanFile = path.join(__dirname, 'fixtures', 'postman-v21.json');
  const collectionName = 'Postman v2.1 Collection';

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC3097: Verify default format during single collection import', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const importLocators = locators.import;
    const importLocation = await createTmpDir('single-import-default-yml');
    const locationModal = importLocators.locationModal();

    await test.step('Click on Import Collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();

      await importLocators.modal().waitFor({ state: 'visible' });
      await expect(importLocators.modalTitle()).toContainText('Import Collection');
      await expect(importLocators.fileTab()).toBeVisible();
    });

    await test.step('Select the Postman collection file', async () => {
      await expect(importLocators.fileInput()).toBeAttached();
      await importLocators.fileInput().setInputFiles(postmanFile);

      await locationModal.waitFor({ state: 'visible', timeout: 10_000 });
      await expect(locationModal.getByText(collectionName)).toBeVisible();
    });

    await test.step('Leave the format selection as default and click Import', async () => {
      await expect(locationModal.locator('#format')).toHaveCount(0);

      await importLocators.locationInput().fill(importLocation);
      await importLocators.importButton(locationModal).click();
      await locationModal.waitFor({ state: 'hidden' });

      await expect(locators.sidebar.collection(collectionName)).toBeVisible();

      const allFiles = await collectFilesRecursive(importLocation);
      const relativePaths = allFiles.map((file) => path.relative(importLocation, file));

      expect(relativePaths).toContain(path.join(collectionName, 'opencollection.yml'));

      const requestFiles = relativePaths.filter(
        (filePath) =>
          !filePath.endsWith('opencollection.yml') && !filePath.includes(`${path.sep}environments${path.sep}`)
      );
      expect(requestFiles.length).toBeGreaterThan(0);
      expect(requestFiles.every((filePath) => filePath.endsWith('.yml'))).toBe(true);
      expect(relativePaths.some((filePath) => filePath.endsWith('.bru'))).toBe(false);
    });
  }
  );
});
