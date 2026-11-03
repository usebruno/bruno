import fs from 'fs';
import path from 'path';
import { test, expect, Locator, Page } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  selectRequestPaneTab,
  selectAuthMode,
  buildCommonLocators
} from '../utils/page';
import {
  authFieldEditor,
  buildAutocompleteLocators,
  expectAutocompleteStaysClosed,
  maskedCharacters,
  pasteIntoEditor,
  pressAutocompleteShortcut,
  readEditorValue,
  setEditorState,
  pickHint,
  firstRenderedLine
} from '../utils/page/autocomplete';

const expectFullyMasked = async (editor: Locator, realValue: string) => {
  await expect(maskedCharacters(editor)).toHaveCount(realValue.length);
  if (realValue.length > 0) {
    await expect(firstRenderedLine(editor)).not.toContainText(realValue);
  }
};

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

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await valueEditor.click();

    await setEditorState(valueEditor, '{{$gui}}', 6);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await pickHint(page, '$guid');
    await expect.poll(() => readEditorValue(valueEditor)).toBe('{{$guid}}');
  });

  test('picking from a `{` always lands as exactly `{{name}}`, with or without an auto-closed `}`', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'autocomplete-insertion-lone-brace', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-insertion-lone-brace', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-insertion-lone-brace', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await test.step('no auto-closed brace: `{` with nothing after the cursor', async () => {
      await valueEditor.click();
      await setEditorState(valueEditor, '{', 1);
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      await expect.poll(() => readEditorValue(valueEditor)).toBe('{{$guid}}');
    });

    await test.step('with an auto-closed brace already present: `{}` with the cursor between them', async () => {
      await valueEditor.click();
      await setEditorState(valueEditor, '{}', 1);
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      await expect.poll(() => readEditorValue(valueEditor)).toBe('{{$guid}}');
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

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await test.step('shortcut inserts `{{` when field is empty', async () => {
      await valueEditor.click();
      await pressAutocompleteShortcut(page);
      await expect.poll(() => readEditorValue(valueEditor)).toBe('{{');
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      await expect.poll(() => readEditorValue(valueEditor)).toBe('{{$guid}}');
    });

    await test.step('existing context: an already-open `{{` (empty word) from a repeat press', async () => {
      await valueEditor.click();
      await setEditorState(valueEditor, '{{', 2);
      await pressAutocompleteShortcut(page);
      // Still just `{{` -- the existing-context branch must not insert another pair.
      await expect.poll(() => readEditorValue(valueEditor)).toBe('{{');
      await expect(widget()).toBeVisible();

      await pickHint(page, '$guid');
      await expect.poll(() => readEditorValue(valueEditor)).toBe('{{$guid}}');
    });
  });

  const PATH_SEGMENTS_COLLECTION = 'autocomplete-path-segments';
  const PATH_SEGMENTS_BASE_URL = 'https://example.com/api?x=';
  const PATH_SEGMENTS_VARIABLE = 'PATH_SEGMENT_TOKEN';

  /** Opens a request whose collection has a `.env` file, so `process.env.*` names are offered. */
  const openRequestWithDotEnv = async (page: Page, collectionsDir: string) => {
    await createCollection(page, PATH_SEGMENTS_COLLECTION, collectionsDir);
    // process.env.* names come from the collection's .env file
    fs.writeFileSync(path.join(collectionsDir, PATH_SEGMENTS_COLLECTION, '.env'), `${PATH_SEGMENTS_VARIABLE}=value\n`);

    await createRequest(page, 'segments-request', PATH_SEGMENTS_COLLECTION, { url: PATH_SEGMENTS_BASE_URL });
    await openRequest(page, PATH_SEGMENTS_COLLECTION, 'segments-request');

    const { itemByName } = buildAutocompleteLocators(page);
    const urlEditor = buildCommonLocators(page).request.urlInput();
    return {
      urlEditor,
      urlValue: () => readEditorValue(urlEditor),
      processHint: () => itemByName('process', { exact: true }).first(),
      envHint: () => itemByName('env', { exact: true }).first(),
      variableHint: () => itemByName(PATH_SEGMENTS_VARIABLE, { exact: true }).first()
    };
  };

  test('accepting `process` and `env` adds the dot and reopens the list, until the final name closes it', async ({
    page,
    createTmpDir
  }) => {
    const { urlEditor, urlValue, processHint, envHint, variableHint } = await openRequestWithDotEnv(
      page,
      await createTmpDir()
    );

    await test.step('typing `{{pro` offers the first segment, `process`', async () => {
      // The .env is loaded by a file watcher, and hints are only computed on a keystroke.
      // Retype until its names are available, rather than relying on a single early attempt.
      await expect(async () => {
        await setEditorState(urlEditor, PATH_SEGMENTS_BASE_URL, PATH_SEGMENTS_BASE_URL.length);
        await page.keyboard.type('{{pro');
        await expect(processHint()).toBeVisible({ timeout: 1000 });
      }).toPass();
    });

    await test.step('accepting `process` with Enter adds the dot and reopens the list with `env`', async () => {
      await page.keyboard.press('Enter');

      await expect.poll(urlValue).toBe(`${PATH_SEGMENTS_BASE_URL}{{process.`);
      await expect(envHint()).toBeVisible();
    });

    await test.step('accepting `env` with a click adds the dot and reopens the list with the variable', async () => {
      await pickHint(page, 'env', { exact: true });

      await expect.poll(urlValue).toBe(`${PATH_SEGMENTS_BASE_URL}{{process.env.`);
      await expect(variableHint()).toBeVisible();
    });

    await test.step('accepting the final name closes the braces and the list stays closed', async () => {
      await pickHint(page, PATH_SEGMENTS_VARIABLE, { exact: true });

      await expect.poll(urlValue).toBe(`${PATH_SEGMENTS_BASE_URL}{{process.env.${PATH_SEGMENTS_VARIABLE}}}`);
      await expectAutocompleteStaysClosed(page);
    });
  });

  test('the same drill-down works from a list opened by a single `{`', async ({ page, createTmpDir }) => {
    const { urlEditor, urlValue, processHint, envHint, variableHint } = await openRequestWithDotEnv(
      page,
      await createTmpDir()
    );

    await test.step('typing a single `{` lists `process`', async () => {
      await expect(async () => {
        await setEditorState(urlEditor, PATH_SEGMENTS_BASE_URL, PATH_SEGMENTS_BASE_URL.length);
        await page.keyboard.type('{');
        await expect(processHint()).toBeVisible({ timeout: 1000 });
      }).toPass();
    });

    await test.step('accepting `process` turns the `{` into `{{process.` and reopens the list with `env`', async () => {
      await pickHint(page, 'process', { exact: true });

      await expect.poll(urlValue).toBe(`${PATH_SEGMENTS_BASE_URL}{{process.`);
      await expect(envHint()).toBeVisible();
    });

    await test.step('accepting `env` and then the variable closes the braces', async () => {
      await pickHint(page, 'env', { exact: true });
      await expect.poll(urlValue).toBe(`${PATH_SEGMENTS_BASE_URL}{{process.env.`);
      await expect(variableHint()).toBeVisible();

      await pickHint(page, PATH_SEGMENTS_VARIABLE, { exact: true });
      await expect.poll(urlValue).toBe(`${PATH_SEGMENTS_BASE_URL}{{process.env.${PATH_SEGMENTS_VARIABLE}}}`);
      await expectAutocompleteStaysClosed(page);
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

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(widget()).toHaveCount(0);
    await expect.poll(() => readEditorValue(valueEditor)).toBe('{');
  });

  test('losing focus closes the dropdown', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-blur', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-blur', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-blur', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    // Move focus elsewhere in the app
    await buildCommonLocators(page).request.urlInput().click();
    await expect(widget()).toHaveCount(0);
  });

  test('arrow keys move the active hint one at a time and wrap at the ends', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-arrows', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-arrows', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-arrows', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget, variableItems, activeItem } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    const count = await variableItems().count();
    expect(count).toBeGreaterThan(1);

    const nameOf = (item: Locator) => item.getByTestId('autocomplete-variable-name').innerText();

    // Starts on the first hint in the list.
    const expectActiveToBe = async (index: number) => {
      const expectedName = await nameOf(variableItems().nth(index));
      await expect.poll(() => nameOf(activeItem().first())).toBe(expectedName);
    };

    await expectActiveToBe(0);

    await page.keyboard.press('ArrowDown');
    await expectActiveToBe(1);

    await page.keyboard.press('ArrowUp');
    await expectActiveToBe(0);

    // ArrowUp from the first hint wraps around to the last one.
    await page.keyboard.press('ArrowUp');
    await expectActiveToBe(count - 1);
  });

  test('Enter picks the currently active hint, same as a click would', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-dropdown-enter', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-dropdown-enter', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-dropdown-enter', 'req');
    await selectRequestPaneTab(page, 'Vars');

    const { table } = buildCommonLocators(page);
    const row = table('request-vars-req').row(0);
    const valueEditor = table('request-vars-req').rowValueEditor(row);
    const { widget, activeItem } = buildAutocompleteLocators(page);

    await valueEditor.click();
    await setEditorState(valueEditor, '{', 1);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    const activeName = await activeItem().first().getByTestId('autocomplete-variable-name').innerText();

    await page.keyboard.press('Enter');
    await expect(widget()).toHaveCount(0);
    await expect.poll(() => readEditorValue(valueEditor)).toBe(`{{${activeName}}}`);
  });
});

test.describe('Variable autocomplete — masked fields', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('picking a variable via autocomplete into a masked field renders it masked immediately (regression for the masking-on-pick bug)', async ({
    page,
    createTmpDir
  }) => {
    await createCollection(page, 'autocomplete-masked-pick', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-masked-pick', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-masked-pick', 'req');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, 'Bearer Token');

    const tokenEditor = authFieldEditor(page, 'Token');
    const { widget } = buildAutocompleteLocators(page);

    await tokenEditor.click();
    await setEditorState(tokenEditor, '{{$gui}}', 6);
    await pressAutocompleteShortcut(page);
    await expect(widget()).toBeVisible();

    await pickHint(page, '$guid');

    await expect.poll(() => readEditorValue(tokenEditor)).toBe('{{$guid}}');
    await expectFullyMasked(tokenEditor, '{{$guid}}');
  });

  test('pasting a variable reference into a masked field renders it masked', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-masked-paste', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-masked-paste', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-masked-paste', 'req');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, 'Bearer Token');

    const tokenEditor = authFieldEditor(page, 'Token');
    const pastedValue = '{{$guid}}';

    await tokenEditor.click();
    await pasteIntoEditor(tokenEditor, pastedValue);

    await expect.poll(() => readEditorValue(tokenEditor)).toBe(pastedValue);
    await expectFullyMasked(tokenEditor, pastedValue);
  });

  test('undoing an edit in a masked field re-masks the restored content', async ({ page, createTmpDir }) => {
    await createCollection(page, 'autocomplete-masked-undo', await createTmpDir());
    await createRequest(page, 'req', 'autocomplete-masked-undo', { url: 'https://example.com/api' });
    await openRequest(page, 'autocomplete-masked-undo', 'req');
    await selectRequestPaneTab(page, 'Auth');
    await selectAuthMode(page, 'Bearer Token');

    const tokenEditor = authFieldEditor(page, 'Token');
    const baseValue = 'basevalue';

    await tokenEditor.click();
    await setEditorState(tokenEditor, baseValue, baseValue.length);
    await expectFullyMasked(tokenEditor, baseValue);

    await page.keyboard.press('End');
    await page.keyboard.type('X');
    await expect.poll(() => readEditorValue(tokenEditor)).toBe('basevalueX');
    await expectFullyMasked(tokenEditor, 'basevalueX');

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+Z`);

    await expect.poll(() => readEditorValue(tokenEditor)).toBe(baseValue);
    await expectFullyMasked(tokenEditor, baseValue);
  });
});
