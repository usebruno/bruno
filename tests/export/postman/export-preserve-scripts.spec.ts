import { test, expect } from '../../../playwright';
import {
  closeAllCollections,
  buildCommonLocators,
  openExportToPostmanModal,
  closeExportToPostmanModal,
  dismissModalIfOpen,
  exportCollectionToPostman
} from '../../utils/page';
import * as fs from 'fs';
import * as nodePath from 'path';

const COLLECTION_NAME = 'Export Scripts Collection';

const findLoginEvents = (exported: any) => {
  const login = exported.item.find((i: any) => i.name === 'Login');
  return {
    prerequest: login.event.find((e: any) => e.listen === 'prerequest'),
    test: login.event.find((e: any) => e.listen === 'test')
  };
};

test.describe('Export Postman Collection - Preserve scripts option', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await dismissModalIfOpen(page);
  });

  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should export scripts as is when preserve scripts is enabled', async ({ pageWithUserData: page, createTmpDir }) => {
    const outputDir = await createTmpDir('postman-export');
    const exported = await exportCollectionToPostman(page, COLLECTION_NAME, outputDir, { preserveScripts: true });
    const { prerequest, test: testEvent } = findLoginEvents(exported);

    expect(prerequest.script.exec).toEqual(['bru.setEnvVar(\'token\', \'abc\');']);
    expect(testEvent.script.exec).toEqual(['bru.setVar(\'userId\', \'42\');']);
  });

  test('should translate scripts to pm.* by default when preserve scripts is disabled', async ({ pageWithUserData: page, createTmpDir }) => {
    const outputDir = await createTmpDir('postman-export');
    const exported = await exportCollectionToPostman(page, COLLECTION_NAME, outputDir, { preserveScripts: false });
    const { prerequest } = findLoginEvents(exported);

    expect(prerequest.script.exec.join('\n')).toContain('pm.environment.set');
    expect(prerequest.script.exec.join('\n')).not.toContain('bru.setEnvVar');
  });

  test('should overwrite an existing file when Replace is confirmed', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const outputDir = await createTmpDir('postman-export');
    const filePath = nodePath.join(outputDir, `${COLLECTION_NAME}.json`);

    // Pre seed a conflicting file so the export hits the "already exists" path
    fs.writeFileSync(filePath, '{"stale":true}', 'utf-8');

    await openExportToPostmanModal(page, COLLECTION_NAME);

    await test.step('Exporting over an existing file prompts to replace', async () => {
      await locators.export.locationInput().fill(outputDir);
      await locators.modal.button('Export').click();
      await expect(page.getByText('Name already exists in this location')).toBeVisible();
      await expect(locators.modal.button('Replace')).toBeVisible();
    });

    await test.step('Confirming Replace overwrites the file', async () => {
      await locators.modal.button('Replace').click();
      // The stale sentinel is gone once the real collection is written
      await expect
        .poll(() => JSON.parse(fs.readFileSync(filePath, 'utf-8')).stale ?? false, { timeout: 5000 })
        .toBe(false);
    });

    const exported = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { prerequest } = findLoginEvents(exported);
    expect(prerequest).toBeTruthy();
  });

  test('should require a name and location before exporting', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openExportToPostmanModal(page, COLLECTION_NAME);

    await test.step('Clearing the name and location blocks export with validation errors', async () => {
      await locators.export.nameInput().fill('');
      await locators.modal.button('Export').click();

      await expect(page.getByText('Name is required')).toBeVisible();
      await expect(page.getByText('Location is required')).toBeVisible();
      // The modal stays open and the export did not proceed
      await expect(locators.modal.title('Export to Postman')).toBeVisible();
    });

    await closeExportToPostmanModal(page);
  });

  test('should block export when the name has invalid characters', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await openExportToPostmanModal(page, COLLECTION_NAME);

    await test.step('An invalid name shows a validation error and blocks export', async () => {
      await locators.export.nameInput().fill('foo/bar');
      await locators.modal.button('Export').click();

      await expect(page.getByText('Special characters aren\'t allowed in the name')).toBeVisible();
      // The modal stays open and the export did not proceed
      await expect(locators.modal.title('Export to Postman')).toBeVisible();
    });

    await closeExportToPostmanModal(page);
  });

  test('should let the user rename to avoid overwriting an existing file', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const outputDir = await createTmpDir('postman-export');

    // Pre-seed a conflicting file for the default (collection) name
    fs.writeFileSync(nodePath.join(outputDir, `${COLLECTION_NAME}.json`), '{"stale":true}', 'utf-8');

    await openExportToPostmanModal(page, COLLECTION_NAME);

    await test.step('Exporting over an existing file prompts to replace', async () => {
      await locators.export.locationInput().fill(outputDir);
      await locators.modal.button('Export').click();
      await expect(page.getByText('Name already exists in this location')).toBeVisible();
      await expect(locators.modal.button('Replace')).toBeVisible();
    });

    await test.step('Renaming clears the conflict and restores Export', async () => {
      await locators.export.nameInput().fill('Renamed Export');
      await expect(page.getByText('Name already exists in this location')).toBeHidden();
      await expect(locators.modal.button('Export')).toBeVisible();
    });

    await test.step('Export writes the new file and leaves the original untouched', async () => {
      await locators.modal.button('Export').click();
      const renamedPath = nodePath.join(outputDir, 'Renamed Export.json');
      await expect.poll(() => fs.existsSync(renamedPath), { timeout: 5000 }).toBe(true);
      // The pre-seeded file was not overwritten
      expect(JSON.parse(fs.readFileSync(nodePath.join(outputDir, `${COLLECTION_NAME}.json`), 'utf-8')).stale).toBe(true);
    });
  });
});
