import { test, expect } from '../../../playwright';
import { createCollection, openCollectionAndAcceptSandbox, closeAllCollections } from '../../utils/page';

test.describe('Draft values are used in requests', () => {
  test.afterAll(async ({ page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Verify draft collection headers are used in HTTP requests', async ({ page, createTmpDir }) => {
    const collectionName = 'test-draft-headers';

    // Create a new collection
    await createCollection(page, collectionName, await createTmpDir());
    await openCollectionAndAcceptSandbox(page, collectionName);

    // Verify the collection settings tab is open
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Collection' })).toBeVisible();

    // Add collection header in draft (unsaved)
    // Click on Headers tab
    await page.locator('.tab.headers').click();

    // Add a new header
    await page.getByRole('button', { name: 'Add Header' }).click();

    // Fill in header name and value
    const headerTable = page.locator('table').first();
    const headerRow = headerTable.locator('tbody tr').first();

    // Fill in the name field
    const nameEditor = headerRow.locator('.CodeMirror').first();
    await nameEditor.click();
    await page.keyboard.type('X-Draft-Header');

    // Fill in the value field
    const valueEditor = headerRow.locator('.CodeMirror').nth(1);
    await valueEditor.click();
    await page.keyboard.type('draft-value-123');

    // Verify draft indicator appears (header is not saved yet)
    const collectionTab = page.locator('.request-tab').filter({ has: page.locator('.tab-label', { hasText: 'Collection' }) });
    await expect(collectionTab.locator('.has-changes-icon')).toBeVisible();

    // Create a folder in the collection
    const collection = page.locator('.collection-name').filter({ hasText: collectionName });

    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions .icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Folder' }).click();
    await page.locator('#folder-name').fill('Test Folder');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.locator('.collection-item-name').filter({ hasText: 'Test Folder' }).click();

    // Wait for the folder to be created
    await expect(page.locator('.collection-item-name').filter({ hasText: 'Test Folder' })).toBeVisible();
    const folder = page.locator('.collection-item-name').filter({ hasText: 'Test Folder' });

    // Add a header to the folder
    await page.getByRole('button', { name: 'Add Header' }).click();

    await nameEditor.click();
    await page.keyboard.type('X-Folder-Draft-Header');

    await valueEditor.click();
    await page.keyboard.type('folder-draft-value-123');

    // Create a request in the collection
    // Create a new request via collection menu
    await folder.locator('.menu-icon').hover();
    await folder.locator('.menu-icon').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();

    // Fill in request details - using httpbin.org which echoes headers back
    await page.getByTestId('request-name').fill('Test Request');
    await page.getByTestId('new-request-url').locator('.CodeMirror').click();
    await page.keyboard.type('https://httpbin.org/headers');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Send request and verify draft header is included
    // Wait for the request tab to be active
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: 'Test Request' })).toBeVisible();

    // Click on Generate Code from the sidebar request item dropdown
    const requestItem = page.locator('.collection-item-name').filter({ hasText: 'Test Request' });
    await expect(requestItem).toBeVisible();

    // Right-click on the request item to open context menu
    await requestItem.click({ button: 'right' });

    // Click on Generate Code option
    await page.locator('.dropdown-item').filter({ hasText: 'Generate Code' }).click();

    // Wait for the Generate Code modal to open
    await expect(page.getByTestId('modal-close-button')).toBeVisible();

    // Wait for code generator to be visible
    const codeGenerator = page.locator('.code-generator');
    await expect(codeGenerator).toBeVisible();

    // Target the CodeMirror specifically within the code generator modal
    const generatedCodeEditor = codeGenerator.locator('.editor-container .CodeMirror').first();
    await expect(generatedCodeEditor).toBeVisible();

    // Wait for code generation to complete by checking for the URL in the generated code
    await expect(generatedCodeEditor).toContainText('https://httpbin.org/headers');

    // Check that the generated code contains the draft header
    // The header appears as a --header argument in the generated curl/httpie/wget command
    await expect(generatedCodeEditor).toContainText('x-draft-header');
    await expect(generatedCodeEditor).toContainText('draft-value-123');
    await expect(generatedCodeEditor).toContainText('x-folder-draft-header');
    await expect(generatedCodeEditor).toContainText('folder-draft-value-123');

    // Close the modal by clicking the X button using the test id
    await page.getByTestId('modal-close-button').click();

    // Wait for modal to fully close before continuing
    await page.waitForSelector('.bruno-modal', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('.bruno-modal-backdrop', { state: 'hidden', timeout: 10000 });
  });

  test('Verify draft for proxy settings are used in HTTP requests', async ({ page, createTmpDir }) => {
    const collectionName = 'test-draft-proxy-settings';

    // Create a new collection
    await createCollection(page, collectionName, await createTmpDir());
    await openCollectionAndAcceptSandbox(page, collectionName);

    // Create a new request from collection menu
    const collection = page.locator('.collection-name').filter({ hasText: collectionName });
    await collection.locator('.collection-actions').hover();
    await collection.locator('.collection-actions').click();
    await page.locator('.dropdown-item').filter({ hasText: 'New Request' }).click();
    await page.getByTestId('request-name').fill('Test Request');
    await page.getByTestId('new-request-url').locator('.CodeMirror').click();
    await page.keyboard.type('https://testbench-sanity.usebruno.com/ping');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    // Verify the request is created
    await expect(page.locator('.collection-item-name').filter({ hasText: 'Test Request' })).toBeVisible();
    const request = page.locator('.collection-item-name').filter({ hasText: 'Test Request' });

    // Run the request with inherit timeout
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

    // Click on collection in sidebar to open collection settings
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    // Go to Proxy Settings tab
    await page.locator('.tab.proxy').click();
    await page.locator('input[name="enabled"][value="true"]').check();
    await page.locator('#hostname').fill('localhost');
    await page.locator('#port').fill('8080');

    await page.locator('.collection-item-name').filter({ hasText: 'Test Request' }).click();

    // Run the request again
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByText('Error occurred while executing the request!')).toBeVisible();
  });
});
