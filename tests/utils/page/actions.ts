import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from './locators';

/**
 * Close all collections
 * @param page - The page object
 * @returns void
 */
const closeAllCollections = async (page) => {
  await test.step('Close all collections', async () => {
    const numberOfCollections = await page.locator('.collection-name').count();

    for (let i = 0; i < numberOfCollections; i++) {
      await page.locator('.collection-name').first().locator('.collection-actions').click();
      await page.locator('.dropdown-item').getByText('Close').click();
      // Wait for the close collection modal to be visible
      await page.locator('.bruno-modal-header-title', { hasText: 'Close Collection' }).waitFor({ state: 'visible' });
      await page.locator('.bruno-modal-footer .submit').click();
      // Wait for the close collection modal to be hidden
      await page.locator('.bruno-modal-header-title', { hasText: 'Close Collection' }).waitFor({ state: 'hidden' });
    }

    // Wait until no collections are left open
    await expect(page.locator('.collection-name')).toHaveCount(0);
  });
};

/**
 * Open a collection from the sidebar and accept the JavaScript Sandbox modal
 * @param page - The page object
 * @param collectionName - The name of the collection to open
 * @param sandboxMode - The mode to accept the sandbox modal
 * @returns void
 */
const openCollectionAndAcceptSandbox = async (page, collectionName: string, sandboxMode: 'safe' | 'developer' = 'safe') => {
  await test.step(`Open collection "${collectionName}" and accept sandbox "${sandboxMode}" mode`, async () => {
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();

    const sandboxModal = page
      .locator('.bruno-modal-card')
      .filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'JavaScript Sandbox' }) });

    const modeLabel = sandboxMode === 'safe' ? 'Safe Mode' : 'Developer Mode';
    await sandboxModal.getByLabel(modeLabel).check();
    await sandboxModal.locator('.bruno-modal-footer .submit').click();
    await sandboxModal.waitFor({ state: 'detached' });
  });
};

type CreateCollectionOptions = {
  openWithSandboxMode?: 'safe' | 'developer';
};

/**
 * Create a collection
 * @param page - The page object
 * @param collectionName - The name of the collection to create
 * @param collectionLocation - The location of the collection to create (eg)
 * @param options - The options for creating the collection
 *
 * @returns void
 */
const createCollection = async (page, collectionName: string, collectionLocation: string, options: CreateCollectionOptions = {}) => {
  await test.step(`Create collection "${collectionName}"`, async () => {
    await page.locator('.collection-dropdown .dropdown-icon').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create Collection' }).click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });

    await createCollectionModal.getByLabel('Name').fill(collectionName);
    await createCollectionModal.getByLabel('Location').fill(collectionLocation);
    await createCollectionModal.getByRole('button', { name: 'Create', exact: true }).click();

    await createCollectionModal.waitFor({ state: 'detached' });

    if (options.openWithSandboxMode != undefined) {
      await openCollectionAndAcceptSandbox(page, collectionName, options.openWithSandboxMode);
    }
  });
};

/**
 * Create a request in a collection
 * @param page - The page object
 * @param requestName - The name of the request to create
 * @param collectionName - The name of the collection
 * @returns void
 */
const createRequest = async (page, requestName: string, collectionName: string) => {
  await test.step(`Create request "${requestName}" in collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);
    const collection = locators.sidebar.collection(collectionName);

    await collection.hover();
    await locators.actions.collectionActions(collectionName).click();
    await locators.dropdown.item('New Request').click();
    await page.getByPlaceholder('Request Name').fill(requestName);
    await locators.modal.button('Create').click();
    await expect(locators.sidebar.request(requestName)).toBeVisible();
  });
};

/**
 * Delete a request from a collection
 * @param page - The page object
 * @param requestName - The name of the request to delete
 * @param collectionName - The name of the collection
 * @returns void
 */
const deleteRequest = async (page, requestName: string, collectionName: string) => {
  await test.step(`Delete request "${requestName}" from collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);

    // Click on the collection first to open it if it's closed
    await locators.sidebar.collection(collectionName).click();

    // Find the request within the collection's context
    // Use the collection container (.collection-name) to scope the search
    const collectionContainer = page.locator('.collection-name').filter({ hasText: collectionName });
    const collectionWrapper = collectionContainer.locator('..');
    const request = collectionWrapper.locator('.collection-item-name').filter({ hasText: requestName });

    await request.locator('.menu-icon').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();
    await expect(request).not.toBeVisible();
  });
};

/**
 * Navigate to a collection and open a request
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param requestName - The name of the request
 */
const openRequest = async (page: Page, collectionName: string, requestName: string) => {
  await test.step(`Navigate to collection "${collectionName}" and open request "${requestName}"`, async () => {
    await expect(page.locator('#sidebar-collection-name').getByText(collectionName)).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText(collectionName).click();
    await page.getByRole('complementary').getByText(requestName).click();
  });
};

/**
 * Send a request and wait for the response
 * @param page - The page object
 * @param expectedStatusCode - The expected status code (default: '200')
 * @param timeout - Timeout in milliseconds (default: 15000)
 */
const sendRequestAndWaitForResponse = async (page: Page,
  expectedStatusCode: string = '200',
  timeout: number = 15000) => {
  await test.step(`Send request and wait for status code ${expectedStatusCode}`, async () => {
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText(expectedStatusCode, { timeout });
  });
};

/**
 * Switch the response format
 * @param page - The page object
 * @param format - The format to switch to (e.g., 'JSON', 'HTML', 'XML', 'JavaScript', 'Raw', 'Hex', 'Base64')
 */
const switchResponseFormat = async (page: Page, format: string) => {
  await test.step(`Switch response format to ${format}`, async () => {
    const responseFormatTab = page.getByTestId('format-response-tab');
    await responseFormatTab.click();
    await page.getByTestId('format-response-tab-dropdown').getByText(format).click();
  });
};

/**
 * Switch to the preview tab
 * @param page - The page object
 */
const switchToPreviewTab = async (page: Page) => {
  await test.step('Switch to preview tab', async () => {
    const previewTab = page.getByTestId('preview-response-tab');
    await previewTab.click();
  });
};

/**
 * Switch to the editor tab
 * @param page - The page object
 */
const switchToEditorTab = async (page: Page) => {
  await test.step('Switch to editor tab', async () => {
    const responseFormatTab = page.getByTestId('format-response-tab');
    await responseFormatTab.click();
  });
};


export { 
  closeAllCollections, 
  openCollectionAndAcceptSandbox, 
  createCollection, 
  createRequest, 
  deleteRequest, 
  sendRequestAndWaitForResponse, 
  switchResponseFormat, 
  switchToPreviewTab, 
  switchToEditorTab,
  openRequest
};
