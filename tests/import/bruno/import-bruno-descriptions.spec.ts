import { test, expect, Page, Locator } from '../../../playwright';
import path from 'path';
import {
  closeAllCollections,
  expandFolder,
  importCollection,
  selectRequestPaneTab
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

type DescriptionRow = {
  singleLine?: string;
  multiLine?: [string, string];
  empty?: boolean;
};

const expectDescriptionCell = async (descCell: Locator, expected: DescriptionRow) => {
  const cm = descCell.getByTestId('column-description').locator('.CodeMirror');
  if (expected.empty) {
    await expect(cm.locator('.CodeMirror-line').first()).toHaveText('');
    return;
  }
  if (expected.singleLine) {
    await expect(cm.locator('.CodeMirror-line').first()).toHaveText(expected.singleLine);
    return;
  }
  if (expected.multiLine) {
    await expect(cm.locator('.CodeMirror-line').nth(0)).toHaveText(expected.multiLine[0]);
    await expect(cm.locator('.CodeMirror-line').nth(1)).toHaveText(expected.multiLine[1]);
  }
};

const expectVarDescriptionCell = async (row: Locator, expected: DescriptionRow) => {
  const cm = row.locator('.CodeMirror').nth(1);
  if (expected.empty) {
    await expect(cm.locator('.CodeMirror-line').first()).toHaveText('');
    return;
  }
  if (expected.singleLine) {
    await expect(cm.locator('.CodeMirror-line').first()).toHaveText(expected.singleLine);
    return;
  }
  if (expected.multiLine) {
    await expect(cm.locator('.CodeMirror-line').nth(0)).toHaveText(expected.multiLine[0]);
    await expect(cm.locator('.CodeMirror-line').nth(1)).toHaveText(expected.multiLine[1]);
  }
};

const openImportedRequest = async (page: Page, collectionName: string, requestName = 'request') => {
  const locators = buildCommonLocators(page);
  const collectionScope = locators.sidebar.collectionScope(collectionName);
  const collectionRow = locators.sidebar.collection(collectionName);
  await expect(collectionRow).toBeVisible();

  const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: 'folder' });
  if (!(await folderRow.isVisible().catch(() => false))) {
    await collectionRow.click();
    await expect(folderRow).toBeVisible();
  }

  await expandFolder(page, 'folder');

  const requestLink = collectionScope
    .getByTestId('sidebar-collection-item-row')
    .filter({ has: page.getByText(requestName, { exact: true }) });
  await expect(requestLink).toBeVisible();

  await requestLink.click();
  await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
};

const openCollectionSettings = async (page: Page, collectionName: string) => {
  await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();
};

const openFolderSettings = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  const collectionScope = locators.sidebar.collectionScope(collectionName);
  const collectionRow = locators.sidebar.collection(collectionName);
  await expect(collectionRow).toBeVisible();

  const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: 'folder' });
  if (!(await folderRow.isVisible().catch(() => false))) {
    await collectionRow.click();
    await expect(folderRow).toBeVisible();
  }

  await folderRow.dblclick();
  await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'folder' })).toBeVisible();
};

const openEnvironmentConfigure = async (page: Page, collectionName: string, envName: string) => {
  const locators = buildCommonLocators(page);
  await locators.sidebar.collection(collectionName).click();
  await locators.environment.currentEnvironment().click();
  await expect(locators.environment.envOption(envName)).toBeVisible();
  await locators.environment.envOption(envName).click();
  await expect(locators.environment.currentEnvironment().filter({ hasText: envName })).toBeVisible();
  await locators.environment.currentEnvironment().click();
  await expect(locators.dropdown.item('Configure')).toBeVisible();
  await locators.dropdown.item('Configure').click();
  await expect(locators.tabs.requestTab('Environments')).toBeVisible();
};

const assertRequestDescriptions = async (page: Page, collectionName: string) => {
  await openImportedRequest(page, collectionName, 'request');

  await selectRequestPaneTab(page, 'Headers');
  const headerRows = page.getByTestId('request-headers-table').locator('tbody tr');
  await expectDescriptionCell(headerRows.nth(0), { singleLine: 'Single-line header desc' });
  await expectDescriptionCell(headerRows.nth(1), { multiLine: ['Header line one', 'Header line two'] });
  await expectDescriptionCell(headerRows.nth(2), { empty: true });

  await selectRequestPaneTab(page, 'Params');
  const paramRows = page.getByTestId('query-params-table').locator('tbody tr');
  await expectDescriptionCell(paramRows.nth(0), { singleLine: 'Single-line query desc' });
  await expectDescriptionCell(paramRows.nth(1), {
    multiLine: ['Multi-line query desc line one', 'Multi-line query desc line two']
  });
  await expectDescriptionCell(paramRows.nth(2), { empty: true });

  await selectRequestPaneTab(page, 'Vars');
  const reqVarRows = page.getByTestId('request-vars-req').locator('tbody tr');
  await expectVarDescriptionCell(reqVarRows.nth(0), { singleLine: 'Single-line req var desc' });
  await expectVarDescriptionCell(reqVarRows.nth(1), { multiLine: ['Req var line one', 'Req var line two'] });
  await expectVarDescriptionCell(reqVarRows.nth(2), { empty: true });

  await selectRequestPaneTab(page, 'Body');
  const multipartRows = page.getByTestId('multipart-form-table').locator('tbody tr');
  await expectDescriptionCell(multipartRows.nth(0), { singleLine: 'Single-line field desc' });
  await expectDescriptionCell(multipartRows.nth(1), {
    multiLine: ['Multi-line field desc line one', 'Multi-line field desc line two']
  });
  await expectDescriptionCell(multipartRows.nth(2), { empty: true });

  await openImportedRequest(page, collectionName, 'form-request');
  await selectRequestPaneTab(page, 'Body');
  const formRows = page.getByTestId('form-urlencoded-table').locator('tbody tr');
  await expectDescriptionCell(formRows.nth(0), { singleLine: 'Single-line form desc' });
  await expectDescriptionCell(formRows.nth(1), {
    multiLine: ['Multi-line form desc line one', 'Multi-line form desc line two']
  });
  await expectDescriptionCell(formRows.nth(2), { empty: true });
};

const assertCollectionDescriptions = async (page: Page, collectionName: string) => {
  await openCollectionSettings(page, collectionName);
  await page.getByTestId('collection-settings-tab-headers').click();

  const headerTable = page.getByTestId('collection-headers');
  const headerRows = headerTable.locator('tbody tr');
  await expectDescriptionCell(headerRows.nth(0), { singleLine: 'Single-line collection header desc' });
  await expectDescriptionCell(headerRows.nth(1), {
    multiLine: ['Collection header line one', 'Collection header line two']
  });
  await expectDescriptionCell(headerRows.nth(2), { empty: true });

  await page.getByTestId('collection-settings-tab-vars').click();
  const varRows = page.getByTestId('collection-vars-req').locator('tbody tr');
  await expectVarDescriptionCell(varRows.nth(0), { singleLine: 'Single-line collection var desc' });
  await expectVarDescriptionCell(varRows.nth(1), {
    multiLine: ['Collection var line one', 'Collection var line two']
  });
  await expectVarDescriptionCell(varRows.nth(2), { empty: true });
};

const assertFolderDescriptions = async (page: Page, collectionName: string) => {
  await openFolderSettings(page, collectionName);
  await page.getByTestId('folder-settings-tab-headers').click();

  const headerRows = page.locator('table').first().locator('tbody tr');
  await expectDescriptionCell(headerRows.nth(0), { singleLine: 'Single-line folder header desc' });
  await expectDescriptionCell(headerRows.nth(1), {
    multiLine: ['Folder header line one', 'Folder header line two']
  });
  await expectDescriptionCell(headerRows.nth(2), { empty: true });

  await page.getByTestId('folder-settings-tab-vars').click();
  const varRows = page.getByTestId('folder-vars-req').locator('tbody tr');
  await expectVarDescriptionCell(varRows.nth(0), { singleLine: 'Single-line folder var desc' });
  await expectVarDescriptionCell(varRows.nth(1), { multiLine: ['Folder var line one', 'Folder var line two'] });
  await expectVarDescriptionCell(varRows.nth(2), { empty: true });
};

const assertEnvironmentDescriptions = async (page: Page, collectionName: string) => {
  const locators = buildCommonLocators(page);
  await openEnvironmentConfigure(page, collectionName, 'test_env');

  const hostDesc = locators.environment.variableDescriptionEditor(0);
  await expect(hostDesc.locator('.CodeMirror-line').first()).toHaveText('Single-line env desc');

  const tokenDesc = locators.environment.variableDescriptionEditor(1);
  await expect(tokenDesc.locator('.CodeMirror-line').nth(0)).toHaveText('Env line one');
  await expect(tokenDesc.locator('.CodeMirror-line').nth(1)).toHaveText('Env line two');

  const plainDesc = locators.environment.variableDescriptionEditor(2);
  await expect(plainDesc.locator('.CodeMirror-line').first()).toHaveText('');
};

const runDescriptionImportAssertions = async (page: Page, collectionName: string) => {
  await assertRequestDescriptions(page, collectionName);
  await assertCollectionDescriptions(page, collectionName);
  await assertFolderDescriptions(page, collectionName);
  await assertEnvironmentDescriptions(page, collectionName);
};

test.describe.configure({ mode: 'serial' });

test.describe('Description import — Bruno JSON (.bru) collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('preserves descriptions across request, collection, folder, and environment surfaces', async ({
    page,
    createTmpDir
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const fixtureFile = path.resolve(__dirname, 'fixtures', 'descriptions-collection-bru.json');
    const collectionLocation = await createTmpDir('descriptions-imported-bru');

    await importCollection(page, fixtureFile, collectionLocation, {
      expectedCollectionName: 'descriptions-imported-bru',
      sidebarTimeout: 15000
    });

    await runDescriptionImportAssertions(page, 'descriptions-imported-bru');
  });
});

test.describe('Description import — OpenCollection (.yml) collection', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('preserves descriptions across request, collection, folder, and environment surfaces', async ({
    page,
    createTmpDir
  }, testInfo) => {
    testInfo.setTimeout(120_000);

    const fixtureFile = path.resolve(__dirname, 'fixtures', 'descriptions-collection.yml');
    const collectionLocation = await createTmpDir('descriptions-imported-yml');

    await importCollection(page, fixtureFile, collectionLocation, {
      expectedCollectionName: 'descriptions-imported-yml',
      sidebarTimeout: 15000
    });

    await runDescriptionImportAssertions(page, 'descriptions-imported-yml');
  });
});
