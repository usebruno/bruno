/// <reference path="../../../packages/bruno-filestore/src/types/bruno-lang.d.ts" />
import { test, expect } from '../../../playwright';
import * as fs from 'fs';
import * as path from 'path';
import { bruToJsonV2 } from '@usebruno/lang';
import { initBruCollection, writeBruRequest } from '../../utils/fixtures/bru-collection';
import {
  buildCommonLocators,
  closeAllCollections,
  dismissVarTooltip,
  openCollection,
  openCollectionFromDialog,
  openUrlVarTooltip
} from '../../utils/page';

test.describe('Edit variable - first edit with Enter', () => {
  test.beforeAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      (global as any).__origShowOpenDialog = dialog.showOpenDialog;
    });
  });

  test.afterAll(async ({ electronApp }) => {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showOpenDialog = (global as any).__origShowOpenDialog;
    });
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('TC-2461 saves and persists the variable value edit when Enter is pressed', { tag: '@sanity' }, async ({
    page,
    electronApp,
    createTmpDir
  }) => {
    const { sidebar, varInfoPopup } = buildCommonLocators(page);
    const collectionDir = await createTmpDir('first-edit-enter-save');
    const requestName = 'First Edit Request';
    const requestPath = path.join(collectionDir, `${requestName}.bru`);
    const updatedValue = 'updated-value';

    await test.step('Create the collection and open the request', async () => {
      initBruCollection(collectionDir, 'First Edit Collection');
      writeBruRequest(collectionDir, requestName, { seq: 1, url: 'https://example.com?key={{editVar}}' });
      fs.appendFileSync(requestPath, '\nvars:pre-request {\n  editVar: initial-value\n}\n');
      await openCollectionFromDialog(page, electronApp, collectionDir);
      await openCollection(page, 'First Edit Collection');
      await sidebar.request(requestName).click();
    });

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
        const savedRequest = bruToJsonV2(await fs.promises.readFile(requestPath, 'utf8')) as {
          vars?: { req?: { name: string; value?: string }[] };
        };
        return savedRequest.vars?.req?.find((variable) => variable.name === 'editVar')?.value;
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
