import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection, selectScriptSubTab } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-scripts.json');

test.describe('Import Postman Collection with preserve scripts option enabled', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should hide the preserve scripts toggle until the Advanced section is expanded', async ({ page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Open import modal and upload the Postman collection', async () => {
      await locators.plusMenu.button().click();
      await locators.plusMenu.importCollection().click();
      await locators.import.fileInput().setInputFiles(postmanFile);
      await locators.import.locationModal().waitFor({ state: 'visible', timeout: 10000 });
    });

    await test.step('Preserve scripts is hidden until the Advanced section is expanded', async () => {
      await expect(locators.import.preserveScriptsToggle()).toBeHidden();

      await locators.import.advancedSectionToggle().click();
      await expect(locators.import.preserveScriptsToggle()).toBeVisible();
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
