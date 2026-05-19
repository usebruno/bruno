import { test, expect, Page, Locator } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

// Build a collection from scratch via the UI, then add typed vars at every
// scope (request / folder / collection / environment) and verify the
// DatatypeSelector renders the chosen datatype.

const COLLECTION_NAME = 'datatypes-ui-created';
const ENV_NAME = 'test_env';

// `'string'` is the implicit default and needs no UI step.
type NonDefaultDatatype = 'number' | 'boolean' | 'object';
const TYPED_DATATYPES: NonDefaultDatatype[] = ['number', 'boolean', 'object'];

const VALUE_FOR_DATATYPE: Record<NonDefaultDatatype, string> = {
  number: '42',
  boolean: 'true',
  object: '{"k":1}'
};

/** Address a row by name inside the table with the given testid. */
const tableRowByName = (page: Page, tableId: string, name: string) =>
  page.getByTestId(tableId).locator(`tbody tr[data-row-name="${name}"]`);

const expectTypeLabel = async (row: Locator, label: string) => {
  await expect(row.locator('.type-label').first()).toHaveText(label);
};

// Add a row to the Vars table and pick `datatype` from the DatatypeSelector.
// The last `tr` is always a stub empty row; typing the name promotes it.
const addTypedVarRow = async (
  page: Page,
  tableId: string,
  name: string,
  value: string,
  datatype: NonDefaultDatatype
) => {
  await test.step(`add ${datatype} var "${name}" to ${tableId}`, async () => {
    const tableContainer = page.getByTestId(tableId).first();
    const lastRow = tableContainer.locator('tbody tr').last();

    // Promote the empty row by filling its name first — the DatatypeSelector
    // only renders for non-empty rows.
    const nameInput = lastRow.locator('input[type="text"]').first();
    await nameInput.click();
    await page.keyboard.type(name);

    const namedRow = tableContainer.locator(`tbody tr[data-row-name="${name}"]`);
    await expect(namedRow).toBeVisible();

    // `insertText` avoids CodeMirror's auto-pair smart input on objects.
    // Wait for CodeMirror to actually take focus — otherwise the keystrokes
    // land on the still-focused name input and corrupt the row name.
    const valueEditor = namedRow.locator('[data-testid="column-value"] .CodeMirror').first();
    await valueEditor.click({ force: true });
    await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
    await page.keyboard.insertText(value);

    // Pick datatype from the selector menu.
    const typeTrigger = namedRow.locator('.type-label').first();
    await typeTrigger.click();
    const menuItem = page.locator('[role="menu"]').last().getByText(datatype, { exact: true });
    await expect(menuItem).toBeVisible();
    await menuItem.click();
    await expect(typeTrigger).toHaveText(datatype);
    // Let the dispatched Redux mutation settle before the next interaction.
    await page.waitForTimeout(200);
  });
};

const clickSaveRequest = async (page: Page) => {
  await page.locator('#request-actions').getByTitle('Save Request').click();
  await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 5000 });
};

const clickSaveFolderOrCollection = async (page: Page) => {
  // FolderSettings/CollectionSettings save via a Save button at the bottom of the Vars pane.
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await page.waitForTimeout(500);
};

const openFolderSettingsVars = async (page: Page, collectionName: string, folderName: string) => {
  const locators = buildCommonLocators(page);
  const folderRow = page.locator('.collection-item-name').filter({ hasText: folderName });
  // Expand the collection if the folder isn't visible.
  if (!(await folderRow.isVisible().catch(() => false))) {
    await locators.sidebar.collection(collectionName).click();
    await expect(folderRow).toBeVisible();
  }
  await folderRow.dblclick();
  await locators.paneTabs.folderSettingsTab('vars').click();
};

const openCollectionSettingsVars = async (page: Page, collectionName: string) => {
  await buildCommonLocators(page).sidebar.collection(collectionName).click();
  await buildCommonLocators(page).paneTabs.collectionSettingsTab('vars').click();
};

// Add one row per typed datatype to `tableId`, named `<prefix>_<type>`.
const addAllTypedVars = async (page: Page, tableId: string, prefix: string) => {
  for (const dt of TYPED_DATATYPES) {
    await addTypedVarRow(page, tableId, `${prefix}_${dt}`, VALUE_FOR_DATATYPE[dt], dt);
  }
};

const expectAllTypedVarsLabeled = async (page: Page, tableId: string, prefix: string) => {
  for (const dt of TYPED_DATATYPES) {
    await expectTypeLabel(tableRowByName(page, tableId, `${prefix}_${dt}`), dt);
  }
};

test.describe('Datatype selector — new collection created via UI', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('typed vars added via UI render correctly across request / folder / collection / environment scopes', async ({
    page,
    createTmpDir
  }, testInfo) => {
    // Long: four scopes × three datatypes + env setup.
    testInfo.setTimeout(120_000);

    const locators = buildCommonLocators(page);
    await createCollection(page, COLLECTION_NAME, await createTmpDir(COLLECTION_NAME));
    await createFolder(page, 'folder', COLLECTION_NAME);

    // Create the request inside the folder. We don't use the shared
    // `createRequest({ inFolder: true })` helper because its verification
    // requires the folder to be pre-expanded.
    await test.step('Create request inside folder', async () => {
      await locators.sidebar.folder('folder').hover();
      await locators.actions.collectionItemActions('folder').click();
      await locators.dropdown.item('New Request').click();
      await page.getByPlaceholder('Request Name').fill('request');
      await page.locator('#new-request-url .CodeMirror').click();
      await page.keyboard.type('https://httpbin.org/anything');
      await locators.modal.button('Create').click();

      // Expand the folder (clicking the collection would collapse it instead).
      const folderRow = locators.sidebar.folder('folder');
      const folderRequest = locators.sidebar.folderRequest('folder', 'request');
      if (!(await folderRequest.isVisible().catch(() => false))) {
        await folderRow.click();
        await expect(folderRequest).toBeVisible();
      }
      await folderRequest.click();
      await expect(locators.tabs.activeRequestTab()).toContainText('request');
    });

    // --- Request vars ----------------------------------------------------
    await selectRequestPaneTab(page, 'Vars');
    await addAllTypedVars(page, 'request-vars-req', 'req');
    await clickSaveRequest(page);
    await expectAllTypedVarsLabeled(page, 'request-vars-req', 'req');

    // --- Folder vars (Folder Settings) -----------------------------------
    await openFolderSettingsVars(page, COLLECTION_NAME, 'folder');
    await addAllTypedVars(page, 'folder-vars-req', 'fold');
    await clickSaveFolderOrCollection(page);
    await expectAllTypedVarsLabeled(page, 'folder-vars-req', 'fold');

    // --- Collection vars (Collection Settings) ---------------------------
    await openCollectionSettingsVars(page, COLLECTION_NAME);
    await addAllTypedVars(page, 'collection-vars-req', 'coll');
    await clickSaveFolderOrCollection(page);
    await expectAllTypedVarsLabeled(page, 'collection-vars-req', 'coll');

    // --- Collection environment vars (different table component) --------
    await buildCommonLocators(page).environment.selector().click();
    await buildCommonLocators(page).environment.collectionTab().click();
    await page.locator('button[id="create-env"]').click();
    await page.locator('input[name="name"]').fill(ENV_NAME);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible();

    for (let i = 0; i < TYPED_DATATYPES.length; i++) {
      const dt = TYPED_DATATYPES[i];
      const name = `env_${dt}`;

      await test.step(`add ${dt} env var "${name}"`, async () => {
        const emptyRow = page.locator('tbody tr').last();
        await emptyRow.locator('input[placeholder="Name"]').fill(name);
        const namedRow = page.locator(`[data-testid="env-var-row-${name}"]`);
        await expect(namedRow).toBeVisible();

        const valueEditor = namedRow.locator('.CodeMirror').first();
        await valueEditor.click({ force: true });
        await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
        await page.keyboard.insertText(VALUE_FOR_DATATYPE[dt]);

        await namedRow.locator('.type-label').first().click();
        await page.locator('[role="menu"]').last().getByText(dt, { exact: true }).click();
        await expect(namedRow.locator('.type-label').first()).toHaveText(dt);
        await page.waitForTimeout(200);
      });
    }

    await page.getByTestId('save-env').click();
    await page.waitForTimeout(500);

    // Re-assert after save (post-formik-reset).
    for (const dt of TYPED_DATATYPES) {
      const savedRow = page.locator(`[data-testid="env-var-row-env_${dt}"]`);
      await expect(savedRow.locator('.type-label').first()).toHaveText(dt);
    }
  });
});
