import * as path from 'path';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  dismissVarTooltip,
  openRequest,
  openUrlVarTooltip,
  readEditorValue,
  selectRequestPaneTab
} from '../../utils/page';
import { readSavedRequestVar } from './helpers';

test.describe('Request variable value edit', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-2491: saves and persists the variable value edit when Enter is pressed', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const collectionName = 'request-vars';
    const requestName = 'edit-variable-value';
    const { table, varInfoPopup } = buildCommonLocators(page);
    const requestPath = path.join(collectionFixturePath!, `${requestName}.yml`);
    const updatedValue = 'updated-value';

    await openRequest(page, collectionName, requestName);

    const popup = await openUrlVarTooltip(page, 'editVar', 'valid');
    await test.step('Edit the variable value and press Enter', async () => {
      await expect(varInfoPopup.editableValue(popup)).toHaveText('initial-value');
      await varInfoPopup.editableValue(popup).click();
      await expect(varInfoPopup.editor(popup)).toBeVisible();
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.type(updatedValue);
      await page.keyboard.press('Enter');
    });

    await test.step('Saved value is updated in the tooltip and the request file', async () => {
      await expect(varInfoPopup.editor(popup)).toBeHidden();
      await expect(varInfoPopup.editableValue(popup)).toHaveText(updatedValue);
      await expect.poll(() => readSavedRequestVar(requestPath, 'editVar')).toBe(updatedValue);
    });

    await test.step('Reopened tooltip shows the updated value', async () => {
      await dismissVarTooltip(page);
      await expect(popup).toBeHidden();
      const reopenedPopup = await openUrlVarTooltip(page, 'editVar', 'valid');
      await expect(varInfoPopup.editableValue(reopenedPopup)).toHaveText(updatedValue);
    });

    await test.step('Vars tab row shows the updated value', async () => {
      await dismissVarTooltip(page);
      await selectRequestPaneTab(page, 'Vars');
      const preRequestVars = table('request-vars-req');
      const row = preRequestVars.rowByName('editVar');
      await expect.poll(() => readEditorValue(preRequestVars.rowValueEditor(row))).toBe(updatedValue);
    });
  });
});
