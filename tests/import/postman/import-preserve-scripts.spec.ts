import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection, selectScriptSubTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-scripts.json');

test.describe('Import Postman Collection with preserve scripts option enabled', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should hide the preserve scripts checkbox until advanced options is shown', async ({ page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open import modal and upload the Postman collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Checkbox is hidden until Advanced Options is shown', async () => {
      await expect(page.getByTestId('preserve-scripts-toggle')).toHaveCount(0);
    });

    await test.step('Advanced Options toggle reveals the Preserve scripts checkbox', async () => {
      const locationModal = locators.import.locationModal();
      await locationModal.getByRole('button', { name: 'Options' }).click();
      await page.getByTestId('show-advanced-options-toggle').click();
      await expect(page.getByTestId('preserve-scripts-toggle')).toBeVisible();
    });

    await test.step('Close the import modal', async () => {
      await locators.modal.closeButton().click();
      await expect(locators.import.locationModal()).toBeHidden();
    });
  });

  test('should preserve pm.* scripts as is when the option is enabled', async ({ page, createTmpDir }) => {
    const importDir = await createTmpDir('preserve-scripts-on');
    const locators = buildCommonLocators(page);

    await importCollection(page, postmanFile, importDir, {
      expectedCollectionName: 'Scripts Collection',
      preserveScripts: true
    });

    await test.step('Open the imported request', async () => {
      await locators.sidebar.request('Login').click();
      await expect(locators.request.pane()).toBeVisible();
    });

    await test.step('Pre-request script keeps pm.* untranslated', async () => {
      await selectScriptSubTab(page, 'pre-request');
      const editor = locators.codeMirror.byTestId('pre-request-script-editor');
      await expect(editor).toContainText('pm.environment.set(\'token\', \'abc\');');
      await expect(editor).not.toContainText('bru.');
    });

    await test.step('Post-response script keeps pm.* untranslated', async () => {
      await selectScriptSubTab(page, 'post-response');
      const editor = locators.codeMirror.byTestId('post-response-script-editor');
      await expect(editor).toContainText('pm.test(');
      await expect(editor).toContainText('pm.response.to.have.status(200)');
      await expect(editor).not.toContainText('expect(res.getStatus())');
    });
  });

  test('should translate pm.* scripts to bru.* by default when the option is disabled', async ({ page, createTmpDir }) => {
    const importDir = await createTmpDir('preserve-scripts-off');
    const locators = buildCommonLocators(page);

    await importCollection(page, postmanFile, importDir, {
      expectedCollectionName: 'Scripts Collection'
    });

    await test.step('Open the imported request', async () => {
      await locators.sidebar.request('Login').click();
      await expect(locators.request.pane()).toBeVisible();
    });

    await test.step('Pre-request script is translated to bru.*', async () => {
      await selectScriptSubTab(page, 'pre-request');
      const editor = locators.codeMirror.byTestId('pre-request-script-editor');
      await expect(editor).toContainText('bru.setEnvVar(\'token\', \'abc\')');
      await expect(editor).not.toContainText('pm.environment.set');
    });

    await test.step('Post-response script is translated to bru.* / expect', async () => {
      await selectScriptSubTab(page, 'post-response');
      const editor = locators.codeMirror.byTestId('post-response-script-editor');
      await expect(editor).toContainText('expect(res.getStatus()).to.equal(200)');
      await expect(editor).not.toContainText('pm.response.to.have.status');
    });
  });
});
