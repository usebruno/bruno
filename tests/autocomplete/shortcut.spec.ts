import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestBodyMode,
  selectRequestPaneTab,
  buildCommonLocators
} from '../utils/page';
import { buildRequestLocators } from '../utils/request';
import {
  buildAutocompleteLocators,
  pressAutocompleteShortcut,
  readEditorValue
} from '../utils/page/autocomplete';

test.describe('Variable autocomplete — Ctrl+Space shortcut', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('opens autocomplete using shortcut in code editor and in Vars field', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'autocomplete-shortcut-surfaces';
    const requestName = 'shortcut-request';

    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, requestName, collectionName, { url: 'https://example.com/api' });
    await openRequest(page, collectionName, requestName);

    const { table } = buildCommonLocators(page);
    const request = buildRequestLocators(page);
    const { widget, variableItems } = buildAutocompleteLocators(page);

    await test.step('Request body (JSON code editor)', async () => {
      await selectRequestBodyMode(page, 'JSON');
      const editor = request.bodyEditor().locator('.CodeMirror').first();
      await editor.click();
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();
      await expect(variableItems().first()).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('Pre Request Vars — value', async () => {
      await selectRequestPaneTab(page, 'Vars');
      const row = table('request-vars-req').row(0);
      const valueEditor = table('request-vars-req').rowValueEditor(row);
      await valueEditor.click();
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();
      await expect(variableItems().first()).toBeVisible();
      await page.keyboard.press('Escape');
    });
  });

  test('pressing the shortcut twice on an empty field does not add a second `{{`', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'autocomplete-shortcut-no-stack-empty';
    const requestName = 'shortcut-request';

    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, requestName, collectionName, { url: 'https://example.com/api' });
    await openRequest(page, collectionName, requestName);
    await selectRequestPaneTab(page, 'Vars');

    const { table } = buildCommonLocators(page);
    const { widget, variableItems } = buildAutocompleteLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);

    await valueEditor.click();

    await pressAutocompleteShortcut(page);
    expect(await readEditorValue(valueEditor)).toBe('{{');

    await pressAutocompleteShortcut(page);
    // content is '{{' and autocomplete list is visible again.
    expect(await readEditorValue(valueEditor)).toBe('{{');
    await expect(widget()).toBeVisible();
    await expect(variableItems().first()).toBeVisible();
  });

  test('pressing the shortcut on a field with an existing `{` opens directly, without inserting another brace', async ({
    page,
    createTmpDir
  }) => {
    const collectionName = 'autocomplete-shortcut-existing-brace';
    const requestName = 'shortcut-request';

    await createCollection(page, collectionName, await createTmpDir());
    await createRequest(page, requestName, collectionName, { url: 'https://example.com/api' });
    await openRequest(page, collectionName, requestName);
    await selectRequestPaneTab(page, 'Vars');

    const { table } = buildCommonLocators(page);
    const { widget, variableItems } = buildAutocompleteLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);

    await valueEditor.click();
    await page.keyboard.type('{');
    await expect(widget()).toHaveCount(0);
    const valueBeforeShortcut = await readEditorValue(valueEditor);

    await pressAutocompleteShortcut(page);

    await expect(widget()).toBeVisible();
    await expect(variableItems().first()).toBeVisible();
    expect(await readEditorValue(valueEditor)).toBe(valueBeforeShortcut);

    await pressAutocompleteShortcut(page);
    expect(await readEditorValue(valueEditor)).toBe(valueBeforeShortcut);
  });
});
