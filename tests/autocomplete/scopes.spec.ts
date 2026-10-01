import { test, expect, Page } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  createRequest,
  openFolderRequest,
  selectRequestPaneTab,
  saveRequest,
  openCollectionSettings,
  selectCollectionPaneTab,
  openFolderSettings,
  createEnvironment,
  addEnvironmentVariables,
  saveEnvironment,
  buildCommonLocators
} from '../utils/page';
import { buildAutocompleteLocators, pressAutocompleteShortcut, setEditorState } from '../utils/page/autocomplete';

const VAR_NAME = 'shadowvar';

/** Save the Vars pane in Folder Settings / Collection Settings (shared "Save" button). */
const saveVarsPane = async (page: Page) => {
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await page.waitForTimeout(500);
};

/** Set the URL bar to `{{shadowvar` and reopen the autocomplete dropdown via the shortcut. */
const reopenOnUrlBar = async (page: Page) => {
  const urlEditor = buildCommonLocators(page).request.urlInput();
  const { widget } = buildAutocompleteLocators(page);
  await urlEditor.click();
  await setEditorState(urlEditor, 'https://example.com/api?x={{shadowvar', 37);
  await pressAutocompleteShortcut(page);
  await expect(widget()).toBeVisible();
};

/** Assert the dropdown shows exactly one `shadowvar` entry, tagged with `scope`'s icon. */
const expectSingleWinningEntry = async (page: Page, scope: string) => {
  const { itemByName } = buildAutocompleteLocators(page);
  const matches = itemByName(VAR_NAME);
  await expect(matches).toHaveCount(1);
  await expect(matches.first().locator('.CodeMirror-hint-variable-icon')).toHaveClass(new RegExp(`CodeMirror-hint-variable-icon-${scope}\\b`));
  await page.keyboard.press('Escape');
};

test.describe('Variable autocomplete — scopes and shadowing', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('a name shadowed across scopes shows one entry, always tagged with the winning (most specific) scope', async ({
    page,
    createTmpDir
  }) => {
    const COLLECTION_NAME = 'autocomplete-scopes-shadow';
    const FOLDER_NAME = 'folder';
    const REQUEST_NAME = 'req';

    await createCollection(page, COLLECTION_NAME, await createTmpDir());
    await createFolder(page, FOLDER_NAME, COLLECTION_NAME);
    await buildCommonLocators(page).sidebar.folder(FOLDER_NAME).dblclick(); // expand so items render
    await createRequest(page, REQUEST_NAME, FOLDER_NAME, { inFolder: true, url: 'https://example.com/api' });

    await test.step('collection scope wins when it is the only one defining the name', async () => {
      await openCollectionSettings(page, COLLECTION_NAME);
      await selectCollectionPaneTab(page, 'vars');

      const { table } = buildCommonLocators(page);
      const row = table('collection-vars-req').row(0);
      await table('collection-vars-req').rowNameInput(row).click();
      await page.keyboard.type(VAR_NAME);
      await table('collection-vars-req').rowValueEditor(row).click();
      await page.keyboard.type('from-collection');
      await saveVarsPane(page);

      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await reopenOnUrlBar(page);
      await expectSingleWinningEntry(page, 'collection');
    });

    await test.step('environment scope overrides collection', async () => {
      await createEnvironment(page, 'shadow-env');
      await addEnvironmentVariables(page, [{ name: VAR_NAME, value: 'from-environment' }]);
      await saveEnvironment(page);

      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await reopenOnUrlBar(page);
      await expectSingleWinningEntry(page, 'environment');
    });

    await test.step('folder scope overrides environment', async () => {
      await openFolderSettings(page, COLLECTION_NAME, FOLDER_NAME);
      await buildCommonLocators(page).paneTabs.folderSettingsTab('vars').click();

      const { table } = buildCommonLocators(page);
      const row = table('folder-vars-req').row(0);
      await table('folder-vars-req').rowNameInput(row).click();
      await page.keyboard.type(VAR_NAME);
      await table('folder-vars-req').rowValueEditor(row).click();
      await page.keyboard.type('from-folder');
      await saveVarsPane(page);

      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await reopenOnUrlBar(page);
      await expectSingleWinningEntry(page, 'folder');
    });

    await test.step('request scope overrides folder', async () => {
      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await selectRequestPaneTab(page, 'Vars');

      const { table } = buildCommonLocators(page);
      const row = table('request-vars-req').row(0);
      await table('request-vars-req').rowNameInput(row).click();
      await page.keyboard.type(VAR_NAME);
      await table('request-vars-req').rowValueEditor(row).click();
      await page.keyboard.type('from-request');
      await saveRequest(page);

      await reopenOnUrlBar(page);
      await expectSingleWinningEntry(page, 'request');
    });
  });

  test('distinct variable names in different scopes each get their own entry with the right scope icon', async ({
    page,
    createTmpDir
  }) => {
    const COLLECTION_NAME = 'autocomplete-scopes-distinct';
    const FOLDER_NAME = 'folder';
    const REQUEST_NAME = 'req';

    await createCollection(page, COLLECTION_NAME, await createTmpDir());
    await createFolder(page, FOLDER_NAME, COLLECTION_NAME);
    await buildCommonLocators(page).sidebar.folder(FOLDER_NAME).dblclick(); // expand so items render
    await createRequest(page, REQUEST_NAME, FOLDER_NAME, { inFolder: true, url: 'https://example.com/api' });

    await test.step('define one uniquely-named variable per scope', async () => {
      const { table } = buildCommonLocators(page);

      await openCollectionSettings(page, COLLECTION_NAME);
      await selectCollectionPaneTab(page, 'vars');
      const collRow = table('collection-vars-req').row(0);
      await table('collection-vars-req').rowNameInput(collRow).click();
      await page.keyboard.type('collscope');
      await table('collection-vars-req').rowValueEditor(collRow).click();
      await page.keyboard.type('coll-value');
      await saveVarsPane(page);

      await createEnvironment(page, 'distinct-env');
      await addEnvironmentVariables(page, [{ name: 'envscope', value: 'env-value' }]);
      await saveEnvironment(page);

      await openFolderSettings(page, COLLECTION_NAME, FOLDER_NAME);
      await buildCommonLocators(page).paneTabs.folderSettingsTab('vars').click();
      const folderRow = table('folder-vars-req').row(0);
      await table('folder-vars-req').rowNameInput(folderRow).click();
      await page.keyboard.type('folderscope');
      await table('folder-vars-req').rowValueEditor(folderRow).click();
      await page.keyboard.type('folder-value');
      await saveVarsPane(page);

      await openFolderRequest(page, COLLECTION_NAME, FOLDER_NAME, REQUEST_NAME);
      await selectRequestPaneTab(page, 'Vars');
      const reqRow = table('request-vars-req').row(0);
      await table('request-vars-req').rowNameInput(reqRow).click();
      await page.keyboard.type('reqscope');
      await table('request-vars-req').rowValueEditor(reqRow).click();
      await page.keyboard.type('req-value');
      await saveRequest(page);
    });

    await test.step('each name shows exactly once, tagged with its own scope', async () => {
      const urlEditor = buildCommonLocators(page).request.urlInput();
      const { widget, itemByName } = buildAutocompleteLocators(page);

      await urlEditor.click();
      await setEditorState(urlEditor, 'https://example.com/api?x={{scope', 33);
      await pressAutocompleteShortcut(page);
      await expect(widget()).toBeVisible();

      const expected: Array<[string, string]> = [
        ['collscope', 'collection'],
        ['envscope', 'environment'],
        ['folderscope', 'folder'],
        ['reqscope', 'request']
      ];

      for (const [name, scope] of expected) {
        const matches = itemByName(name);
        await expect(matches).toHaveCount(1);
        await expect(matches.first().locator('.CodeMirror-hint-variable-icon')).toHaveClass(new RegExp(`CodeMirror-hint-variable-icon-${scope}\\b`));
      }
    });
  });
});
