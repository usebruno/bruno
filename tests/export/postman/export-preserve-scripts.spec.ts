import { test, expect, Page } from '../../../playwright';
import { closeAllCollections, openCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import * as fs from 'fs';
import * as nodePath from 'path';

const COLLECTION_NAME = 'Export Scripts Collection';

const openExportToPostmanModal = async (page: Page) => {
  const locators = buildCommonLocators(page);

  await openCollection(page, COLLECTION_NAME);

  const collectionAction = locators.actions.collectionActions(COLLECTION_NAME);
  await locators.sidebar.collection(COLLECTION_NAME).hover();
  await expect(collectionAction).toBeVisible({ timeout: 2000 });
  await collectionAction.click();
  await locators.dropdown.item('Share').click();
  await expect(locators.modal.title('Share Collection')).toBeVisible();

  await page.getByTestId('export-format-postman').click();
  await locators.modal.button('Proceed').click();
  await expect(locators.modal.title('Export to Postman')).toBeVisible();
};

// export a collection via Share -> Export to Postman into outputDir and read the file
const exportPostmanCollection = async (
  page: Page,
  outputDir: string,
  { preserveScripts }: { preserveScripts: boolean }
) => {
  const locators = buildCommonLocators(page);

  await openExportToPostmanModal(page);

  await test.step('Set the export location', async () => {
    await page.getByLabel('Location', { exact: true }).fill(outputDir);
  });

  await test.step('Configure preserve scripts', async () => {
    if (preserveScripts) {
      // 'Preserve scripts' lives under the modal footer's advanced options
      await page.getByRole('button', { name: 'Options' }).click();
      await page.getByTestId('show-advanced-options-toggle').click();
      const checkbox = page.getByTestId('preserve-scripts-toggle');
      await expect(checkbox).toBeVisible();
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
  });

  return await test.step('Export and read the written file', async () => {
    await locators.modal.button('Export').click();
    const filePath = nodePath.join(outputDir, `${COLLECTION_NAME}.json`);
    await expect.poll(() => fs.existsSync(filePath), { timeout: 5000 }).toBe(true);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });
};

const findLoginEvents = (exported: any) => {
  const login = exported.item.find((i: any) => i.name === 'Login');
  return {
    prerequest: login.event.find((e: any) => e.listen === 'prerequest'),
    test: login.event.find((e: any) => e.listen === 'test')
  };
};

test.describe('Export Postman Collection - Preserve scripts option', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('should export scripts as is when preserve scripts is enabled', async ({ pageWithUserData: page, createTmpDir }) => {
    const outputDir = await createTmpDir('postman-export');
    const exported = await exportPostmanCollection(page, outputDir, { preserveScripts: true });
    const { prerequest, test: testEvent } = findLoginEvents(exported);

    expect(prerequest.script.exec.join('\n')).toContain('bru.setEnvVar(\'token\', \'abc\')');
    expect(prerequest.script.exec.join('\n')).not.toContain('pm.');
    expect(testEvent.script.exec.join('\n')).toContain('bru.setVar(\'userId\', \'42\')');
    expect(testEvent.script.exec.join('\n')).not.toContain('pm.');
  });

  test('should translate scripts to pm.* by default when preserve scripts is disabled', async ({ pageWithUserData: page, createTmpDir }) => {
    const outputDir = await createTmpDir('postman-export');
    const exported = await exportPostmanCollection(page, outputDir, { preserveScripts: false });
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

    await openExportToPostmanModal(page);

    await test.step('Exporting over an existing file prompts to replace', async () => {
      await page.getByLabel('Location', { exact: true }).fill(outputDir);
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

    await openExportToPostmanModal(page);

    await test.step('Clearing the name and location blocks export with validation errors', async () => {
      await page.getByLabel('Name', { exact: true }).fill('');
      await locators.modal.button('Export').click();

      await expect(page.getByText('Name is required')).toBeVisible();
      await expect(page.getByText('Location is required')).toBeVisible();
      // The modal stays open and the export did not proceed
      await expect(locators.modal.title('Export to Postman')).toBeVisible();
    });

    // Close both modals to cleanup the app state for the next test
    await test.step('Close the export and share modals', async () => {
      await locators.export.postmanModal().getByTestId('modal-close-button').click();
      await expect(locators.modal.title('Export to Postman')).toBeHidden();
      await locators.modal.byTitle('Share Collection').getByTestId('modal-close-button').click();
      await expect(locators.modal.title('Share Collection')).toBeHidden();
    });
  });

  test('should let the user rename to avoid overwriting an existing file', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const outputDir = await createTmpDir('postman-export');

    // Pre-seed a conflicting file for the default (collection) name
    fs.writeFileSync(nodePath.join(outputDir, `${COLLECTION_NAME}.json`), '{"stale":true}', 'utf-8');

    await openExportToPostmanModal(page);

    await test.step('Exporting over an existing file prompts to replace', async () => {
      await page.getByLabel('Location', { exact: true }).fill(outputDir);
      await locators.modal.button('Export').click();
      await expect(page.getByText('Name already exists in this location')).toBeVisible();
      await expect(locators.modal.button('Replace')).toBeVisible();
    });

    await test.step('Renaming clears the conflict and restores Export', async () => {
      await page.getByLabel('Name', { exact: true }).fill('Renamed Export');
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
