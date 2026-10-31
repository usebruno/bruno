import { test, expect, Page } from '../..';
import { buildRequestLocators, selectRequestPaneTab } from './pane';
import { buildSidebarLocators } from '../sidebar/collection-tree';
import { buildItemActionLocators } from '../sidebar/item-actions';
import { buildDropdownLocators } from '../shared-ui/dropdown';
import { buildModalLocators } from '../shared-ui/modal';
import { buildRequestTabsLocators } from '../request-tabs';

const buildLocators = (page: Page) => ({
  sidebar: buildSidebarLocators(page),
  actions: buildItemActionLocators(page),
  dropdown: buildDropdownLocators(page),
  modal: buildModalLocators(page),
  tabs: buildRequestTabsLocators(page),
  request: buildRequestLocators(page)
});

export const STANDARD_HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'];

export type CreateRequestOptions = {
  url?: string;
  method?: string;
  inFolder?: boolean;
  requestType?: 'http' | 'graphql' | 'ws' | 'grpc';
};

export type CreateUntitledRequestOptions = {
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
export const createUntitledRequest = async (
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
      await page.locator('#request-actions').getByTestId('save-request-button').click();
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

export type CreateTransientRequestOptions = {
  requestType?: 'HTTP' | 'GraphQL' | 'gRPC' | 'WebSocket';
};

/**
 * Create a transient request using the + icon button in the tabs area
 * Based on the CreateTransientRequest component behavior
 * @param page - The page object
 * @param options - Optional settings (requestType)
 * @returns void
 */
export const createTransientRequest = async (
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
 * Create a transient request by left-clicking the + icon, which uses the
 * collection's default request type preset instead of the dropdown
 * @param page - The page object
 * @returns void
 */
export const createTransientRequestFromPreset = async (page: Page) => {
  await test.step('Create transient request from the collection preset', async () => {
    const createButton = page.getByRole('button', { name: 'New Transient Request' });
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    await createButton.click();

    const activeTab = buildLocators(page).tabs.activeRequestTab();
    await expect(activeTab).toContainText('Untitled');
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
export const createRequest = async (
  page: Page,
  requestName: string,
  parentName: string,
  options: CreateRequestOptions = {}
) => {
  const { url, method, inFolder = false, requestType = 'http' } = options;
  const parentType = inFolder ? 'folder' : 'collection';
  const hasMethodSelector = requestType === 'http' || requestType === 'graphql';

  await test.step(`Create ${requestType.toUpperCase()} request "${requestName}" in ${parentType} "${parentName}"`, async () => {
    const locators = buildLocators(page);

    if (inFolder) {
      await locators.sidebar.folder(parentName).hover();
      await locators.actions.collectionItemActions(parentName).click();
    } else {
      const collectionRow = locators.sidebar.collection(parentName);
      const collectionAction = locators.actions.collectionActions(parentName);
      // Re-hover on each poll: CSS `:hover` reveals `.collection-actions`, but sidebar
      // re-renders (e.g. workspace snapshot hydration) can shift the row out from under a one-shot hover().
      await expect(async () => {
        await collectionRow.hover();
        await expect(collectionAction).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
      await collectionAction.click();
    }

    await locators.dropdown.item('New Request').click();

    // The modal defaults to HTTP; switch the radio for the other three types.
    if (requestType !== 'http') {
      await page.getByTestId(`${requestType}-request`).click();
    }

    await page.getByPlaceholder('Request Name').fill(requestName);

    if (method && hasMethodSelector) {
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

// Save the active transient (untitled) request via the Save modal, giving it a
// display name. Waits for the modal to open and close.
export const saveTransientRequestAs = async (page: Page, name: string) => {
  await test.step(`Save transient request as "${name}"`, async () => {
    const { sidebar } = buildLocators(page);
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    const dialog = sidebar.saveRequestModal.modal();

    await page.keyboard.press(`${modifier}+s`);
    await dialog.waitFor({ state: 'visible' });
    await sidebar.saveRequestModal.nameInput().clear();
    await sidebar.saveRequestModal.nameInput().fill(name);
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'hidden' });
  });
};

// Request-type radios in the New Request dialog. `from-curl` is the odd one out —
// the rest follow the `<type>-request` testid convention.
type NewRequestType = 'http-request' | 'graphql-request' | 'grpc-request' | 'ws-request' | 'from-curl';

/**
 * Locators for the New Request dialog — the request-type radios and the
 * type-specific fields (e.g. the cURL command box for `from-curl`).
 */
export const buildNewRequestLocators = (page: Page) => ({
  requestTypeOption: (type: NewRequestType) => page.getByTestId(type),
  curlCommandInput: () => page.getByTestId('curl-command')
});

export type CreateRequestFromCurlOptions = {
  inFolder?: boolean;
};

/**
 * Create a request by importing a cURL command via the New Request dialog.
 * @param page - The page object
 * @param requestName - The name to give the created request
 * @param curlCommand - The cURL command to import
 * @param parentName - The name of the collection or folder
 * @param options - Optional settings (inFolder)
 * @returns void
 */
export const createRequestFromCurl = async (
  page: Page,
  requestName: string,
  curlCommand: string,
  parentName: string,
  options: CreateRequestFromCurlOptions = {}
) => {
  const { inFolder = false } = options;
  const parentType = inFolder ? 'folder' : 'collection';

  await test.step(`Create request "${requestName}" from cURL in ${parentType} "${parentName}"`, async () => {
    const { sidebar, actions, dropdown, modal, request } = buildLocators(page);
    const newRequest = buildNewRequestLocators(page);

    if (inFolder) {
      await sidebar.folder(parentName).hover();
      await actions.collectionItemActions(parentName).click();
    } else {
      const collectionRow = sidebar.collection(parentName);
      const collectionAction = actions.collectionActions(parentName);
      // Re-hover on each poll: CSS `:hover` reveals `.collection-actions`, but sidebar
      // re-renders can shift the row out from under a one-shot hover().
      await expect(async () => {
        await collectionRow.hover();
        await expect(collectionAction).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 5000 });
      await collectionAction.click();
    }

    await dropdown.item('New Request').click();

    await newRequest.requestTypeOption('from-curl').click();
    await request.requestNameInput().fill(requestName);
    await newRequest.curlCommandInput().fill(curlCommand);

    await modal.button('Create').click();

    if (inFolder) {
      await expect(sidebar.folderRequest(parentName, requestName)).toBeVisible();
    } else {
      await expect(sidebar.request(requestName)).toBeVisible();
    }
  });
};
