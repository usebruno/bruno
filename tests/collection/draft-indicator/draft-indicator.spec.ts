import { test, expect } from '../../../playwright';
import { closeAllCollections, createCollection, openCollectionAndAcceptSandbox } from '../../utils/page';

test.describe('Draft indicator in collection and folder settings', () => {
  test.afterAll(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify draft indicator appears when changing collection settings - Headers', async ({ page, createTmpDir }) => {
    const collectionName = 'test-draft';

    // Create a new collection
    await createCollection(page, collectionName, await createTmpDir());

    // Open collection settings by clicking on the collection name
    await openCollectionAndAcceptSandbox(page, collectionName);

    // Verify the collection settings tab is open
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    // Verify initially there is NO draft indicator (close icon is present)
    const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
    await expect(collectionTab.locator('.close-icon')).toBeVisible();
    await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

    // Click on Headers tab
    await page.locator('.tab.headers').click();

    // Add a new header
    await page.getByRole('button', { name: 'Add Header' }).click();

    // Fill in header name and value in the table
    // Target the table and get the first row's CodeMirror editors
    const headerTable = page.locator('table').first();
    const headerRow = headerTable.locator('tbody tr').first();

    // Fill in the name field (first CodeMirror in the row)
    const nameEditor = headerRow.locator('.CodeMirror').first();
    await nameEditor.click();
    await page.keyboard.type('X-Custom-Header');

    // Fill in the value field (second CodeMirror in the row)
    const valueEditor = headerRow.locator('.CodeMirror').nth(1);
    await valueEditor.click();
    await page.keyboard.type('custom-value');

    // Verify draft indicator appears in the tab
    await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
    await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify draft indicator is gone after saving
    await expect(collectionTab.locator('.close-icon')).toBeVisible();
    await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Verify draft indicator appears when changing collection settings - Auth', async ({ page }) => {
    // Verify the collection settings tab is open
    const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
    await expect(collectionTab).toBeVisible();

    // Verify initially there is NO draft indicator
    await expect(collectionTab.locator('.close-icon')).toBeVisible();
    await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();

    // Click on Auth tab
    await page.locator('.tab.auth').click();

    // Change auth mode from 'none' to 'bearer' by clicking the dropdown
    await page.locator('.auth-mode-label').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Bearer Token' }).click();

    // Verify draft indicator appears in the tab
    await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
    await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify draft indicator is gone after saving
    await expect(collectionTab.locator('.close-icon')).toBeVisible();
    await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Verify draft indicator appears when changing collection settings - Vars', async ({ page }) => {
    const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });

    // Verify initially there is NO draft indicator
    await expect(collectionTab.locator('.close-icon')).toBeVisible();

    // Click on Vars tab
    await page.locator('.tab.vars').click();

    // Add a new variable in the Pre Request section
    await page.locator('.btn-add-var').first().click();

    // Fill in variable name and value in the table
    // Target the vars table and get the first row
    const varsTable = page.locator('table').first();
    const varRow = varsTable.locator('tbody tr').first();

    // Fill in the name field (regular input)
    const varNameInput = varRow.locator('input[type="text"]');
    await varNameInput.click();
    await varNameInput.fill('testVar');

    // Fill in the value field (CodeMirror editor)
    const valueEditor = varRow.locator('.CodeMirror');
    await valueEditor.click();
    await page.keyboard.type('testValue');

    // Verify draft indicator appears
    await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();
    await expect(collectionTab.locator('.close-icon')).not.toBeVisible();

    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify draft indicator is gone after saving
    await expect(collectionTab.locator('.close-icon')).toBeVisible();
    await expect(collectionTab.locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Verify draft indicator appears when changing folder settings - Headers', async ({ page }) => {
    const collectionName = 'test-draft';

    // Create a folder in the collection
    const collection = page.locator('.collection-name').filter({ hasText: collectionName });
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();

    // Fill folder name
    await expect(page.locator('#folder-name')).toBeVisible();
    await page.locator('#folder-name').fill('test-folder');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.locator('.collection-item-name').filter({ hasText: 'test-folder' })).toBeVisible();

    // Open folder settings by double-clicking the folder
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();

    // Verify folder settings tab is open
    const folderTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'test-folder' }) });
    await expect(folderTab).toBeVisible();

    // Verify initially there is NO draft indicator
    await expect(folderTab.locator('.close-icon')).toBeVisible();
    await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();

    // Headers tab should be selected by default, add a new header
    await page.getByRole('button', { name: 'Add Header' }).click();

    // Fill in header name and value in the table
    const headerTable = page.locator('table').first();
    const headerRow = headerTable.locator('tbody tr').first();

    // Fill in the name field (first CodeMirror in the row)
    const nameEditor = headerRow.locator('.CodeMirror').first();
    await nameEditor.click();
    await page.keyboard.type('X-Folder-Header');

    // Fill in the value field (second CodeMirror in the row)
    const valueEditor = headerRow.locator('.CodeMirror').nth(1);
    await valueEditor.click();
    await page.keyboard.type('folder-value');

    // Verify draft indicator appears in the folder tab
    await expect(folderTab.locator('.has-changes-icon')).toBeVisible();
    await expect(folderTab.locator('.close-icon')).not.toBeVisible();

    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify draft indicator is gone after saving
    await expect(folderTab.locator('.close-icon')).toBeVisible();
    await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Verify draft indicator appears when changing folder settings - Auth', async ({ page }) => {
    // Open folder settings by double-clicking the folder from previous test
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();

    // Verify folder settings tab is open
    const folderTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'test-folder' }) });
    await expect(folderTab).toBeVisible();

    // Verify initially no draft indicator
    await expect(folderTab.locator('.close-icon')).toBeVisible();

    // Click on Auth tab
    await page.locator('.tab.auth').click();

    // Change auth mode by clicking the dropdown
    await page.locator('.auth-mode-label').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Bearer Token' }).click();

    // Verify draft indicator appears
    await expect(folderTab.locator('.has-changes-icon')).toBeVisible();
    await expect(folderTab.locator('.close-icon')).not.toBeVisible();

    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify draft indicator is gone
    await expect(folderTab.locator('.close-icon')).toBeVisible();
    await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();
  });

  test('Verify draft indicator appears when changing folder settings - Vars', async ({ page }) => {
    // Open folder settings by double-clicking the folder from previous test
    await page.locator('.collection-item-name').filter({ hasText: 'test-folder' }).dblclick();

    // Verify folder settings tab is open
    const folderTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'test-folder' }) });
    await expect(folderTab).toBeVisible();

    // Verify initially no draft indicator
    await expect(folderTab.locator('.close-icon')).toBeVisible();

    // Click on Vars tab
    await page.locator('.tab.vars').click();

    // Add a new variable in the Pre Request section
    await page.locator('.btn-add-var').first().click();

    // Fill in variable name and value in the table
    const varsTable = page.locator('table').first();
    const varRow = varsTable.locator('tbody tr').first();

    // Fill in the name field (regular input)
    const varNameInput = varRow.locator('input[type="text"]');
    await varNameInput.click();
    await varNameInput.fill('folderVar');

    // Fill in the value field (CodeMirror editor)
    const valueEditor = varRow.locator('.CodeMirror');
    await valueEditor.click();
    await page.keyboard.type('folderValue');

    // Verify draft indicator appears
    await expect(folderTab.locator('.has-changes-icon')).toBeVisible();
    await expect(folderTab.locator('.close-icon')).not.toBeVisible();

    // Save the changes
    await page.getByRole('button', { name: 'Save' }).click();

    // Verify draft indicator is gone
    await expect(folderTab.locator('.close-icon')).toBeVisible();
    await expect(folderTab.locator('.has-changes-icon')).not.toBeVisible();
  });
});
