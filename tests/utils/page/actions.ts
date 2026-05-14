import { test, expect, Page } from '../../../playwright';
import process from 'node:process';
import { buildCommonLocators, buildScriptErrorLocators } from './locators';

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
const createCollection = async (
  page,
  collectionName: string,
  collectionLocation: string,
  format?: 'bru' | 'yml'
) => {
  await test.step(`Create collection "${collectionName}"`, async () => {
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Create collection' }).click();

    // Wait for inline creator to appear, then click the cog button to open advanced modal
    const inlineCreator = page.locator('.inline-collection-creator');
    await inlineCreator.waitFor({ state: 'visible', timeout: 5000 });
    await inlineCreator.locator('.cog-btn').click();

    const createCollectionModal = page.locator('.bruno-modal-card').filter({ hasText: 'Create Collection' });
    await createCollectionModal.waitFor({ state: 'visible', timeout: 5000 });

    // Fill location FIRST — some modals auto-derive the name from the path,
    // so filling name after location ensures it isn't overwritten.
    const locationInput = createCollectionModal.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.evaluate((el) => {
        const input = el as HTMLInputElement;
        input.removeAttribute('readonly');
        input.readOnly = false;
      });
      await locationInput.fill(collectionLocation);
    }
    const nameInput = createCollectionModal.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill(collectionName);
    // Verify the name is correct before creating
    await expect(nameInput).toHaveValue(collectionName, { timeout: 2000 });

    if (format) {
      await createCollectionModal.locator('.advanced-options .btn-advanced').click();
      await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Show File Format' }).click();
      const formatSelect = createCollectionModal.locator('#format');
      await formatSelect.waitFor({ state: 'visible', timeout: 5000 });
      await formatSelect.selectOption(format);
    }

    await createCollectionModal.getByRole('button', { name: 'Create', exact: true }).click();

    await createCollectionModal.waitFor({ state: 'detached', timeout: 15000 });
    // Wait for the collection name to appear in the sidebar before proceeding
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).waitFor({ state: 'visible', timeout: 5000 });
    await openCollection(page, collectionName);
  });
};

const STANDARD_HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];

type CreateRequestOptions = {
  url?: string;
  method?: string;
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
      await page.locator('#request-actions').getByTitle('Save Request').click();
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
      const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
      await page.keyboard.press(saveShortcut);
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
  const { url, method, inFolder = false } = options;
  const parentType = inFolder ? 'folder' : 'collection';

  await test.step(`Create request "${requestName}" in ${parentType} "${parentName}"`, async () => {
    const locators = buildCommonLocators(page);

    if (inFolder) {
      await locators.sidebar.folder(parentName).hover();
      await locators.actions.collectionItemActions(parentName).click();
    } else {
      await locators.sidebar.collection(parentName).hover();
      const collectionAction = locators.actions.collectionActions(parentName);
      await expect(collectionAction).toBeVisible({ timeout: 2000 });
      await collectionAction.click();
    }

    await locators.dropdown.item('New Request').click();
    await page.getByPlaceholder('Request Name').fill(requestName);

    if (method) {
      await page.locator('.bruno-modal .method-selector').click();
      const isStandardMethod = STANDARD_HTTP_METHODS.includes(method.toUpperCase());
      if (isStandardMethod) {
        await locators.modal.newRequestMethodOption(method).click();
      } else {
        await locators.modal.newRequestMethodOption('add-custom').click();
        await page.locator('.bruno-modal .method-selector input').fill(method);
        await page.keyboard.press('Enter');
      }
      await page.waitForTimeout(200);
    }

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
 * Delete a collection permanently from disk via the workspace overview page
 * @param page - The page object
 * @param collectionName - The name of the collection to delete
 * @returns void
 */
const deleteCollectionFromOverview = async (page: Page, collectionName: string) => {
  await test.step(`Delete collection "${collectionName}" from workspace overview`, async () => {
    // Navigate to workspace overview
    await page.locator('.home-button').click();
    const overviewTab = page.locator('.request-tab').filter({ hasText: 'Overview' });
    await overviewTab.click();

    // Find the collection card and open its menu
    const collectionCard = page.locator('.collection-card').filter({ hasText: collectionName });
    await collectionCard.waitFor({ state: 'visible', timeout: 5000 });
    await collectionCard.locator('.collection-menu').click();

    // Click Delete from the dropdown
    await page.locator('.dropdown-item').filter({ hasText: 'Delete' }).click();

    // Wait for delete confirmation modal
    const deleteModal = page.locator('.bruno-modal').filter({ hasText: 'Delete Collection' });
    await deleteModal.waitFor({ state: 'visible', timeout: 5000 });

    // Type 'delete' to confirm
    await deleteModal.locator('#delete-confirm-input').fill('delete');

    // Click the Delete button
    await deleteModal.getByRole('button', { name: 'Delete', exact: true }).click();

    // Wait for modal to close
    await deleteModal.waitFor({ state: 'hidden', timeout: 10000 });
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
    await page.getByTestId('new-folder-input').fill(folderName);
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
    await envTab.getByTestId('request-tab-close-icon').click({ force: true });
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
  expectedStatusCode?: number,
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
 * @param expectedStatusCode - The expected status code (default: 200)
 * @param options - The options for sending the request (default: { timeout: 15000 })
 */
const sendRequestAndWaitForResponse = async (page: Page,
  expectedStatusCode: number = 200,
  options: {
    ignoreCase?: boolean;
    timeout?: number;
    useInnerText?: boolean;
  } = { timeout: 15000 }) => {
  await test.step(`Send request and wait for status code ${expectedStatusCode}`, async () => {
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText(String(expectedStatusCode), options);
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
    // Wait for dropdown to be visible before clicking the format option
    const dropdown = page.getByTestId('format-response-tab-dropdown');
    await dropdown.waitFor({ state: 'visible' });
    await dropdown.getByText(format).click();
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const trySelectPaneTabOnce = async (page: Page, paneSelector: string, tabName: string) => {
  const pane = page.locator(paneSelector);
  const visibleTab = pane.locator('.tabs').getByRole('tab', { name: tabName });

  if (await visibleTab.isVisible().catch(() => false)) {
    try {
      await visibleTab.click({ timeout: 2000 });
      await expect(visibleTab).toContainClass('active', { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  }

  const overflowButton = pane.locator('.tabs .more-tabs');
  if (!(await overflowButton.isVisible().catch(() => false))) {
    return false;
  }

  try {
    await overflowButton.click({ force: true, timeout: 1000 });
  } catch {
    return false;
  }

  const dropdownItem = page
    .getByRole('menuitem', { name: new RegExp(escapeRegExp(tabName), 'i') })
    .first();

  if (await dropdownItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    try {
      await dropdownItem.click({ force: true, timeout: 2000 });
      await expect(visibleTab).toContainClass('active', { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  }

  const fallbackDropdownItem = page.locator('.tippy-box .dropdown-item').filter({ hasText: tabName }).first();
  if (await fallbackDropdownItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    try {
      await fallbackDropdownItem.click({ force: true, timeout: 2000 });
      await expect(visibleTab).toContainClass('active', { timeout: 500 });
      return true;
    } catch {
      return false;
    }
  }

  return false;
};

const selectPaneTab = async (page: Page, paneSelector: string, tabName: string) => {
  await test.step(`Select tab "${tabName}" in ${paneSelector}`, async () => {
    const pane = page.locator(paneSelector);
    await expect(pane).toBeVisible();
    await expect(pane.locator('.tabs')).toBeVisible();

    await expect
      .poll(
        async () => trySelectPaneTabOnce(page, paneSelector, tabName),
        {
          message: `Tab "${tabName}" not found in visible tabs or overflow dropdown`,
          timeout: 8000,
          intervals: [100, 150, 200, 250]
        }
      )
      .toBe(true);
  });
};

const selectResponsePaneTab = async (page: Page, tabName: string) => {
  await selectPaneTab(page, '[data-testid="response-pane"]', tabName);
};

const selectRequestPaneTab = async (page: Page, tabName: string) => {
  await selectPaneTab(page, '[data-testid="request-pane"] > .px-4', tabName);
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
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(200);
  });
};

/**
 * Close all open request tabs using the right-click context menu
 * @param page - The page object
 * @returns void
 */
const closeAllTabs = async (page: Page) => {
  await test.step('Close all tabs', async () => {
    // Find actual request tabs (those with .tab-method, not Overview/Environments)
    const requestTabLabel = page.locator('.request-tab').filter({ has: page.locator('.tab-method') }).locator('.tab-label').first();
    if (!(await requestTabLabel.isVisible().catch(() => false))) {
      return; // No request tabs to close
    }

    // Right-click on the tab label to open context menu
    await requestTabLabel.click({ button: 'right' });

    // Wait for the dropdown menu to appear
    const dropdown = page.locator('.tippy-box.dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    // Click "Close All" menu item
    await dropdown.locator('[role="menuitem"][data-item-id="close-all"]').click();

    // Handle "Unsaved Transient Requests" modal if it appears
    const discardAllButton = page.getByRole('button', { name: 'Discard All' });
    if (await discardAllButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardAllButton.click();
    }
  });
};

/**
 * Create a new workspace via the title bar dropdown inline rename flow
 * @param page - The page object
 * @param workspaceName - The name of the workspace to create
 * @returns void
 */
const createWorkspace = async (page: Page, workspaceName: string) => {
  await test.step(`Create workspace "${workspaceName}"`, async () => {
    await page.locator('.workspace-name-container').click();
    await page.locator('.dropdown-item').filter({ hasText: 'Create workspace' }).click();

    const renameInput = page.locator('.workspace-name-input');
    await expect(renameInput).toBeVisible({ timeout: 5000 });
    await renameInput.fill(workspaceName);
    await renameInput.press('Enter');

    await expect(page.getByText('Workspace created!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

/**
 * Switch to an existing workspace via the title bar dropdown
 * @param page - The page object
 * @param workspaceName - The name of the workspace to switch to
 * @returns void
 */
const switchWorkspace = async (page: Page, workspaceName: string) => {
  await test.step(`Switch to workspace "${workspaceName}"`, async () => {
    await page.locator('.workspace-name-container').click();
    await page.locator('.workspace-item, .dropdown-item').filter({ hasText: workspaceName }).click();
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

/**
 * Navigate to a Script sub-tab (pre-request / post-response)
 * @param page - The page object
 * @param subTab - The sub-tab to select
 */
const selectScriptSubTab = async (page: Page, subTab: 'pre-request' | 'post-response') => {
  await test.step(`Select Script sub-tab "${subTab}"`, async () => {
    await selectRequestPaneTab(page, 'Script');
    const trigger = buildCommonLocators(page).paneTabs.tabTrigger(subTab);
    await trigger.click();
    await expect(trigger).toContainClass('active');
  });
};

/**
 * Clear and type into a CodeMirror editor identified by test ID
 * @param page - The page object
 * @param editorTestId - The test ID of the editor container
 * @param newContent - The content to type
 */
const editCodeMirrorEditor = async (page: Page, editorTestId: string, newContent: string) => {
  await test.step(`Edit CodeMirror editor "${editorTestId}"`, async () => {
    const locators = buildCommonLocators(page);
    const editor = locators.codeMirror.byTestId(editorTestId);
    await editor.waitFor({ state: 'visible' });
    const textarea = editor.locator('textarea[tabindex="0"]');
    await textarea.focus();
    const selectAll = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';
    await page.keyboard.press(selectAll);
    await page.keyboard.press('Backspace');
    await page.keyboard.type(newContent, { delay: 5 });
  });
};

/**
 * Add a pre-request script (navigates to Script > Pre Request and replaces editor content)
 * @param page - The page object
 * @param content - The script content to add
 */
const addPreRequestScript = async (page: Page, content: string) => {
  await test.step('Add pre-request script', async () => {
    await selectScriptSubTab(page, 'pre-request');
    await editCodeMirrorEditor(page, 'pre-request-script-editor', content);
  });
};

/**
 * Add a post-response script (navigates to Script > Post Response and replaces editor content)
 * @param page - The page object
 * @param content - The script content to add
 */
const addPostResponseScript = async (page: Page, content: string) => {
  await test.step('Add post-response script', async () => {
    await selectScriptSubTab(page, 'post-response');
    await editCodeMirrorEditor(page, 'post-response-script-editor', content);
  });
};

/**
 * Add a test script (navigates to Tests tab and replaces editor content)
 * @param page - The page object
 * @param content - The test script content to add
 */
const addTestScript = async (page: Page, content: string) => {
  await test.step('Add test script', async () => {
    await selectRequestPaneTab(page, 'Tests');
    await editCodeMirrorEditor(page, 'test-script-editor', content);
  });
};

/**
 * Click send and wait for at least one error card to appear.
 * @param page - The page object
 */
const sendAndWaitForErrorCard = async (page: Page) => {
  await test.step('Send request and wait for error card', async () => {
    const { request } = buildCommonLocators(page);
    const scriptErrorLocators = buildScriptErrorLocators(page);
    await request.sendButton().click();
    await scriptErrorLocators.card().waitFor({ state: 'visible', timeout: 15000 });
  });
};

/**
 * Click send and wait for a response status code to appear.
 * Used for requests that succeed at HTTP level but may have post-response/test errors.
 * @param page - The page object
 */
const sendAndWaitForResponse = async (page: Page) => {
  await test.step('Send request and wait for response', async () => {
    const { request, response } = buildCommonLocators(page);
    await request.sendButton().click();
    await response.statusCode().waitFor({ state: 'visible', timeout: 15000 });
  });
};

const fieldEditor = (page: Page, labelText: string) =>
  page
    .locator('label')
    .filter({ hasText: new RegExp(`^${labelText}$`) })
    .locator('..')
    .locator('.single-line-editor-wrapper .CodeMirror');

/**
 * Open the auth mode dropdown and pick a mode by its visible label.
 * @param page - The page object
 * @param modeLabel - Dropdown item text (e.g. 'Bearer Token', 'Basic Auth')
 */
const selectAuthMode = async (page: Page, modeLabel: string) => {
  await page.locator('.auth-mode-label').click();
  await page.locator('.dropdown-item').filter({ hasText: modeLabel }).click();
};

/**
 * Type into a single-line CodeMirror editor identified by its sibling label.
 * @param page - The page object
 * @param labelText - Exact label text next to the editor
 * @param value - The text to type
 */
const typeIntoField = async (page: Page, labelText: string, value: string) => {
  await fieldEditor(page, labelText).click();
  await page.keyboard.type(value);
};

/**
 * Read the current value of a single-line CodeMirror editor identified by its sibling label.
 * @param page - The page object
 * @param labelText - Exact label text next to the editor
 */
const readField = async (page: Page, labelText: string): Promise<string> => {
  const editor = fieldEditor(page, labelText).first();
  await editor.waitFor({ state: 'visible' });
  return editor.evaluate((el: any) => (el as any).CodeMirror?.getValue() ?? '');
};

const createExampleFromSidebar = async (page: Page, requestName: string, exampleName: string, description: string = '') => {
  const requestRow = page.locator('.collection-item-name').filter({ hasText: requestName }).first();

  await requestRow.hover();
  await requestRow.locator('..').locator('.menu-icon').click({ force: true });
  await page.locator('.dropdown-item').filter({ hasText: 'Create Example' }).click();

  const exampleInput = page.getByTestId('create-example-name-input');
  await expect(exampleInput).toBeVisible();
  await exampleInput.clear();
  await exampleInput.fill(exampleName);
  const descriptionInput = page.getByTestId('create-example-description-input');
  await descriptionInput.clear();
  await descriptionInput.fill(description);
  await page.getByRole('button', { name: 'Create Example' }).click();
  await expect(page.locator('text=Create Response Example')).not.toBeAttached();
};

const openExampleFromSidebar = async (page: Page, requestName: string, exampleName: string, index: number = 0) => {
  const requestRow = page.locator('.collection-item-name').filter({ hasText: requestName }).first();
  const requestBranch = requestRow.locator('..');
  const exampleRow = requestBranch
    .locator('.collection-item-name')
    .filter({ has: page.locator('.example-icon') })
    .getByText(exampleName, { exact: true })
    .nth(index);

  if (!(await exampleRow.isVisible())) {
    await requestRow.getByTestId('request-item-chevron').click();
  }

  await expect(exampleRow).toBeVisible();
  await exampleRow.click();  
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
  deleteCollectionFromOverview,
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
  selectResponsePaneTab,
  sendRequestAndWaitForResponse,
  switchResponseFormat,
  switchToPreviewTab,
  switchToEditorTab,
  clickResponseAction,
  addAssertion,
  editAssertion,
  deleteAssertion,
  saveRequest,
  closeAllTabs,
  createWorkspace,
  switchWorkspace,
  selectScriptSubTab,
  editCodeMirrorEditor,
  addPreRequestScript,
  addPostResponseScript,
  addTestScript,
  sendAndWaitForErrorCard,
  sendAndWaitForResponse,
  selectAuthMode,
  typeIntoField,
  readField,
  createExampleFromSidebar,
  openExampleFromSidebar
};

export type { SandboxMode, EnvironmentType, EnvironmentVariable, ImportCollectionOptions, CreateRequestOptions, CreateUntitledRequestOptions, CreateTransientRequestOptions, AssertionInput };
