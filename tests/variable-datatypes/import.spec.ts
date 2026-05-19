import { test, expect, Page, Locator } from '../../playwright';
import path from 'path';
import {
  closeAllCollections,
  importCollection,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

// OpenCollection (.yml) import: typed `{type, data}` structs at every scope
// land in the env editor with the right DatatypeSelector label.

const IMPORTED_COLLECTION = 'datatypes-imported';

const VAR_TYPE_TABLE: Array<{ tableId: string; rows: Array<[string, string]> }> = [
  {
    tableId: 'request-vars-req',
    rows: [
      ['req_num', 'number'],
      ['req_bool', 'boolean'],
      ['req_obj', 'object'],
      ['req_str', 'string']
    ]
  },
  {
    tableId: 'folder-vars-req',
    rows: [
      ['fold_num', 'number'],
      ['fold_bool', 'boolean'],
      ['fold_obj', 'object'],
      ['fold_str', 'string']
    ]
  },
  {
    tableId: 'collection-vars-req',
    rows: [
      ['coll_num', 'number'],
      ['coll_bool', 'boolean'],
      ['coll_obj', 'object'],
      ['coll_str', 'string']
    ]
  }
];

const ENV_ROWS: Array<[string, string]> = [
  ['env_num', 'number'],
  ['env_bool', 'boolean'],
  ['env_obj', 'object'],
  ['env_str', 'string']
];

const tableRowByName = (table: ReturnType<ReturnType<typeof buildCommonLocators>['table']>, name: string) =>
  table.container().locator(`tbody tr[data-row-name="${name}"]`);

const expectTypeLabel = async (row: Locator, label: string) => {
  await expect(row.locator('.type-label').first()).toHaveText(label);
};

const openImportedRequest = async (page: Page) => {
  const collection = buildCommonLocators(page).sidebar.collection(IMPORTED_COLLECTION);
  await expect(collection).toBeVisible();

  // Scope to the imported collection's slug to avoid sibling-collection matches.
  const collectionSlug = IMPORTED_COLLECTION.replace(/\s+/g, '-').toLowerCase();
  const collectionScope = page.locator(`#collection-${collectionSlug}`);

  const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: 'folder' });
  if (!(await folderRow.isVisible().catch(() => false))) {
    await collection.click();
    await expect(folderRow).toBeVisible();
  }

  const requestLink = collectionScope.locator('.collection-item-name').filter({ hasText: 'request' });
  if (!(await requestLink.isVisible().catch(() => false))) {
    await folderRow.click();
    await expect(requestLink).toBeVisible();
  }

  await requestLink.click();
  await expect(buildCommonLocators(page).tabs.activeRequestTab()).toContainText('request');
};

const openVarsForTable = async (page: Page, tableId: string) => {
  const locators = buildCommonLocators(page);

  if (tableId === 'request-vars-req') {
    await openImportedRequest(page);
    await selectRequestPaneTab(page, 'Vars');
    return;
  }

  const collectionRow = locators.sidebar.collection(IMPORTED_COLLECTION);
  await expect(collectionRow).toBeVisible();
  const collectionSlug = IMPORTED_COLLECTION.replace(/\s+/g, '-').toLowerCase();
  const collectionScope = page.locator(`#collection-${collectionSlug}`);

  if (tableId === 'folder-vars-req') {
    const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: 'folder' });
    if (!(await folderRow.isVisible().catch(() => false))) {
      await collectionRow.click();
      await expect(folderRow).toBeVisible();
    }
    await folderRow.dblclick();
    await locators.paneTabs.folderSettingsTab('vars').click();
    return;
  }

  // 'collection-vars-req'
  await collectionRow.click();
  await locators.paneTabs.collectionSettingsTab('vars').click();
};

test.describe('Datatype selector — imported OpenCollection (.yml) collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('imported typed variables retain their datatype across all scopes', async ({
    page,
    createTmpDir
  }, testInfo) => {
    testInfo.setTimeout(90_000);

    const fixtureFile = path.resolve(__dirname, 'fixtures', 'import', 'datatypes-collection.yml');
    const collectionLocation = await createTmpDir('datatypes-imported');

    await importCollection(page, fixtureFile, collectionLocation, {
      expectedCollectionName: IMPORTED_COLLECTION
    });

    // Each var-table row's .type-label matches the declared datatype.
    for (const { tableId, rows } of VAR_TYPE_TABLE) {
      await openVarsForTable(page, tableId);
      const table = buildCommonLocators(page).table(tableId);
      for (const [name, label] of rows) {
        await expectTypeLabel(tableRowByName(table, name), label);
      }
    }

    // Env vars use a different component — open the env editor.
    await buildCommonLocators(page).environment.selector().click();
    await buildCommonLocators(page).environment.collectionTab().click();
    await page.getByTestId('configure-env').click();
    await expect(buildCommonLocators(page).tabs.activeRequestTab()).toContainText('Environments');

    for (const [name, label] of ENV_ROWS) {
      const row = page.locator(`[data-testid="env-var-row-${name}"]`);
      await expect(row.locator('.type-label').first()).toHaveText(label);
    }
  });
});
