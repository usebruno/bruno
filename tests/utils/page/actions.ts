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
      const firstCollection = page.locator('[data-testid="collections"] .collection-name').first();
      await firstCollection.hover();
      await firstCollection.locator('.collection-actions .icon').click();
      await page.locator('.dropdown-item').getByText('Remove').click();

      // Wait for modal to appear - could be either regular remove or drafts confirmation
      const removeModal = page.locator('.bruno-modal').filter({ hasText: 'Remove Collection' });
      await removeModal.waitFor({ state: 'visible', timeout: 5000 });

      // Check if it's the drafts confirmation modal (has "Discard All and Remove" button)
      const hasDiscardButton = await page.getByRole('button', { name: 'Discard All and Remove' }).isVisible().catch(() => false);

      if (hasDiscardButton) {
        // Drafts modal - click "Discard All and Remove"
        await page.getByRole('button', { name: 'Discard All and Remove' }).click();
      } else {
        // Regular modal - click the submit button
        await page.locator('.bruno-modal-footer .submit').click();
      }

      // Wait for modal to close
      await removeModal.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Wait until no collections are left open (check sidebar only)
    await expect(page.getByTestId('collections').locator('.collection-name')).toHaveCount(0);
  });
};

/**
 * Open a collection from the sidebar and accept the JavaScript Sandbox modal
 * @param page - The page object
 * @param collectionName - The name of the collection to open
 * @returns void
 */
const openCollection = async (page, collectionName: string) => {
  await test.step(`Open collection "${collectionName}"`, async () => {
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  });
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
const createCollection = async (page, collectionName: string, collectionLocation: string) => {
  await test.step(`Create collection "${collectionName}"`, async () => {
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });

    await createCollectionModal.getByLabel('Name').fill(collectionName);
    const locationInput = createCollectionModal.getByLabel('Location');
    if (await locationInput.isVisible()) {
      // Location input can be read-only; drop the attribute so fill can type
      await locationInput.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.removeAttribute('readonly');
        input.readOnly = false;
      });
      await locationInput.fill(collectionLocation);
    }
    await createCollectionModal.getByRole('button', { name: 'Create', exact: true }).click();

    await createCollectionModal.waitFor({ state: 'detached', timeout: 15000 });
    await page.waitForTimeout(200);
    await openCollection(page, collectionName);
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

type CreateTransientRequestOptions = {
  requestType?: 'HTTP' | 'GraphQL' | 'gRPC' | 'WebSocket';
};

/**
 * Create a transient request using the + icon button in the tabs area
 * Based on the CreateTransientRequest component behavior
 * @param page - The page object
 * @param options - Optional settings (requestType)
 * @returns void
 */
const createTransientRequest = async (
  page: Page,
  options: CreateTransientRequestOptions = {}
) => {
  const { requestType = 'HTTP' } = options;

  await test.step(`Create transient ${requestType} request`, async () => {
    // Find the + icon button (ActionIcon with aria-label="New Transient Request")
    const createButton = page.getByRole('button', { name: 'New Transient Request' });
    await createButton.waitFor({ state: 'visible', timeout: 5000 });

    // Click the + icon to open the dropdown
    await createButton.click({
      button: 'right'
    });

    // Wait for dropdown to be visible
    await page.locator('.dropdown-item').first().waitFor({ state: 'visible' });

    // Select the request type from dropdown
    // The dropdown items have both icon and label, we match by the label text
    await page.locator('.dropdown-item').filter({ hasText: requestType }).click();

    // Wait for the request tab to be active (transient requests show as "Untitled X")
    await page.locator('.request-tab.active').waitFor({ state: 'visible' });
    await expect(page.locator('.request-tab.active')).toContainText('Untitled');
    await page.waitForTimeout(300);
  });
};

/**
 * Fill the URL field in the currently active request
 * Works with HTTP, GraphQL, gRPC, and WebSocket requests
 * @param page - The page object
 * @param url - The URL to fill
 * @returns void
 */
const fillRequestUrl = async (page: Page, url: string) => {
  await test.step(`Fill request URL: ${url}`, async () => {
    // HTTP/GraphQL requests use #request-url
    // gRPC/WebSocket don't have a specific ID, so we need to find the CodeMirror in the active request pane
    const httpGraphqlUrl = page.locator('#request-url .CodeMirror');
    const grpcWsUrl = page.locator('.input-container .CodeMirror').first();

    // Try HTTP/GraphQL selector first
    const isHttpOrGraphql = await httpGraphqlUrl.isVisible().catch(() => false);

    if (isHttpOrGraphql) {
      await httpGraphqlUrl.click();
      await page.locator('#request-url textarea').fill(url);
    } else {
      // Fall back to generic selector for gRPC/WebSocket
      await grpcWsUrl.click();
      await page.locator('.input-container textarea').first().fill(url);
    }

    await page.waitForTimeout(200);
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

    await request.hover();
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
    }

    if (options.expectedCollectionName) {
      await openCollection(page, options.expectedCollectionName);
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

    // Wait for modal to appear - could be either regular remove or drafts confirmation
    const removeModal = page.locator('.bruno-modal').filter({ hasText: 'Remove Collection' });
    await removeModal.waitFor({ state: 'visible', timeout: 5000 });

    // Check if it's the drafts confirmation modal (has "Discard All and Remove" button)
    const hasDiscardButton = await page.getByRole('button', { name: 'Discard All and Remove' }).isVisible().catch(() => false);

    if (hasDiscardButton) {
      // Drafts modal - click "Discard All and Remove"
      await page.getByRole('button', { name: 'Discard All and Remove' }).click();
    } else {
      // Regular modal - click Remove button
      await locators.modal.button('Remove').click();
    }

    // Wait for modal to close
    await removeModal.waitFor({ state: 'hidden', timeout: 5000 });

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

    const nameInput = type === 'collection'
      ? page.locator('input[name="name"]')
      : page.locator('#environment-name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill(environmentName);
    await page.getByRole('button', { name: 'Create' }).click();

    const tabLabel = type === 'collection' ? 'Environments' : 'Global Environments';
    await expect(page.locator('.request-tab').filter({ hasText: tabLabel })).toBeVisible();

    const locators = buildCommonLocators(page);
    await page.waitForTimeout(200); // @TODO replace with dynamic waiting logic
    await locators.environment.selector().click();
    if (type === 'global') {
      await locators.environment.globalTab().click();
    }
    await locators.environment.envOption(environmentName).click();
    await expect(page.locator('.current-environment')).toContainText(environmentName);
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
 * Close the environment tab
 * @param page - The page object
 * @param type - The type of environment tab to close
 * @returns void
 */
const closeEnvironmentPanel = async (page: Page, type: EnvironmentType = 'collection') => {
  await test.step('Close environment tab', async () => {
    const tabLabel = type === 'collection' ? 'Environments' : 'Global Environments';
    const envTab = page.locator('.request-tab').filter({ hasText: tabLabel });
    await envTab.hover();
    await envTab.getByTestId('request-tab-close-icon').click();
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
const openRequest = async (page: Page, collectionName: string, requestName: string, { persist = false } = {}) => {
  await test.step(`Navigate to collection "${collectionName}" and open request "${requestName}"`, async () => {
    const collectionContainer = page.getByTestId('sidebar-collection-row').filter({ hasText: collectionName });
    await collectionContainer.click();
    const collectionWrapper = collectionContainer.locator('..');
    const request = collectionWrapper.getByTestId('sidebar-collection-item-row').filter({ hasText: requestName });
    if (!persist) {
      await request.click();
    } else {
      await request.dblclick();
    }
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
  await test.step(`Wait for request to open up "${tabName}"`, async () => {
    const requestPane = page.locator('.request-pane > .px-4');
    await expect(requestPane).toBeVisible();
    await expect(requestPane.locator('.tabs')).toBeVisible();
  });
  await test.step(`Select request pane tab "${tabName}"`, async () => {
    const visibleTab = page.locator('.tabs').getByRole('tab', { name: tabName });

    // Check if tab is directly visible
    if (await visibleTab.isVisible()) {
      await visibleTab.click();
      await expect(visibleTab).toContainClass('active');
      return;
    }

    const overflowButton = page.locator('.tabs .more-tabs');
    // Check if there's an overflow dropdown
    if (await overflowButton.isVisible()) {
      await overflowButton.click();

      // Wait for dropdown to appear and click the menu item (overflow tabs are rendered as menuitems)
      const dropdownItem = page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName });
      await dropdownItem.click();
      await expect(visibleTab).toContainClass('active');
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

// Map button testIds to menu item IDs
const buttonToMenuItemMap: Record<string, string> = {
  'response-copy-btn': 'copy-response',
  'response-bookmark-btn': 'save-response',
  'response-download-btn': 'download-response',
  'response-clear-btn': 'clear-response',
  'response-layout-toggle-btn': 'change-layout'
};

// Click a response action - handles both visible buttons and menu items
const clickResponseAction = async (page: Page, actionTestId: string) => {
  const actionButton = page.getByTestId(actionTestId).first();
  if (await actionButton.isVisible()) {
    await actionButton.click();
  } else {
    // Open the menu dropdown
    const menu = page.getByTestId('response-actions-menu');
    await menu.click();

    // Click the corresponding menu item
    const menuItemId = buttonToMenuItemMap[actionTestId];
    if (menuItemId) {
      await page.locator(`[role="menuitem"][data-item-id="${menuItemId}"]`).click();
    } else {
      throw new Error(`Unknown action testId: ${actionTestId}. Add mapping to buttonToMenuItemMap.`);
    }
  }
};

type AssertionInput = {
  expr: string;
  value: string;
  operator?: string;
};

/**
 * Add an assertion to the current request (adds to the last empty row)
 * @param page - The page object
 * @param assertion - The assertion to add (expr, value, optional operator)
 * @returns The row index where the assertion was added
 */
const addAssertion = async (page: Page, assertion: AssertionInput): Promise<number> => {
  const operator = assertion.operator || 'eq';

  return await test.step(`Add assertion: ${assertion.expr} ${operator} ${assertion.value}`, async () => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    // Ensure assertions table is visible
    await expect(table.container()).toBeVisible();

    // Find the last row (which is the empty row for adding new assertions)
    const rowCount = await table.allRows().count();
    const targetRowIndex = rowCount - 1; // Last row is the empty row

    // Wait for the row to exist
    await expect(table.row(targetRowIndex)).toBeVisible();

    // Fill in the expression
    const exprInput = table.rowExprInput(targetRowIndex);
    await expect(exprInput).toBeVisible({ timeout: 2000 });
    await exprInput.click();
    await page.keyboard.type(assertion.expr);

    // The component creates a new empty row when the key field is filled
    await expect(table.allRows()).toHaveCount(rowCount + 1);

    // Fill in the value first (defaults to 'eq value')
    const valueInput = table.rowValueInput(targetRowIndex);
    await valueInput.click();
    await page.keyboard.type(assertion.value);

    // Select the operator from dropdown (if provided and not default 'eq')
    // This will update the value field to combine operator + value
    if (assertion.operator && assertion.operator !== 'eq') {
      const operatorSelect = table.rowOperatorSelect(targetRowIndex);
      await operatorSelect.selectOption(assertion.operator);
    }

    // Wait for the assertion to be fully processed
    // Verify the expression was actually saved by checking the input value
    const exprInputAfter = table.rowExprInput(targetRowIndex);
    await expect(exprInputAfter).toHaveValue(assertion.expr, { timeout: 2000 });

    return targetRowIndex;
  });
};

/**
 * Edit an assertion at a specific row index
 * @param page - The page object
 * @param rowIndex - The row index of the assertion to edit
 * @param assertion - The assertion data to update (expr, value, optional operator)
 * @returns void
 */
const editAssertion = async (page: Page, rowIndex: number, assertion: AssertionInput) => {
  const operator = assertion.operator || 'eq';

  await test.step(`Edit assertion at row ${rowIndex}: ${assertion.expr} ${operator} ${assertion.value}`, async () => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    // Ensure assertions table is visible
    await expect(table.container()).toBeVisible();

    // Wait for the row to exist
    await expect(table.row(rowIndex)).toBeVisible();

    // Update the expression
    const exprInput = table.rowExprInput(rowIndex);
    await expect(exprInput).toBeVisible({ timeout: 2000 });
    await exprInput.click();
    // Clear the input and type new value - use triple-click to select all (works cross-platform)
    await exprInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace'); // Clear selection
    await page.keyboard.type(assertion.expr);

    // Update the operator from dropdown (if provided)
    if (assertion.operator) {
      const operatorSelect = table.rowOperatorSelect(rowIndex);
      await operatorSelect.selectOption(assertion.operator);
    }

    // Update the value (just the value, operator is already selected)
    // The value cell contains a SingleLineEditor, so we need to click and type
    const valueInput = table.rowValueInput(rowIndex);
    await valueInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace'); // Clear selection
    await page.keyboard.type(assertion.value);
  });
};

/**
 * Delete an assertion from the current request by row index
 * @param page - The page object
 * @param rowIndex - The row index of the assertion to delete
 * @returns void
 */
const deleteAssertion = async (page: Page, rowIndex: number) => {
  await test.step(`Delete assertion at row ${rowIndex}`, async () => {
    const locators = buildCommonLocators(page);
    const table = locators.assertionsTable();

    await expect(table.container()).toBeVisible();

    const initialRowCount = await table.allRows().count();
    const deleteButton = table.rowDeleteButton(rowIndex);

    await deleteButton.click();
    await expect(table.allRows()).toHaveCount(initialRowCount - 1);
  });
};

/**
 * Save the current request and verify success toast
 * @param page - The page object
 * @returns void
 */
const saveRequest = async (page: Page) => {
  await test.step('Save request', async () => {
    await page.keyboard.press('Meta+s');
    await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(200);
  });
};

export {
  closeAllCollections,
  openCollection,
  createCollection,
  createRequest,
  createUntitledRequest,
  createTransientRequest,
  fillRequestUrl,
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
  clickResponseAction,
  addAssertion,
  editAssertion,
  deleteAssertion,
  saveRequest
};

export type { SandboxMode, EnvironmentType, EnvironmentVariable, ImportCollectionOptions, CreateRequestOptions, CreateUntitledRequestOptions, CreateTransientRequestOptions, AssertionInput };
