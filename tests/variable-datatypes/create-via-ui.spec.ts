import { test, expect, Page, Locator } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createFolder,
  saveRequest,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

// Build a collection from scratch via the UI, then add typed vars at every
// scope (request / folder / collection / environment) and verify the
// DataTypeSelector renders the chosen dataType. The environment scope also
// covers a typed secret variable (dataType selectable while the value masks).

const COLLECTION_NAME = 'datatypes-ui-created';
const ENV_NAME = 'test_env';

// `'string'` is the implicit default and needs no UI step.
type NonDefaultDataType = 'number' | 'boolean' | 'object';
const TYPED_DATATYPES: NonDefaultDataType[] = ['number', 'boolean', 'object'];

const VALUE_FOR_DATATYPE: Record<NonDefaultDataType, string> = {
  number: '42',
  boolean: 'true',
  object: '{"k":1}'
};

/** Address a row by name inside the table with the given testid. */
const tableRowByName = (page: Page, tableId: string, name: string) =>
  buildCommonLocators(page).table(tableId).rowByName(name);

const expectTypeLabel = async (row: Locator, label: string) => {
  await expect(buildCommonLocators(row.page()).dataTypeSelector.typeLabel(row)).toHaveText(label);
};

// Add a row to the Vars table and pick `dataType` from the DataTypeSelector.
// The last `tr` is always a stub empty row; typing the name promotes it.
const addTypedVarRow = async (
  page: Page,
  tableId: string,
  name: string,
  value: string,
  dataType: NonDefaultDataType
) => {
  await test.step(`add ${dataType} var "${name}" to ${tableId}`, async () => {
    const locators = buildCommonLocators(page);
    const tableContainer = page.getByTestId(tableId).first();
    const lastRow = tableContainer.locator('tbody tr').last();

    // Promote the empty row by filling its name first — the DataTypeSelector
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

    // Pick dataType from the selector menu.
    const typeTrigger = locators.dataTypeSelector.typeLabel(namedRow);
    await typeTrigger.click();
    const menuItem = locators.dataTypeSelector.menuItem(dataType);
    await expect(menuItem).toBeVisible();
    await menuItem.click();
    await expect(typeTrigger).toHaveText(dataType);
    // Let the dispatched Redux mutation settle before the next interaction.
    await page.waitForTimeout(200);
  });
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

// Add one row per typed dataType to `tableId`, named `<prefix>_<type>`.
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

test.describe('DataType selector — new collection created via UI', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('typed vars added via UI render correctly across request / folder / collection / environment scopes (including a secret env var)', async ({
    page,
    createTmpDir
  }, testInfo) => {
    // Long: request/folder/collection vars (3 datatypes each) + env vars
    // (3 plain + 3 secret) + collection/env setup.
    testInfo.setTimeout(150_000);

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
      await locators.request.requestNameInput().fill('request');
      await locators.request.newRequestUrl().click();
      await page.keyboard.type('http://localhost:8081/api/echo/everything');
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
    await saveRequest(page);
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
    await locators.environment.selector().click();
    await locators.environment.collectionTab().click();
    await locators.environment.createEnvButton().click();
    await locators.environment.envNameInput().fill(ENV_NAME);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.locator('.request-tab').filter({ hasText: 'Environments' })).toBeVisible();

    const envRows = locators.environment.varRows();
    // Named rows added on the currently active tab; the table always keeps one
    // trailing empty stub, so after N adds the visible row count is N + 1.
    // Variables and secrets live on separate tabs, so the count is per-tab and
    // resets when we switch tabs.
    let tabRowCount = 0;

    // Add one env var row on the active tab: fill name + value, then pick its
    // dataType. A row is a secret by virtue of being added on the Secrets tab,
    // so the caller switches tabs before adding secrets. Secrets render the
    // DataTypeSelector too.
    const addEnvVar = async (name: string, dataType: NonDefaultDataType, { secret = false } = {}) => {
      await test.step(`add ${secret ? 'secret ' : ''}${dataType} env var "${name}"`, async () => {
        const emptyRow = page.locator('tbody tr').last();
        await emptyRow.locator('input[placeholder="Name"]').fill(name);
        const namedRow = locators.environment.varRow(name);
        await expect(namedRow).toBeVisible();
        // EnvironmentVariablesTable.handleNameChange appends a trailing empty
        // row via setTimeout(0). If we click the value editor before that
        // append re-renders, focus can be dropped — wait for the new row.
        tabRowCount++;
        await expect(envRows).toHaveCount(tabRowCount + 1);

        const valueEditor = namedRow.locator('.CodeMirror').first();
        await valueEditor.click({ force: true });
        await expect(valueEditor).toHaveClass(/CodeMirror-focused/);
        await page.keyboard.insertText(VALUE_FOR_DATATYPE[dataType]);

        await locators.dataTypeSelector.typeLabel(namedRow).click();
        await locators.dataTypeSelector.menuItem(dataType).click();
        await expect(locators.dataTypeSelector.typeLabel(namedRow)).toHaveText(dataType);
        await page.waitForTimeout(200);
      });
    };

    for (const dt of TYPED_DATATYPES) {
      await addEnvVar(`env_${dt}`, dt);
    }
    // Secrets live on their own tab; switch over and add them there. The active
    // tab is now Secrets, so each new row is created as a secret automatically.
    await locators.environment.secretsTab().click();
    tabRowCount = 0;
    for (const dt of TYPED_DATATYPES) {
      await addEnvVar(`env_secret_${dt}`, dt, { secret: true });
    }

    // save-all persists both tabs at once (save-env is scoped to the active tab).
    await locators.environment.saveAll().click();
    await page.waitForTimeout(500);

    // Re-assert after save (post-formik-reset). The Secrets tab is still active,
    // so the secret rows render here; each keeps its dataType.
    for (const dt of TYPED_DATATYPES) {
      await expect(locators.dataTypeSelector.typeLabel(locators.environment.varRow(`env_secret_${dt}`))).toHaveText(dt);
    }
    // Switch back to the Variables tab to verify the non-secret rows.
    await locators.environment.variablesTab().click();
    for (const dt of TYPED_DATATYPES) {
      await expect(locators.dataTypeSelector.typeLabel(locators.environment.varRow(`env_${dt}`))).toHaveText(dt);
    }
  });
});
