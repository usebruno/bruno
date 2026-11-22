import { test, expect } from '../../../playwright';
import * as path from 'path';
import {
  closeAllCollections,
  importCollection,
  selectScriptSubTab,
  sendRequest,
  buildCommonLocators
} from '../../../pages';
import { selectImportFiles } from '../../../pages/open-collection-modal/import-page';

const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-scripts.json');

test.describe('Import Postman Collection with preserve scripts option enabled', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-4474: Verify Preserve scripts checkbox is visible under Advanced Options with default OFF on Import Collection', { tag: '@sanity' }, async ({ page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Select the Postman collection on the Import page', async () => {
      await selectImportFiles(page, [postmanFile]);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Preserve scripts is hidden until the Advanced section is expanded', async () => {
      await expect(locators.import.preserveScriptsToggle()).toBeHidden();

      await locators.import.advancedSectionToggle().click();
      await expect(locators.import.preserveScriptsToggle()).toBeVisible();
    });

    await test.step('Preserve scripts defaults to off and can be checked', async () => {
      await expect(locators.import.preserveScriptsToggle()).not.toBeChecked();
      await locators.import.preserveScriptsToggle().click();
      await expect(locators.import.preserveScriptsToggle()).toBeChecked();
    });

    await test.step('Close the import modal', async () => {
      await locators.modal.closeButton().click();
      await expect(locators.import.locationModal()).toBeHidden();
    });
  });

  test('TC-4476: should preserve pm.* scripts as is when the option is enabled', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
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

  test('TC-4475:should translate pm.* scripts to bru.* by default when the option is disabled', { tag: '@sanity' }, async ({ page, createTmpDir }) => {
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
    await sendRequest(page, 200);
  });
});
