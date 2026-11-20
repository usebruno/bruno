import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  openCollectionSettings,
  selectCollectionPaneTab
} from '../../../pages';
import { addCollectionVar, buildCollectionSettingsVarsLocators } from '../../../pages/collection/settings-vars';

test.describe('Collection Vars pre-request and post-response tables', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-2634: Verify the pre-request table has Name and Value columns', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'collection-pre-req-vars';
    const { sidebar, toast } = buildCommonLocators(page);
    const collectionSettingsVars = buildCollectionSettingsVarsLocators(page);

    await test.step('Create a collection and verify the pre-request and post-response tables are visible', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'vars');

      await expect(collectionSettingsVars.panel()).toBeVisible();
      await expect(collectionSettingsVars.preRequestTable()).toBeVisible();
    });

    await test.step('Verify that the pre-request table has Name and Value columns', async () => {
      await expect(collectionSettingsVars.preRequestTitle()).toBeVisible();
      await expect(collectionSettingsVars.nameColumnHeader('preRequest')).toBeVisible();
      await expect(collectionSettingsVars.valueColumnHeader('preRequest')).toBeVisible();
    });

    await test.step('Verify that a pre-request variable can be entered and saved', async () => {
      await addCollectionVar(page, 'preRequest', 'token', 'abc');
      await expect(collectionSettingsVars.row('preRequest', 'token')).toBeVisible();
      await expect(collectionSettingsVars.nameInput('preRequest', 'token')).toHaveValue('token');
      await expect(collectionSettingsVars.valueText('preRequest', 'token')).toHaveText('abc');
      await expect(collectionSettingsVars.rowCheckbox('preRequest', 'token')).toBeVisible();
      await expect(collectionSettingsVars.rowCheckbox('preRequest', 'token')).toBeChecked();
      await collectionSettingsVars.saveButton().click();
      await expect(toast.byMessage('Collection Settings saved successfully')).toBeVisible();
    });
  });

  test('TC-2635: Verify Post response Table has Name and Expression option in the table', { tag: '@sanity' }, async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'collection-vars-post';
    const { sidebar, toast } = buildCommonLocators(page);
    const collectionSettingsVars = buildCollectionSettingsVarsLocators(page);

    await test.step('Create a collection and open the Vars tab', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName), 'yml');
      await expect(sidebar.collection(collectionName)).toBeVisible();
      await openCollectionSettings(page, collectionName);
      await selectCollectionPaneTab(page, 'vars');

      await expect(collectionSettingsVars.panel()).toBeVisible();
      await expect(collectionSettingsVars.postResponseTable()).toBeVisible();
    });

    await test.step('Verify that the post-response table has Name and Expression columns', async () => {
      await expect(collectionSettingsVars.postResponseTitle()).toBeVisible();
      await expect(collectionSettingsVars.nameColumnHeader('postResponse')).toBeVisible();
      await expect(collectionSettingsVars.expressionColumnHeader('postResponse')).toBeVisible();
    });

    await test.step('Verify that a post-response variable can be entered and saved', async () => {
      await addCollectionVar(page, 'postResponse', 'token', 'abc');
      await expect(collectionSettingsVars.row('postResponse', 'token')).toBeVisible();
      await expect(collectionSettingsVars.nameInput('postResponse', 'token')).toHaveValue('token');
      await expect(collectionSettingsVars.valueText('postResponse', 'token')).toHaveText('abc');
      await expect(collectionSettingsVars.rowCheckbox('postResponse', 'token')).toBeVisible();
      await expect(collectionSettingsVars.rowCheckbox('postResponse', 'token')).toBeChecked();
      await collectionSettingsVars.saveButton().click();
      await expect(toast.byMessage('Collection Settings saved successfully')).toBeVisible();
    });
  });
});
