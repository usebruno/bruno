import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  dismissCodeEditorHints,
  focusScriptEditor,
  hoverScriptEditorToken,
  openRequest,
  setScriptEditorContent,
  typeInScriptEditor
} from '../../utils/page';

const COLLECTION = 'script-api-docs';
const REQUEST = 'docs-probe';
const SET_ENV_VAR_SIGNATURE = 'bru.setEnvVar(key: string, value: any): void';

test.describe('Script API docs in the script editor', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('autocomplete and hover show the documented API', async ({ pageWithUserData: page }) => {
    const hints = buildCommonLocators(page).codeEditorHints;

    await test.step('Open the request\'s pre-request script', async () => {
      await page.locator('[data-app-state="loaded"]').waitFor();
      await openRequest(page, COLLECTION, REQUEST);
      await focusScriptEditor(page, 'pre-request');
    });

    await test.step('Typing a bru member lists it with its summary', async () => {
      await typeInScriptEditor(page, 'pre-request', 'bru.setEnv');
      await expect(hints.apiItemSummary('setEnvVar(key, value)')).toHaveText(
        'Set a variable of the selected environment, creating it when it doesn\'t exist.'
      );
    });

    await test.step('The highlighted hint\'s docs show beside the list', async () => {
      await expect(hints.details()).toBeVisible();
      await expect(hints.details()).toContainText(SET_ENV_VAR_SIGNATURE);
    });

    await test.step('Closing the list closes the docs', async () => {
      await dismissCodeEditorHints(page);
      await expect(hints.details()).toBeHidden();
    });

    await test.step('Hovering a call shows its docs', async () => {
      await setScriptEditorContent(page, 'pre-request', 'bru.setEnvVar(\'token\', \'abc\');');
      await hoverScriptEditorToken(page, 'pre-request', 'setEnvVar');
      await expect(hints.apiInfoTooltip()).toBeVisible();
      await expect(hints.apiInfoTooltip()).toContainText(SET_ENV_VAR_SIGNATURE);
    });
  });
});
