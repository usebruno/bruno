import { test, expect, Locator } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  buildCommonLocators
} from '../utils/page';
import {
  buildAutocompleteLocators,
  pressAutocompleteShortcut,
  readEditorValue,
  setEditorState,
  pickHint
} from '../utils/page/autocomplete';

test.describe('Variable autocomplete — insertion correctness', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('completing a partial name already inside `{{...}}` does not duplicate the closing braces', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'autocomplete-insertion-partial', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-insertion-partial', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-insertion-partial', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await valueEditor.click();

    await setEditorState(valueEditor, '{{$gui}}', 6);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await pickHint(page, '$guid');
    expect(await readEditorValue(valueEditor)).toBe('{{$guid}}');
  });

  test('picking from a `{` always lands as exactly `{{name}}`, with or without an auto-closed `}`', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'autocomplete-insertion-lone-brace', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-insertion-lone-brace', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-insertion-lone-brace', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await test.step('no auto-closed brace: `{` with nothing after the cursor', async () => {
      await valueEditor.click();
      await setEditorState(valueEditor, '{', 1);
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      expect(await readEditorValue(valueEditor)).toBe('{{$guid}}');
    });

    await test.step('with an auto-closed brace already present: `{}` with the cursor between them', async () => {
      await valueEditor.click();
      await setEditorState(valueEditor, '{}', 1);
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      expect(await readEditorValue(valueEditor)).toBe('{{$guid}}');
    });
  });

  test('fresh insertion and an already-open `{{}}` both land as exactly `{{name}}`', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'autocomplete-insertion-shortcut-paths', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-insertion-shortcut-paths', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-insertion-shortcut-paths', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await test.step('shortcut inserts `{{` when field is empty', async () => {
      await valueEditor.click();
      await pressAutocompleteShortcut(page);
      expect(await readEditorValue(valueEditor)).toBe('{{');
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      expect(await readEditorValue(valueEditor)).toBe('{{$guid}}');
    });

    await test.step('existing context: an already-open `{{` (empty word) from a repeat press', async () => {
      await valueEditor.click();
      await setEditorState(valueEditor, '{{', 2);
      await pressAutocompleteShortcut(page);
      // Still just `{{` -- the existing-context branch must not insert another pair.
      expect(await readEditorValue(valueEditor)).toBe('{{');
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      expect(await readEditorValue(valueEditor)).toBe('{{$guid}}');
    });
  });
});

test.describe('Variable autocomplete dropdown interaction', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Escape closes the dropdown without changing the field value', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-esc', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-esc', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-esc', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(widget()).toHaveCount(0);
    expect(await readEditorValue(valueEditor)).toBe('{');
  });

  test('losing focus closes the dropdown', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-blur', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-blur', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-blur', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    // Move focus elsewhere in the app
    await buildCommonLocators(page).request.urlInput().click();
    await page.waitForTimeout(300);
    await expect(widget()).toHaveCount(0);
  });

  test('arrow keys move the active hint one at a time and wrap at the ends', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-arrows', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-arrows', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-arrows', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget, variableItems, activeItem } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    const count = await variableItems().count();
    expect(count).toBeGreaterThan(1);

    const nameOf = (item: Locator) => item.locator('.CodeMirror-hint-variable-name').innerText();

    // Starts on the first hint in the list.
    expect(await nameOf(activeItem().first())).toBe(await nameOf(variableItems().nth(0)));

    await page.keyboard.press('ArrowDown');
    expect(await nameOf(activeItem().first())).toBe(await nameOf(variableItems().nth(1)));

    await page.keyboard.press('ArrowUp');
    expect(await nameOf(activeItem().first())).toBe(await nameOf(variableItems().nth(0)));

    // ArrowUp from the first hint wraps around to the last one.
    await page.keyboard.press('ArrowUp');
    expect(await nameOf(activeItem().first())).toBe(await nameOf(variableItems().nth(count - 1)));
  });

  test('Enter picks the currently active hint, same as a click would', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-enter', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-enter', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-enter', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const row = buildCommonLocators(page).table('request-vars-req').row(0);
    const valueEditor = buildCommonLocators(page).table('request-vars-req').rowValueEditor(row);
    const { widget, activeItem } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const activeName = await activeItem().first().locator('.CodeMirror-hint-variable-name').innerText();

    await page.keyboard.press('Enter');
    await expect(widget()).toHaveCount(0);
    expect(await readEditorValue(valueEditor)).toBe(`{{${activeName}}}`);
  });
});
