import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  buildCommonLocators,
  closeAllCollections,
  dismissVarTooltip,
  openRequest,
  openUrlVarTooltip
} from '../../utils/page';

test.describe('Edit variable - first edit with Enter', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-2491 saves and persists the variable value edit when Enter is pressed', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const { varInfoPopup } = buildCommonLocators(page);
    const requestName = 'edit-variable-value';
    const requestPath = path.join(collectionFixturePath!, `${requestName}.yml`);
    const updatedValue = 'updated-value';

    await openRequest(page, 'request-vars', requestName);

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
      await expect.poll(async () => {
        const savedRequest = yaml.load(await fs.promises.readFile(requestPath, 'utf8')) as {
          runtime?: { variables?: { name: string; value?: string }[] };
        };
        return savedRequest.runtime?.variables?.find((variable) => variable.name === 'editVar')?.value;
      }).toBe(updatedValue);
    });

    await test.step('Reopened tooltip shows the updated value', async () => {
      await dismissVarTooltip(page);
      await expect(popup).toBeHidden();
      const reopenedPopup = await openUrlVarTooltip(page, 'editVar', 'valid');
      await expect(varInfoPopup.editableValue(reopenedPopup)).toHaveText(updatedValue);
    });
  });
});
