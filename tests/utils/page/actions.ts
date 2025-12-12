import { test, expect, Page } from '../../../playwright';
import { buildCommonLocators } from './locators';

type SandboxMode = 'safe' | 'developer';

/**
 * Close all collections
 * @param page - The page object
 * @returns void
 */
const closeAllCollections = async (page) => {
  await test.step('Close all collections', async () => {
    const numberOfCollections = await page.locator('[data-testid="collections"] .collection-name').count();

    for (let i = 0; i < numberOfCollections; i++) {
      await page.locator('[data-testid="collections"] .collection-name').first().locator('.collection-actions').click();
      await page.locator('.dropdown-item').getByText('Remove').click();
      // Wait for the remove collection modal to be visible
      await page.locator('.bruno-modal-header-title', { hasText: 'Remove Collection' }).waitFor({ state: 'visible' });
      await page.locator('.bruno-modal-footer .submit').click();
      // Wait for the remove collection modal to be hidden
      await page.locator('.bruno-modal-header-title', { hasText: 'Remove Collection' }).waitFor({ state: 'hidden' });
    }

    // Wait until no collections are left open (check sidebar only)
    await expect(page.getByTestId('collections').locator('.collection-name')).toHaveCount(0);
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
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });

    await createCollectionModal.getByLabel('Name').fill(collectionName);
    const locationInput = createCollectionModal.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.fill(collectionLocation);
    }
    await createCollectionModal.getByRole('button', { name: 'Create', exact: true }).click();

    await createCollectionModal.waitFor({ state: 'detached' });

    if (options.openWithSandboxMode != undefined) {
      await openCollectionAndAcceptSandbox(page, collectionName, options.openWithSandboxMode);
    }
  });
};

type CreateRequestOptions = {
  url?: string;
  inFolder?: boolean;
};

type CreateUntitledRequestOptions = {
  requestType?: 'HTTP' | 'GraphQL' | 'WebSocket' | 'gRPC';
  requestName?: string;
  url?: string;
  tag?: string;
};

/**
 * Create an untitled request using the new dropdown flow (from tabs area)
 * @param page - The page object
 * @param options - Optional settings (requestType, url, tag)
 * @returns void
 */
const createUntitledRequest = async (
  page: Page,
  options: CreateUntitledRequestOptions = {}
) => {
  const { requestType = 'HTTP', url, tag } = options;

  await test.step(`Create untitled ${requestType} request${url ? ' with URL' : ''}${tag ? ' with tag' : ''}`, async () => {
    // Click the + icon to open the dropdown
    const createButton = page.locator('.short-tab').locator('svg').first();
    await createButton.waitFor({ state: 'visible' });
    await createButton.click();

    // Select the request type from dropdown
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: requestType }).waitFor({ state: 'visible' });
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: requestType }).click();

    // Wait for the request tab to be active
    await page.locator('.request-tab.active').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    // Fill URL if provided
    if (url) {
      await page.locator('#request-url .CodeMirror').click();
      await page.locator('#request-url textarea').fill(url);
      await page.locator('#send-request').getByTitle('Save Request').click();
      await page.waitForTimeout(200);
    }

    // Add tag if provided
    if (tag) {
      await selectRequestPaneTab(page, 'Settings');
      await page.waitForTimeout(200);
      const tagInput = await page.getByTestId('tag-input').getByRole('textbox');
      await tagInput.fill(tag);
      await tagInput.press('Enter');
      await page.waitForTimeout(200);
      await expect(page.locator('.tag-item', { hasText: tag })).toBeVisible();
      await page.keyboard.press('Meta+s');
      await page.waitForTimeout(200);
    }

    // Wait for toast message to ensure request creation is complete
    // This helps prevent race conditions when creating multiple requests
    await expect(page.getByText('New request created!')).toBeVisible({ timeout: 2000 }).catch(() => {
      // Toast might have already disappeared, that's okay
    });
  });
};

/**
 * Create a request in a collection or folder
 * @param page - The page object
 * @param requestName - The name of the request to create
 * @param parentName - The name of the collection or folder
 * @param options - Optional settings (url, inFolder)
 * @returns void
 */
const createRequest = async (
  page: Page,
  requestName: string,
  parentName: string,
  options: CreateRequestOptions = {}
) => {
  const { url, inFolder = false } = options;
  const parentType = inFolder ? 'folder' : 'collection';

  await test.step(`Create request "${requestName}" in ${parentType} "${parentName}"`, async () => {
    const locators = buildCommonLocators(page);

    if (inFolder) {
      await locators.sidebar.folder(parentName).hover();
      await locators.actions.collectionItemActions(parentName).click();
    } else {
      await locators.sidebar.collection(parentName).hover();
      await locators.actions.collectionActions(parentName).click();
    }

    await locators.dropdown.item('New Request').click();
    await page.getByPlaceholder('Request Name').fill(requestName);

    if (url) {
      await page.locator('#new-request-url .CodeMirror').click();
      await page.keyboard.type(url);
    }

    await locators.modal.button('Create').click();

    if (inFolder) {
      await expect(locators.sidebar.folderRequest(parentName, requestName)).toBeVisible();
    } else {
      await expect(locators.sidebar.request(requestName)).toBeVisible();
    }
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
    // Use the collection container (.collection-name) scoped to sidebar to scope the search
    const collectionContainer = page.getByTestId('collections').locator('.collection-name').filter({ hasText: collectionName });
    const collectionWrapper = collectionContainer.locator('..');
    const request = collectionWrapper.locator('.collection-item-name').filter({ hasText: requestName });

    await request.locator('.menu-icon').click();
    await locators.dropdown.item('Delete').click();
    await locators.modal.button('Delete').click();
    await expect(request).not.toBeVisible();
  });
};

/**
 * Import a collection from a file
 * @param page - The page object
 * @param filePath - The path to the collection file to import
 * @param collectionLocation - The directory where the collection will be saved
 * @param options - Optional settings for import
 * @returns void
 */
type ImportCollectionOptions = {
  expectedCollectionName?: string;
  openWithSandboxMode?: SandboxMode;
};

const importCollection = async (
  page: Page,
  filePath: string,
  collectionLocation: string,
  options: ImportCollectionOptions = {}
) => {
  await test.step(`Import collection from "${filePath}"`, async () => {
    const locators = buildCommonLocators(page);

    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Wait for import modal
    const importModal = page.getByRole('dialog');
    await importModal.waitFor({ state: 'visible' });
    await expect(importModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Set the file
    await page.setInputFiles('input[type="file"]', filePath);

    // Wait for location modal to appear
    const locationModal = page.locator('[data-testid="import-collection-location-modal"]');
    await locationModal.waitFor({ state: 'visible', timeout: 10000 });
    await expect(locationModal.locator('.bruno-modal-header-title')).toContainText('Import Collection');

    // Verify expected collection name if provided
    if (options.expectedCollectionName) {
      await expect(locationModal.getByText(options.expectedCollectionName)).toBeVisible();
    }

    // Set location and import
    await page.locator('#collection-location').fill(collectionLocation);
    await locationModal.getByRole('button', { name: 'Import' }).click();

    // Wait for collection to appear in sidebar
    if (options.expectedCollectionName) {
      await expect(
        page.locator('#sidebar-collection-name').filter({ hasText: options.expectedCollectionName })
      ).toBeVisible();

      // Configure sandbox mode if requested
      if (options.openWithSandboxMode) {
        await openCollectionAndAcceptSandbox(page, options.expectedCollectionName, options.openWithSandboxMode);
      }
    }
  });
};

/**
 * Remove a specific collection from the sidebar
 * @param page - The page object
 * @param collectionName - The name of the collection to remove
 * @returns void
 */
const removeCollection = async (page: Page, collectionName: string) => {
  await test.step(`Remove collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);
    const collectionRow = page.locator('.collection-name').filter({
      has: page.locator('#sidebar-collection-name', { hasText: collectionName })
    });

    await collectionRow.hover();
    await collectionRow.locator('.collection-actions .icon').click();
    await locators.dropdown.item('Remove').click();

    // Wait for and confirm modal
    await locators.modal.title('Remove Collection').waitFor({ state: 'visible' });
    await locators.modal.button('Remove').click();
    await locators.modal.title('Remove Collection').waitFor({ state: 'hidden' });

    // Verify collection is removed
    await expect(
      page.locator('#sidebar-collection-name').filter({ hasText: collectionName })
    ).not.toBeVisible();
  });
};

/**
 * Create a folder inside a collection or another folder
 * @param page - The page object
 * @param folderName - The name of the folder to create
 * @param parentName - The name of the parent collection or folder
 * @param isCollection - Whether the parent is a collection (true) or folder (false)
 * @returns void
 */
const createFolder = async (
  page: Page,
  folderName: string,
  parentName: string,
  isCollection: boolean = true
) => {
  await test.step(`Create folder "${folderName}" in "${parentName}"`, async () => {
    const locators = buildCommonLocators(page);

    if (isCollection) {
      await locators.sidebar.collection(parentName).hover();
      await locators.actions.collectionActions(parentName).click();
    } else {
      await locators.sidebar.folder(parentName).hover();
      await locators.actions.collectionItemActions(parentName).click();
    }

    await locators.dropdown.item('New Folder').click();
    await page.getByPlaceholder('Folder Name').fill(folderName);
    await locators.modal.button('Create').click();
    await expect(locators.sidebar.folder(folderName)).toBeVisible();
  });
};

type EnvironmentType = 'collection' | 'global';

/**
 * Open the environment selector panel
 * @param page - The page object
 * @param type - The type of environment tab to select
 * @returns void
 */
const openEnvironmentSelector = async (page: Page, type: EnvironmentType = 'collection') => {
  await test.step(`Open ${type} environment selector`, async () => {
    const locators = buildCommonLocators(page);

    await locators.environment.selector().click();

    if (type === 'global') {
      await locators.environment.globalTab().click();
      await expect(locators.environment.globalTab()).toHaveClass(/active/);
    } else {
      await expect(locators.environment.collectionTab()).toHaveClass(/active/);
    }
  });
};

/**
 * Create a new environment
 * @param page - The page object
 * @param environmentName - The name of the environment
 * @param type - The type of environment (collection or global)
 * @returns void
 */
const createEnvironment = async (
  page: Page,
  environmentName: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Create ${type} environment "${environmentName}"`, async () => {
    await openEnvironmentSelector(page, type);

    await page.locator('button[id="create-env"]').click();

    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(environmentName);
    await page.getByRole('button', { name: 'Create' }).click();
  });
};

type EnvironmentVariable = {
  name: string;
  value: string;
  isSecret?: boolean;
};

/**
 * Add an environment variable to the currently open environment
 * @param page - The page object
 * @param variable - The variable to add (name, value, and optional secret flag)
 * @param index - The index of the variable (0-based)
 * @returns void
 */
const addEnvironmentVariable = async (
  page: Page,
  variable: EnvironmentVariable,
  index: number
) => {
  await test.step(`Add environment variable "${variable.name}"`, async () => {
    const addButton = page.locator('button[data-testid="add-variable"]');
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Wait for the new row to be added and the name input to be visible
    const nameInput = page.locator(`input[name="${index}.name"]`);
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(variable.name);

    // Wait for the CodeMirror editor in the row to be ready
    const variableRow = page.locator('tr').filter({ has: page.locator(`input[name="${index}.name"]`) });
    const codeMirror = variableRow.locator('.CodeMirror');
    await codeMirror.waitFor({ state: 'visible' });
    await codeMirror.click();
    await page.keyboard.type(variable.value);

    if (variable.isSecret) {
      const secretCheckbox = page.locator(`input[name="${index}.secret"]`);
      await secretCheckbox.waitFor({ state: 'visible' });
      await secretCheckbox.check();
    }
  });
};

/**
 * Add multiple environment variables to the currently open environment
 * @param page - The page object
 * @param variables - Array of variables to add
 * @returns void
 */
const addEnvironmentVariables = async (page: Page, variables: EnvironmentVariable[]) => {
  await test.step(`Add ${variables.length} environment variables`, async () => {
    for (let i = 0; i < variables.length; i++) {
      await addEnvironmentVariable(page, variables[i], i);
    }
  });
};

/**
 * Save the current environment settings
 * @param page - The page object
 * @returns void
 */
const saveEnvironment = async (page: Page) => {
  await test.step('Save environment', async () => {
    await page.getByRole('button', { name: 'Save' }).click();
  });
};

/**
 * Close the environment modal/panel
 * @param page - The page object
 * @returns void
 */
const closeEnvironmentPanel = async (page: Page) => {
  await test.step('Close environment panel', async () => {
    await page.getByText('×').click();
  });
};

/**
 * Select an environment from the dropdown
 * @param page - The page object
 * @param environmentName - The name of the environment to select
 * @param type - The type of environment (collection or global)
 * @returns void
 */
const selectEnvironment = async (
  page: Page,
  environmentName: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Select ${type} environment "${environmentName}"`, async () => {
    const locators = buildCommonLocators(page);

    await locators.environment.selector().click();

    if (type === 'global') {
      await locators.environment.globalTab().click();
    }

    await locators.environment.envOption(environmentName).click();

    // Verify selection
    await expect(page.locator('.current-environment')).toContainText(environmentName);
  });
};

/**
 * Send the current request and wait for response
 * @param page - The page object
 * @param expectedStatusCode - Optional expected status code to wait for
 * @param timeout - Timeout in milliseconds (default: 30000)
 * @returns void
 */
const sendRequest = async (
  page: Page,
  expectedStatusCode?: number | string,
  timeout: number = 30000
) => {
  await test.step('Send request', async () => {
    await page.getByTestId('send-arrow-icon').click();
    await page.getByTestId('response-status-code').waitFor({ state: 'visible', timeout });

    if (expectedStatusCode !== undefined) {
      await expect(page.getByTestId('response-status-code')).toContainText(
        String(expectedStatusCode),
        { timeout }
      );
    }
  });
};

/**
 * Open a request by clicking on it in the sidebar
 * @param page - The page object
 * @param requestName - The name of the request to open
 * @returns void
 */
// const openRequest = async (page: Page, requestName: string) => {
//   await test.step(`Open request "${requestName}"`, async () => {
//     const locators = buildCommonLocators(page);
//     await locators.sidebar.request(requestName).click();
//     await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
//   });
// };

/**
* Navigate to a collection and open a request
* @param page - The page object
* @param collectionName - The name of the collection
* @param requestName - The name of the request
*/
const openRequest = async (page: Page, collectionName: string, requestName: string) => {
  await test.step(`Navigate to collection "${collectionName}" and open request "${requestName}"`, async () => {
    const collectionContainer = page.getByTestId('sidebar-collection-row').filter({ hasText: collectionName });
    await collectionContainer.click();
    const collectionWrapper = collectionContainer.locator('..');
    const request = collectionWrapper.getByTestId('sidebar-collection-item-row').filter({ hasText: requestName });
    await request.click();
  });
};
/**
 * Open a request within a folder
 * @param page - The page object
 * @param folderName - The name of the folder
 * @param requestName - The name of the request
 * @returns void
 */
const openFolderRequest = async (page: Page, folderName: string, requestName: string) => {
  await test.step(`Open request "${requestName}" in folder "${folderName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.folderRequest(folderName, requestName).click();
    await expect(locators.tabs.activeRequestTab()).toContainText(requestName);
  });
};

/**
* Send a request and wait for the response
 * @param page - The page object
 * @param expectedStatusCode - The expected status code (default: '200')
 * @param options - The options for sending the request (default: { timeout: 15000 })
 */
const sendRequestAndWaitForResponse = async (page: Page,
  expectedStatusCode: string = '200',
  options: {
    ignoreCase?: boolean;
    timeout?: number;
    useInnerText?: boolean;
  } = { timeout: 15000 }) => {
  await test.step(`Send request and wait for status code ${expectedStatusCode}`, async () => {
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText(expectedStatusCode, options);
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
    const responseFormatTab = page.getByTestId('format-response-tab');
    await responseFormatTab.click();
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
    const previewTab = page.getByTestId('preview-response-tab');
    await previewTab.click();
  });
};

/**
 * Get the response body text
 * @param page - The page object
 * @returns The response body text
 */
const getResponseBody = async (page: Page): Promise<string> => {
  return await page.locator('.response-pane').innerText();
};

const selectRequestPaneTab = async (page: Page, tabName: string) => {
  await test.step(`Select request pane tab "${tabName}"`, async () => {
    const visibleTab = page.locator('.tabs').getByRole('tab', { name: tabName });
    const overflowButton = page.locator('.tabs .more-tabs');

    // Check if tab is directly visible
    if (await visibleTab.isVisible()) {
      await visibleTab.click();
      return;
    }

    // Check if there's an overflow dropdown
    if (await overflowButton.isVisible()) {
      await overflowButton.click();

      // Wait for dropdown to appear and click the tab
      const dropdownTab = page.locator('.tippy-content').getByRole('tab', { name: tabName });
      await expect(dropdownTab).toBeVisible();
      await dropdownTab.click();
      return;
    }

    // If neither found, fail with a helpful message
    throw new Error(`Tab "${tabName}" not found in visible tabs or overflow dropdown`);
  });
};

/**
 * Verify response contains specific text
 * @param page - The page object
 * @param texts - Array of texts to verify in the response
 * @returns void
 */
const expectResponseContains = async (page: Page, texts: string[]) => {
  await test.step('Verify response content', async () => {
    const responsePane = page.locator('.response-pane');
    for (const text of texts) {
      await expect(responsePane).toContainText(text);
    }
  });
};

// Create a action to click a response action
const clickResponseAction = async (page: Page, actionTestId: string) => {
  const actionButton = await page.getByTestId(actionTestId).first();
  if (await actionButton.isVisible()) {
    await actionButton.click();
  } else {
    const menu = await page.getByTestId('response-actions-menu');
    await menu.click();
    await actionButton.click();
  }
};

export {
  closeAllCollections,
  openCollectionAndAcceptSandbox,
  createCollection,
  createRequest,
  createUntitledRequest,
  deleteRequest,
  importCollection,
  removeCollection,
  createFolder,
  openEnvironmentSelector,
  createEnvironment,
  addEnvironmentVariable,
  addEnvironmentVariables,
  saveEnvironment,
  closeEnvironmentPanel,
  selectEnvironment,
  sendRequest,
  openRequest,
  openFolderRequest,
  getResponseBody,
  expectResponseContains,
  selectRequestPaneTab,
  sendRequestAndWaitForResponse,
  switchResponseFormat,
  switchToPreviewTab,
  switchToEditorTab,
  clickResponseAction
};

export type { SandboxMode, EnvironmentType, EnvironmentVariable, CreateCollectionOptions, ImportCollectionOptions, CreateRequestOptions, CreateUntitledRequestOptions };
