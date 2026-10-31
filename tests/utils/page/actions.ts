import { test, expect, Page, Locator, ElectronApplication, waitForReadyPage as waitForReadyPageImpl } from '../../../playwright';
import process from 'node:process';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { buildCommonLocators, buildGrpcCommonLocators, PresetRequestType } from './locators';
import { waitForCollectionMount } from './mounting';
import { buildPreferencesLocators, openPreferences, selectPreferencesTab } from './preferences';
import { revealCollectionsTop, revealFolderRow } from './sidebar';
import { switchResponseFormat, switchToPreviewTab, switchToEditorTab, expandAllXmlNodes, getResponseBody, selectResponsePaneTab, selectResponsePaneTabViaOverflow, expectResponseContains, clickResponseAction, resetResponse } from '../../../playwright/pages/response';
import { sendRequest, sendRequestAndWaitForResponse, sendAndWaitForErrorCard, sendAndWaitForResponse } from '../../../playwright/pages/request/send';
import { createExampleFromSidebar } from '../../../playwright/pages/response-example';
import { selectRequestPaneTab, openRequestPaneTabOverflow, requestPaneOverflowTabItem, saveRequest, fillRequestUrl, setRequestUrlAndSave } from '../../../playwright/pages/request/pane';
import { selectRequestBodyMode, readRequestBody, setTextBody, mockBrowseFiles, addMultipartFileToLastRow, removeFirstMultipartFile } from '../../../playwright/pages/request/body';
import { addAssertion, editAssertion, deleteAssertion } from '../../../playwright/pages/request/assertions';
import { selectScriptSubTab, addPreRequestScript, addPostResponseScript, writeScriptContent, readScriptContent, addTestScript } from '../../../playwright/pages/request/script';
import { selectAuthMode } from '../../../playwright/pages/request/auth';
import { expectRequestMaxRedirects } from '../../../playwright/pages/request/settings';
import { editCodeMirrorEditor, setCodeMirrorEditorValue, setCodeMirrorValue } from '../../../playwright/pages/components/code-editor';
import { fieldEditor, typeIntoField, writeFieldValue, readField } from '../../../playwright/pages/components/single-line-editor';
import { createUntitledRequest, createTransientRequest, createTransientRequestFromPreset, createRequest, saveTransientRequestAs } from '../../../playwright/pages/request/create';
import { addGrpcMessage, generateGrpcSampleMessage, sendGrpcRequest, streamGrpcMessagesAndEndCall } from '../../../playwright/pages/request/grpc';

type SandboxMode = 'safe' | 'developer';

type CollectionFormat = 'bru' | 'yml';

type WaitForAppReadyOptions = {
  timeout?: number;
};

/**
 * Read an element's scroll dimensions for asserting scroll/overflow behavior.
 */
export const getScrollMetrics = (locator: Locator) =>
  locator.evaluate((el) => ({ scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop }));

/**
 * Wait for the Electron app to have a ready, loaded window.
 * Handles cases where the first window is slow to appear.
 */
const waitForReadyPage = (
  app: ElectronApplication,
  options: WaitForAppReadyOptions = {}
) => waitForReadyPageImpl(app, options);

/**
 * Read the system clipboard through the renderer, which is where the app's copy
 * buttons write. Windows hands multi-line text back as CRLF, so line endings are
 * normalized and callers can compare against plain \n.
 * @param page - The page object
 * @returns The clipboard's text
 */
const readClipboard = async (page: Page): Promise<string> => {
  const text = await page.evaluate(() => navigator.clipboard.readText());
  return text.replace(/\r\n/g, '\n');
};

/**
 * Dismiss all import issues toasts (they use infinite duration and persist across tests).
 * @param page - The page object
 * @returns void
 */
const dismissImportIssuesToasts = async (page: Page) => {
  await test.step('Dismiss import issues toasts', async () => {
    const toasts = page.getByTestId('import-issues-toast');
    while (await toasts.count() > 0) {
      const toast = toasts.first();
      await toast.getByTestId('import-issues-toast-close').click();
      await expect(toast).not.toBeVisible({ timeout: 5000 });
    }
  });
};

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
      await firstCollection.scrollIntoViewIfNeeded();

      const removeMenuItem = page.locator('.dropdown-item').getByText('Remove', { exact: true });
      await expect(async () => {
        await firstCollection.hover();
        await firstCollection.locator('.collection-actions .icon').click({ force: true });
        await expect(removeMenuItem).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });
      await removeMenuItem.click();

      // Wait for modal to appear - could be either regular remove or drafts confirmation
      const removeModal = page.locator('.bruno-modal').filter({ hasText: /Remove Collections?/ });
      await removeModal.waitFor({ state: 'visible', timeout: 5000 });

      // Check if it's the drafts confirmation modal (has "Discard All and Remove" button)
      const hasDiscardButton = await page.getByRole('button', { name: 'Discard All and Remove' }).isVisible().catch(() => false);

      if (hasDiscardButton) {
        // Drafts modal - the modal animates in and the footer can shift mid-frame,
        // causing Playwright's "element is stable" actionability check to fail
        // intermittently on slower machines. Use force to skip the stability check;
        // visibility is already verified above via waitFor.
        await page.getByRole('button', { name: 'Discard All and Remove' }).click({ force: true });
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
const openCollection = async (page: Page, collectionName: string) => {
  await test.step(`Open collection "${collectionName}"`, async () => {
    await revealCollectionsTop(page);
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).click();
  });
};

/**
 * Open a collection living at an arbitrary filesystem path via the native "Open Collection"
 * flow — mocks `dialog.showOpenDialog` to return `collectionPath` directly (no real file
 * picker), then drives the "+" menu's "Open collection" item. Useful for loading a committed
 * fixture collection copied to a tmp dir (e.g. via the `collectionFixturePath` fixture).
 * @param page - The page object
 * @param electronApp - The Electron application object
 * @param collectionPath - Absolute path to the collection folder to open
 * @returns void
 */
const openCollectionFromDialog = async (page: Page, electronApp: ElectronApplication, collectionPath: string) => {
  await test.step(`Open collection from dialog at "${collectionPath}"`, async () => {
    await electronApp.evaluate(({ dialog }, dir) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [dir] });
    }, collectionPath);

    const locators = buildCommonLocators(page);
    await locators.plusMenu.button().click();
    await locators.plusMenu.openCollection().click();
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
  format: CollectionFormat = 'yml'
) => {
  await test.step(`Create ${format} collection "${collectionName}"`, async () => {
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
    //
    // The location input is `readOnly={true}` as a React prop and is a
    // controlled input via formik. Two implications:
    //   1. Removing `readonly` via DOM attribute is racy — the next React
    //      render restores the prop. The modal's mount-effect focuses the
    //      name field at +50ms, which can trigger that re-render between
    //      our DOM tweak and the `fill()`, leaving the input read-only and
    //      the fill silently no-ops.
    //   2. Even if writable, controlled inputs require firing an `input`
    //      event so the onChange handler runs and updates formik state.
    // Use the native value setter (the React-controlled-input pattern) to
    // bypass both. Then verify the value stuck so we fail loudly here
    // instead of opaquely at the modal-hidden wait when Yup validation
    // silently rejects an empty location.
    const locationInput = createCollectionModal.getByLabel('Location');
    if (await locationInput.isVisible()) {
      await locationInput.evaluate((el, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, collectionLocation);
      await expect(locationInput).toHaveValue(collectionLocation);
    }
    const nameInput = createCollectionModal.getByLabel('Name');
    await nameInput.clear();
    await nameInput.fill(collectionName);
    // Verify the name is correct before creating
    await expect(nameInput).toHaveValue(collectionName, { timeout: 2000 });

    if (format) {
      const advancedBtn = createCollectionModal.locator('.advanced-options .btn-advanced');
      const showAdvancedOptionsToggle = page.getByTestId('show-advanced-options-toggle');
      const formatSelect = createCollectionModal.locator('#format');

      await expect(async () => {
        if (!(await formatSelect.isVisible())) {
          await advancedBtn.click();
          await showAdvancedOptionsToggle.click({ timeout: 2000 });
        }
        await expect(formatSelect).toBeVisible({ timeout: 2000 });
      }).toPass({ timeout: 15000 });

      await formatSelect.selectOption(format);
    }

    await createCollectionModal.getByRole('button', { name: 'Create', exact: true }).click();

    // The modal closes via `onClose()` in the form's `onSubmit` success path,
    // which only runs after Yup validation passes — so this waitFor is the
    // signal that the form actually submitted
    await createCollectionModal.waitFor({ state: 'hidden', timeout: 5000 });
    await expect(page.locator('.bruno-modal-backdrop')).toHaveCount(0);
    // Wait for the collection name to appear in the sidebar before proceeding
    await page.locator('#sidebar-collection-name').filter({ hasText: collectionName }).waitFor({ state: 'visible', timeout: 5000 });
    await openCollection(page, collectionName);
  });
};

/**
 * Set the collection's default request type preset and save it
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param requestType - The preset request type to select
 * @returns void
 */
const setRequestTypePreset = async (page: Page, collectionName: string, requestType: PresetRequestType) => {
  await test.step(`Set the default request type preset to "${requestType}"`, async () => {
    const locators = buildCommonLocators(page);

    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'presets');
    await locators.presets.requestType(requestType).check();
    await expect(locators.presets.requestType(requestType)).toBeChecked();

    await locators.presets.saveBtn().click();

    // the settings tab keeps a draft indicator until the presets are persisted
    await expect(locators.tabs.tabDraftIndicator(locators.tabs.collectionSettingsTab())).toBeHidden();
  });
};

/**
 * Set the Base URL preset for a collection.
 * New requests created in the collection inherit this as their starting URL.
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param requestUrl - The Base URL to save as the preset
 * @returns void
 */
const setRequestUrlPreset = async (page: Page, collectionName: string, requestUrl: string) => {
  await test.step(`Set the Base URL preset to "${requestUrl}"`, async () => {
    const locators = buildCommonLocators(page);

    await openCollectionSettings(page, collectionName);
    await selectCollectionPaneTab(page, 'presets');

    const urlInput = locators.presets.requestUrl();
    await urlInput.waitFor({ state: 'visible' });
    await urlInput.fill(requestUrl);
    await locators.presets.saveBtn().click();

    await locators.tabs.tabDraftIndicator(locators.tabs.collectionSettingsTab()).waitFor({ state: 'hidden' });
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
  expectIssues?: boolean;
  sidebarTimeout?: number;
  preserveScripts?: boolean;
};

const importCollection = async (
  page: Page,
  filePath: string,
  collectionLocation: string,
  options: ImportCollectionOptions = {}
) => {
  await test.step(`Import collection from "${filePath}"`, async () => {
    const locators = buildCommonLocators(page);

    await locators.plusMenu.button().click();
    await locators.plusMenu.importCollection().click();

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

    // Enable 'Preserve scripts' option via the Advanced Options toggle
    if (options.preserveScripts) {
      await locationModal.getByRole('button', { name: 'Options' }).click();
      await locators.import.advancedOptionsToggle().click();
      const preserveScriptsCheckbox = locators.import.preserveScriptsToggle();
      await preserveScriptsCheckbox.check();
      await expect(preserveScriptsCheckbox).toBeChecked();
    }

    // Set location and import
    await page.locator('#collection-location').fill(collectionLocation);
    await locationModal.getByRole('button', { name: 'Import' }).click();

    // Wait for collection to appear in sidebar
    if (options.expectedCollectionName) {
      await expect(
        page.locator('#sidebar-collection-name').filter({ hasText: options.expectedCollectionName })
      ).toBeVisible({ timeout: options.sidebarTimeout ?? 5000 });
    }

    // Wait for import issues toast if expected
    if (options.expectIssues) {
      await expect(locators.import.issuesToast()).toBeVisible({ timeout: 10000 });
    }

    if (options.expectedCollectionName) {
      await openCollection(page, options.expectedCollectionName);
    }
  });
};

/**
 * Open the Bulk Import modal by importing multiple files at once.
 * Selecting more than one file routes the import flow to the Bulk Import modal
 * (instead of the single-collection location modal).
 * @param page - The page object
 * @param filePaths - Absolute paths of the files to import (must be 2 or more)
 */
const openBulkImportModal = async (page: Page, filePaths: string[]) => {
  await test.step('Open the Bulk Import modal', async () => {
    const locators = buildCommonLocators(page);

    await locators.plusMenu.button().click();
    await locators.plusMenu.importCollection().click();
    await expect(locators.import.modal()).toBeVisible();

    await locators.import.fileInput().setInputFiles(filePaths);
    await expect(locators.import.bulkModal()).toBeVisible();
  });
};

const closeOpenCollectionModal = async (page: Page) => {
  await test.step('Close the Open Collection modal', async () => {
    const locators = buildCommonLocators(page);
    await locators.modal.closeButton().click();
    await locators.modal.byTitle('Open Collection').waitFor({ state: 'hidden' });
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
    const removeModal = page.locator('.bruno-modal').filter({ hasText: /Remove Collections?/ });
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
      await locators.environment.collectionTab().click();
      await expect(locators.environment.collectionTab()).toHaveClass(/active/);
    }
  });
};

/**
 * Open the configuration tab for the currently active environment (collection or global).
 * Combines opening the env selector dropdown + clicking the "configure" button + waiting
 * for the resulting env config tab to appear. Use this when the test needs to interact
 * with the env variable rows (read a value, toggle the secret eye, etc.).
 * @param page - The page object
 * @param type - The type of environment configuration tab to open
 */
const openEnvironmentConfigTab = async (page: Page, type: EnvironmentType = 'collection') => {
  await test.step(`Open ${type} environment configuration tab`, async () => {
    await openEnvironmentSelector(page, type);

    const locators = buildCommonLocators(page);
    // `waitFor` + `dispatchEvent` keeps the click stable when the dropdown is mid-transition;
    // the menu item briefly intercepts pointer events during the open animation.
    await locators.environment.configureButton().waitFor({ state: 'visible' });
    await locators.environment.configureButton().dispatchEvent('click');

    const envTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await expect(envTab).toBeVisible();
  });
};

/**
 * Import a Postman-format environment file into the given scope.
 * @param page - The page object
 * @param filePath - Path to the .postman_environment.json file
 * @param type - Target scope ('collection' | 'global')
 */
const importEnvironment = async (
  page: Page,
  filePath: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Import ${type} environment from "${filePath}"`, async () => {
    const locators = buildCommonLocators(page);

    await openEnvironmentSelector(page, type);
    await locators.environment.importEmptyStateButton().click();
    await expect(locators.environment.importModal(type)).toBeVisible();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await locators.environment.importFileTrigger(type).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);

    await locators.environment.importSubmitButton(type).click();

    const settingsTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await expect(settingsTab).toBeVisible();
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
    const locators = buildCommonLocators(page);
    await openEnvironmentSelector(page, type);

    // Environment selector shows the create button only in empty state.
    // If environments already exist, open settings and use the sidebar create action.
    const canCreateFromSelectorEmptyState = await locators.environment.createEnvButton().isVisible().catch(() => false);

    if (canCreateFromSelectorEmptyState) {
      await locators.environment.createEnvButton().click();

      await expect(locators.environment.createModal()).toBeVisible();
      const nameInput = locators.environment.createModalNameInput();
      await expect(nameInput).toBeVisible();
      await nameInput.fill(environmentName);
      await locators.environment.createModalCreateButton().click();
    } else {
      await locators.environment.configureButton().waitFor({ state: 'visible' });
      await locators.environment.configureButton().dispatchEvent('click');

      const envTab = type === 'global'
        ? locators.environment.globalEnvTab()
        : locators.environment.collectionEnvTab();
      await expect(envTab).toBeVisible();

      await locators.environment.settingsCreateButton().click();

      const inlineNameInput = locators.environment.settingsCreateNameInput();
      await expect(inlineNameInput).toBeVisible();
      await inlineNameInput.fill(environmentName);
      await inlineNameInput.press('Enter');
    }

    const envTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
    await expect(envTab).toBeVisible();

    await expect(locators.environment.selector()).toBeVisible();
    await locators.environment.selector().click();
    if (type === 'global') {
      await locators.environment.globalTab().click();
    } else {
      await locators.environment.collectionTab().click();
    }
    await locators.environment.envOption(environmentName).click();
    await expect(page.locator('.current-environment')).toContainText(environmentName);
  });
};

/**
 * Rename the environment currently open in the environment settings tab
 * @param page - The page object
 * @param newName - The new name for the environment
 * @returns void
 */
const renameEnvironment = async (page: Page, newName: string) => {
  await test.step(`Rename environment to "${newName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.environment.renameAction().click();

    const nameInput = locators.environment.renameInput();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(newName);
    await nameInput.press('Enter');

    await expect(nameInput).toBeHidden();
  });
};

/**
 * Open an environment from the list in the environment settings tab
 * @param page - The page object
 * @param environmentName - The environment to open
 * @param type - The environment scope the settings tab is showing
 * @returns void
 */
const openEnvironmentInSettings = async (
  page: Page,
  environmentName: string,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Open environment "${environmentName}" in the settings tab`, async () => {
    const { environment } = buildCommonLocators(page);

    await environment.sidebarListItemExact(type, environmentName).click();
    await expect(environment.detailsTitle()).toHaveText(environmentName);
  });
};

/**
 * Pick the environment that the currently open environment inherits its variables from
 * @param page - The page object
 * @param parentEnvironmentName - The environment to inherit from, or null to stop inheriting
 * @returns void
 */
const setEnvironmentInheritance = async (page: Page, parentEnvironmentName: string | null) => {
  await test.step(
    parentEnvironmentName ? `Inherit variables from "${parentEnvironmentName}"` : 'Stop inheriting variables',
    async () => {
      const locators = buildCommonLocators(page);
      await locators.environment.inheritsFromAction().click();

      const option = parentEnvironmentName
        ? locators.environment.inheritsFromOption(parentEnvironmentName)
        : locators.environment.inheritsFromNoneOption();
      await option.click();

      const toastText = parentEnvironmentName
        ? `Inheriting variables from ${parentEnvironmentName}`
        : 'Stopped inheriting variables';
      await expect(page.getByText(toastText).last()).toBeVisible();
    }
  );
};

/**
 * Copy the environment currently open in the environment settings tab
 * @param page - The page object
 * @param newName - Name for the copy
 * @returns void
 */
const copyEnvironment = async (page: Page, newName: string) => {
  await test.step(`Copy environment to "${newName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.environment.copyAction().click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Copy Environment' });
    await modal.locator('#environment-name').fill(newName);
    await modal.getByRole('button', { name: 'Copy', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
  });
};

/**
 * Delete the environment currently open in the environment settings tab
 * @param page - The page object
 * @returns void
 */
const deleteEnvironment = async (page: Page) => {
  await test.step('Delete the open environment', async () => {
    const locators = buildCommonLocators(page);
    await locators.environment.deleteAction().click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'Delete Environment' });
    await modal.getByRole('button', { name: 'Delete', exact: true }).click();
    await modal.waitFor({ state: 'hidden' });
  });
};

type EnvironmentVariable = {
  name: string;
  value: string;
  isSecret?: boolean;
  dataType?: 'number' | 'boolean' | 'object';
};

/**
 * Add an environment variable to the currently open environment. Variables and
 * secrets live on separate tabs, so a secret is routed to the Secrets tab and a
 * plain variable to the Variables tab before the row is added.
 * @param page - The page object
 * @param variable - The variable to add (name, value, and optional secret flag)
 * @param options - `valueFirst` types the value into the row before naming it
 * @returns void
 */
const addEnvironmentVariable = async (
  page: Page,
  variable: EnvironmentVariable,
  options: AddRowOptions = {}
) => {
  await test.step(`Add environment ${variable.isSecret ? 'secret' : 'variable'} "${variable.name}"`, async () => {
    const tab = variable.isSecret
      ? page.getByTestId('responsive-tab-secrets')
      : page.getByTestId('responsive-tab-variables');
    await tab.click();
    await expect(tab).toHaveClass(/active/);

    await addRowToActiveTab(page, variable.name, variable.value, variable.dataType, options);
  });
};

/**
 * Add multiple environment variables to the currently open environment. Each entry
 * is routed to the Variables or Secrets tab based on its `isSecret` flag.
 * @param page - The page object
 * @param variables - Array of variables to add
 * @returns void
 */
const addEnvironmentVariables = async (page: Page, variables: EnvironmentVariable[]) => {
  await test.step(`Add ${variables.length} environment variables`, async () => {
    for (let i = 0; i < variables.length; i++) {
      await addEnvironmentVariable(page, variables[i]);
    }
  });
};

type AddRowOptions = { valueFirst?: boolean };

/**
 * Bring part of the environment table into view. The table is virtualized, so a row outside the
 * rendered window is absent from the DOM altogether, and waiting on the target alone never
 * resolves. Walks the scroller a viewport at a time until the target renders, leaving the list
 * wherever that happened.
 * @param page - The page object
 * @param target - The row, or a control within a row, to scroll to
 * @returns void
 */
const scrollEnvironmentTableTo = async (page: Page, target: Locator) => {
  const isRendered = () => target.isVisible().catch(() => false);
  if (await isRendered()) {
    return;
  }

  const scroller = buildCommonLocators(page).environment.variablesScroller();
  await scroller.waitFor({ state: 'visible' });

  const viewports = await scroller.evaluate((element) => Math.ceil(element.scrollHeight / element.clientHeight));
  for (let viewport = 0; viewport <= viewports; viewport++) {
    await scroller.evaluate((element, offset) => element.scrollTo({ top: offset * element.clientHeight }), viewport);
    if (await isRendered()) {
      return;
    }
  }
};

/**
 * The trailing empty row's Name input, scrolled into the rendered window first. Only the empty
 * row carries the `Name` placeholder, so a match is always the row a new variable goes into.
 * @param page - The page object
 * @returns The empty row's Name input
 */
const emptyRowNameInput = async (page: Page) => {
  const nameInput = page.locator('input[placeholder="Name"]').last();

  await scrollEnvironmentTableTo(page, nameInput);
  await nameInput.waitFor({ state: 'visible' });

  return nameInput;
};

/**
 * Add a variable or secret to whichever environment tab (Variables / Secrets) is
 * currently active. The active tab determines the row's type, so select the tab
 * before calling. When `dataType` is given, its type is set via the DataTypeSelector.
 * @param page - The page object
 * @param name - The variable/secret name
 * @param value - The variable/secret value
 * @param dataType - Optional non-string dataType to assign (default `string`)
 * @param options - `valueFirst` types the value into the row before naming it
 * @returns void
 */
const addRowToActiveTab = async (
  page: Page,
  name: string,
  value: string,
  dataType?: 'number' | 'boolean' | 'object',
  options: AddRowOptions = {}
) => {
  await test.step(`Add row "${name}" to the active environment tab`, async () => {
    const { environment, dataTypeSelector } = buildCommonLocators(page);

    if (options.valueFirst) {
      const nameInput = await emptyRowNameInput(page);
      // Filling the value appends another empty row, so the row being filled in stops being the
      // last one — its formik index is what stays put until it has a name to be found by.
      const formikName = await nameInput.getAttribute('name');
      if (formikName === null) {
        throw new Error('Empty environment row is missing its formik "name" attribute');
      }
      const rowIndex = Number(formikName.split('.')[0]);

      const emptyRowEditor = environment.variableValueEditor(rowIndex);
      await emptyRowEditor.scrollIntoViewIfNeeded();
      await emptyRowEditor.click({ position: { x: 5, y: 5 } });
      await expect(emptyRowEditor).toHaveClass(/CodeMirror-focused/);
      await page.keyboard.type(value);
      await expect(emptyRowEditor).toContainText(value);

      await environment.variableNameInput(rowIndex).fill(name);
    } else {
      const nameInput = await emptyRowNameInput(page);
      await nameInput.fill(name);
    }

    const row = page.getByTestId(`env-var-row-${name}`);
    await row.waitFor({ state: 'visible' });

    const codeMirror = row.getByTestId(/^test-multiline-editor-\d+\.value$/).locator('.CodeMirror').first();
    await codeMirror.scrollIntoViewIfNeeded();
    if (!options.valueFirst) {
      // Target the editor's left edge: when the value column is narrow the DataTypeSelector
      // renders as a compact overlay pinned to the cell's right side, which otherwise
      // intercepts a centered click/hover.
      await codeMirror.click({ position: { x: 5, y: 5 } });
      if (dataType) {
        await expect(codeMirror).toHaveClass(/CodeMirror-focused/);
        await page.keyboard.insertText(value);
      } else {
        await page.keyboard.type(value);
      }
    }

    if (dataType) {
      await codeMirror.hover({ position: { x: 5, y: 5 } });
      await dataTypeSelector.typeLabel(row).click();
      await dataTypeSelector.menuItem(dataType).click();
      await expect(dataTypeSelector.typeLabel(row)).toHaveAttribute('data-selected-type', dataType);
    }
  });
};

/**
 * Replace the value of an existing environment variable row. The row must already be on the
 * active tab; a secret keeps its value masked, so reveal it with the row's eye toggle
 * before asserting on the displayed text. Whatever the row holds is cleared first, so the
 * same call can be repeated against an app instance a previous test already wrote to.
 * @param page - The page object
 * @param name - The name of the row to fill
 * @param value - The value to type
 * @returns void
 */
const setEnvironmentVariableValue = async (page: Page, name: string, value: string) => {
  await test.step(`Set environment variable "${name}" to "${value}"`, async () => {
    const editor = buildCommonLocators(page).environment.varRowValueEditor(name);
    await scrollEnvironmentTableTo(page, editor);
    await editor.scrollIntoViewIfNeeded();
    await editor.click({ position: { x: 5, y: 5 } });
    await expect(editor).toHaveClass(/CodeMirror-focused/);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+a' : 'Control+a');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(value);
    await expect(editor).not.toHaveClass(/CodeMirror-empty/);
  });
};

/**
 * Uncheck the enabled checkbox of an environment variable row. The row must already be on the
 * active tab.
 * @param page - The page object
 * @param name - The name of the row to disable
 * @returns void
 */
const disableEnvironmentVariable = async (page: Page, name: string) => {
  await test.step(`Disable environment variable "${name}"`, async () => {
    const checkbox = buildCommonLocators(page).environment.varRowEnabledCheckbox(name);
    await scrollEnvironmentTableTo(page, checkbox);
    await checkbox.click();
    await expect(checkbox).not.toBeChecked();
  });
};

/**
 * Give an environment's secret rows their values and save. A secret's value never lives in the
 * environment file, so a fixture can only declare the rows — a test that needs a secret
 * resolved has to type the values in through the editor first.
 * @param page - The page object
 * @param environmentName - The environment holding the secret rows
 * @param secrets - Secret name to value
 * @param type - The environment scope the settings tab is showing
 * @returns void
 */
const setEnvironmentSecrets = async (
  page: Page,
  environmentName: string,
  secrets: Record<string, string>,
  type: EnvironmentType = 'collection'
) => {
  await test.step(`Set the secrets of environment "${environmentName}"`, async () => {
    const { environment } = buildCommonLocators(page);

    await openEnvironmentInSettings(page, environmentName, type);
    await environment.secretsTab().click();

    for (const [name, value] of Object.entries(secrets)) {
      await setEnvironmentVariableValue(page, name, value);
    }

    await saveEnvironment(page);
    await environment.variablesTab().click();
  });
};

/**
 * Filter the open environment's rows through the editor's search box, opening it first
 * when it is still collapsed behind the search icon.
 * @param page - The page object
 * @param query - The text to filter by
 * @returns void
 */
const searchEnvironmentVariables = async (page: Page, query: string) => {
  await test.step(`Filter environment variables by "${query}"`, async () => {
    const { environment } = buildCommonLocators(page);
    if (!(await environment.searchInput().isVisible())) {
      await environment.searchAction().click();
    }
    await environment.searchInput().fill(query);
  });
};

// Clicks the sort toggle once: default -> asc -> desc -> default.
const cycleVariableSort = async (page: Page) => {
  await test.step('Cycle variable sort mode', async () => {
    await buildCommonLocators(page).environment.sortToggle().click();
  });
};

// Displayed variable names, top to bottom, excluding the trailing empty row.
const getVisibleVariableNames = async (page: Page): Promise<string[]> => {
  const values = await buildCommonLocators(page)
    .environment.visibleNameInputs()
    .evaluateAll((inputs) => inputs.map((el) => (el as HTMLInputElement).value));
  return values.filter((name) => name !== '');
};

// Drags row `fromName` onto row `toName` (Manual sort mode only).
const dragVariableRow = async (page: Page, fromName: string, toName: string) => {
  await test.step(`Drag variable row "${fromName}" onto "${toName}"`, async () => {
    const common = buildCommonLocators(page);
    await common.environment.varRow(fromName).hover();
    await common.environment.dragHandle(fromName).dragTo(common.environment.varRow(toName), {
      targetPosition: { x: 5, y: 5 },
      force: true
    });
  });
};

/**
 * Delete every global environment in the workspace. Global environments persist at
 * the workspace level (closeAllCollections does not remove them), so call this to keep
 * tests isolated. Deletes the currently-selected environment first, since a tab with
 * unsaved changes blocks switching to another env via the list.
 * @param page - The page object
 * @returns void
 */
const deleteAllGlobalEnvironments = async (page: Page) => {
  await test.step('Delete all global environments', async () => {
    await page.getByTestId('environment-selector-trigger').click();
    await page.getByTestId('env-tab-global').click();
    await page.getByTestId('configure-env').click();

    const envItems = page.locator('.environment-item');
    const deleteBtn = page.locator('button[title="Delete"]');
    const modal = page.locator('.bruno-modal').filter({ hasText: 'Delete Environment' });

    await page.locator('.environments-container').first().waitFor({ state: 'visible' }).catch(() => { });

    while (true) {
      if ((await deleteBtn.count()) === 0) {
        if ((await envItems.count()) === 0) break;
        await envItems.first().click();
        await deleteBtn.waitFor({ state: 'visible' });
      }
      await deleteBtn.first().click();
      await modal.getByRole('button', { name: 'Delete', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
    }
  });
};

/**
 * Read the rendered widths of the resizable columns in the environment variables table.
 * Waits until the table reports its column widths as measured.
 * @param page - The page object
 * @returns Width in px of the Name, Value and Description columns
 */
const getEnvironmentColumnWidths = async (page: Page) => {
  const { environment } = buildCommonLocators(page);
  const columns = ['name', 'value', 'description'] as const;

  await expect(environment.variablesTable()).toHaveAttribute('data-columns-measured', 'true');

  const [name, value, description] = await Promise.all(
    columns.map(async (column) => (await environment.columnHeader(column).boundingBox())?.width ?? 0)
  );
  return { name, value, description };
};

/**
 * Drag a column divider in the environment variables table horizontally.
 * @param page - The page object
 * @param column - The column whose right-edge divider is dragged ('name' or 'value')
 * @param deltaX - Horizontal distance in px; positive widens the column
 * @returns void
 */
const dragEnvironmentColumnDivider = async (page: Page, column: 'name' | 'value', deltaX: number) => {
  await test.step(`Drag the ${column} column divider by ${deltaX}px`, async () => {
    const handle = buildCommonLocators(page).environment.columnResizeHandle(column);
    await handle.hover();

    const box = await handle.boundingBox();
    if (!box) throw new Error(`Resize handle for the ${column} column is not rendered`);

    // Grab near the top so the pointer stays within the header row
    const startX = box.x + box.width / 2;
    const startY = box.y + 10;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + deltaX, startY, { steps: 10 });
    await page.mouse.up();
  });
};

/**
 * Save the current environment settings
 * @param page - The page object
 * @returns void
 */
const saveEnvironment = async (page: Page) => {
  await test.step('Save environment', async () => {
    await page.getByTestId('save-all-env').click();
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
    const locators = buildCommonLocators(page);
    const envTab = type === 'global'
      ? locators.environment.globalEnvTab()
      : locators.environment.collectionEnvTab();
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
    } else {
      await locators.environment.collectionTab().click();
    }

    const option = environmentName === 'No Environment'
      ? locators.environment.noEnvironmentItem()
      : locators.environment.envOption(environmentName);
    await option.click();

    // Verify selection
    await expect(page.locator('.current-environment')).toContainText(environmentName);
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
 * Select a tab in the folder settings pane
 * @param page - The page object
 * @param tabName - The tab name key (e.g. 'auth', 'headers', 'docs', 'script', 'vars', 'test')
 * @returns void
 */
const selectfolderPaneTab = async (page: Page, tabName: string) => {
  await test.step(`Select folder pane tab "${tabName}"`, async () => {
    const locators = buildCommonLocators(page);
    const tab = locators.paneTabs.folderSettingsTab(tabName.toLowerCase());
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Select a sub-tab in the folder script pane (Pre Request or Post Response)
 * @param page - The page object
 * @param tabName - 'pre-request' or 'post-response'
 * @returns void
 */
const selectFolderScriptPaneTab = async (page: Page, tabName: 'pre-request' | 'post-response') => {
  await test.step(`Select folder script pane tab "${tabName}"`, async () => {
    const locators = buildCommonLocators(page);
    const tab = locators.paneTabs.folderScriptTab(tabName);
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Open a collection's settings tab by clicking on it in the sidebar
 * @param page - The page object
 * @param collectionName - The name of the collection
 * @param options - Optional settings (persist: double-click to make tab permanent)
 * @returns void
 */
const openCollectionSettings = async (page: Page, collectionName: string, { persist = false } = {}) => {
  await test.step(`Open collection settings for "${collectionName}"`, async () => {
    await revealCollectionsTop(page);
    const locators = buildCommonLocators(page);
    const collection = locators.sidebar.collection(collectionName);
    if (!persist) {
      await collection.click();
    } else {
      await collection.dblclick();
    }
  });
};

/**
 * Select a tab in the collection settings pane
 * @param page - The page object
 * @param tabName - The tab name key (e.g. 'auth', 'headers', 'overview', 'script', 'vars')
 * @returns void
 */
const selectCollectionPaneTab = async (page: Page, tabName: string) => {
  await test.step(`Select collection pane tab "${tabName}"`, async () => {
    const locators = buildCommonLocators(page);
    const tab = locators.paneTabs.collectionSettingsTab(tabName.toLowerCase());
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Select a sub-tab in the collection script pane (Pre Request or Post Response)
 * @param page - The page object
 * @param tabName - 'pre-request' or 'post-response'
 * @returns void
 */
const selectCollectionScriptPaneTab = async (page: Page, tabName: 'pre-request' | 'post-response') => {
  await test.step(`Select collection script pane tab "${tabName}"`, async () => {
    const locators = buildCommonLocators(page);
    const tab = locators.paneTabs.tabTrigger(tabName);
    await tab.click();
    await expect(tab).toContainClass('active');
  });
};

/**
 * Focus the folder settings tab in the tab bar after restore
 * @param page - The page object
 * @param folderName - The name of the folder
 * @param options - Optional timeout in milliseconds
 * @returns void
 */
const focusFolderSettingsTab = async (page: Page, folderName: string, { timeout = 10000 } = {}) => {
  await test.step(`Focus folder settings tab "${folderName}"`, async () => {
    const locators = buildCommonLocators(page);
    const tab = locators.tabs.folderTab(folderName);
    await expect(tab).toBeVisible({ timeout });
    await tab.click({ force: true });
  });
};

/**
 * Focus the collection settings tab in the tab bar after restore
 * @param page - The page object
 * @param options - Optional timeout in milliseconds
 * @returns void
 */
const focusCollectionSettingsTab = async (page: Page, { timeout = 10000 } = {}) => {
  await test.step('Focus collection settings tab', async () => {
    const locators = buildCommonLocators(page);
    const tab = locators.tabs.collectionSettingsTab();
    await expect(tab).toBeVisible({ timeout });
    await tab.click({ force: true });
  });
};

/**
 * Open the gRPC method dropdown and select a method by name
 * @param page - The page object
 * @param methodName - The name of the gRPC method to select (e.g. "BidiHello")
 */
const selectGrpcMethod = async (page: Page, methodName: string) => {
  await test.step(`Select gRPC method "${methodName}"`, async () => {
    const locators = buildGrpcCommonLocators(page);
    await locators.method.dropdownTrigger().click();
    await locators.method.dropdown().waitFor({ state: 'visible', timeout: 5000 });
    await locators.method.item(methodName).first().click();
    await expect(locators.method.selectedName()).toContainText(methodName);
  });
};

/**
 * Close every open request tab, discarding or saving based on the saveChanges flag.
 *
 * @param page - The page object
 * @returns void
 */
const closeAllOpenTabs = async (page: Page, saveChanges = false) => {
  await test.step(`Close all tabs, ${saveChanges ? 'saving' : 'discarding'} changes`, async () => {
    const locators = buildCommonLocators(page);
    const closableTabs = locators.tabs.closableTabs();
    const confirmClose = page.locator('.bruno-modal').filter({ hasText: 'Unsaved changes' });
    const resolveButton = saveChanges
      ? confirmClose.getByRole('button', { name: /^Save( All)?$/ })
      : confirmClose.getByRole('button', { name: 'Don\'t Save' });

    const pressCloseAllTabs = async () => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('ControlOrMeta+Shift+W');
    };

    await pressCloseAllTabs();

    await expect(async () => {
      if (await confirmClose.isVisible()) {
        await resolveButton.click();
      }
      await expect(closableTabs).toHaveCount(0, { timeout: 1000 });
    }).toPass({ timeout: 15000 });
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

    // Right-click on the tab label to open context menu. Aim at its left edge
    // on a short tab name the close-gradient overlay covers the label's centre.
    await requestTabLabel.click({ button: 'right', position: { x: 5, y: 5 } });

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

    const saveTransientModal = page.getByTestId('save-transient-request-modal');
    if (await saveTransientModal.isVisible({ timeout: 1000 }).catch(() => false)) {
      await saveTransientModal.getByRole('button', { name: 'Cancel' }).click();
      await expect(saveTransientModal).toBeHidden();
    }
  });
};

// Switch to an already-open request tab by its label (e.g. transient tabs are "Untitled N").
const switchToOpenTab = async (page: Page, label: string) => {
  await test.step(`Switch to tab "${label}"`, async () => {
    const tab = page.getByTestId('request-tab').filter({ has: page.getByText(label, { exact: true }) });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
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
    await page
      .locator('.workspace-item, .dropdown-item')
      .filter({ has: page.getByText(workspaceName, { exact: true }) })
      .click();
    await expect(page.getByTestId('workspace-name')).toHaveText(workspaceName, { timeout: 5000 });
  });
};

/**
 * Add a script to a folder's Settings → Script tab.
 * @param page - The page object
 * @param folderName - The folder to target (must be visible in the sidebar)
 * @param phase - Which phase to write: 'pre-request' or 'post-response'
 * @param content - The script content to add
 */
const addFolderScript = async (
  page: Page,
  folderName: string,
  phase: 'pre-request' | 'post-response',
  content: string
) => {
  await test.step(`Add ${phase} script on folder "${folderName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.folder(folderName).first().dblclick();
    await locators.paneTabs.folderSettingsTab('script').click();
    await locators.paneTabs.tabTrigger(phase).click();
    await editCodeMirrorEditor(page, `folder-${phase}-script-editor`, content);
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await page.waitForTimeout(400);
  });
};

/**
 * Add a script to a collection's Settings → Script tab.
 * @param page - The page object
 * @param collectionName - The collection to target
 * @param phase - Which phase to write: 'pre-request' or 'post-response'
 * @param content - The script content to add
 */
const addCollectionScript = async (
  page: Page,
  collectionName: string,
  phase: 'pre-request' | 'post-response',
  content: string
) => {
  await test.step(`Add ${phase} script on collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collection(collectionName).hover();
    await locators.actions.collectionActions(collectionName).click();
    await locators.dropdown.item('Settings').click();
    await locators.paneTabs.collectionSettingsTab('script').click();
    await locators.paneTabs.tabTrigger(phase).click();
    await editCodeMirrorEditor(page, `collection-${phase}-script-editor`, content);
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await page.waitForTimeout(400);
  });
};

const openFolderSettings = async (page: Page, collectionName: string, folderName = 'api') => {
  await test.step(`Open folder settings for "${folderName}" in collection "${collectionName}"`, async () => {
    const collectionRow = page.locator('#sidebar-collection-name').filter({ hasText: collectionName });
    await expect(collectionRow).toBeVisible();

    const folderRow = page
      .getByTestId('collections')
      .locator('.collection-item-name')
      .filter({ hasText: folderName });
    if (!(await folderRow.isVisible().catch(() => false))) {
      await collectionRow.click();
      await expect(folderRow).toBeVisible();
    }

    await folderRow.dblclick();
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: folderName })).toBeVisible();
  });
};

/**
 * Types a tag into the tag editor and commits it with Enter. Shared by the request Settings tab
 * and the folder Settings tab, which render the same TagList.
 * @param page - The Playwright page object
 * @param tagName - The tag to add
 * @returns void
 */
const addTag = async (page: Page, tagName: string) => {
  await test.step(`Add tag "${tagName}"`, async () => {
    const input = buildCommonLocators(page).tags.input();
    await expect(input).toBeVisible();
    await input.fill(tagName);
    await input.press('Enter');
  });
};

/**
 * Removes a tag the item owns. Inherited tags have no remove control, so this only ever
 * targets the removable chips.
 * @param page - The Playwright page object
 * @param tagName - The tag to remove
 * @returns void
 */
const removeTag = async (page: Page, tagName: string) => {
  await test.step(`Remove tag "${tagName}"`, async () => {
    const chip = buildCommonLocators(page).tags.ownItem(tagName);
    await expect(chip).toBeVisible();
    await chip.locator('.tag-remove').click();
  });
};

/**
 * Saves the active folder settings tab and waits for the confirmation toast.
 * @param page - The Playwright page object
 * @returns void
 */
const saveFolderSettings = async (page: Page) => {
  await test.step('Save folder settings', async () => {
    const saveShortcut = process.platform === 'darwin' ? 'Meta+s' : 'Control+s';
    await page.keyboard.press(saveShortcut);
    await expect(page.getByText('Folder Settings saved successfully').last()).toBeVisible({ timeout: 5000 });
  });
};

/**
 * Opens folder settings for a folder nested at any depth, expanding each level on the way down.
 * `openFolderSettings` only finds folders already visible in the sidebar; this walks a path such
 * as ['api', 'v2'] so a child folder can be reached without its parent being expanded first.
 * @param page - The Playwright page object
 * @param collectionName - The collection holding the folder
 * @param folderPath - Folder names from the collection root down to the target folder
 * @returns void
 */
const openFolderSettingsByPath = async (page: Page, collectionName: string, folderPath: string[]) => {
  await test.step(`Open folder settings for "${folderPath.join('/')}" in "${collectionName}"`, async () => {
    const targetRow = await revealFolderRow(page, collectionName, folderPath);
    await targetRow.dblclick();

    const targetName = folderPath[folderPath.length - 1];
    await expect(page.locator('.request-tab .tab-label').filter({ hasText: targetName })).toBeVisible();
  });
};

/**
 * Opens one tab of the folder settings pane (headers, script, test, vars, auth, docs, settings).
 * @param page - The Playwright page object
 * @param tabName - The settings tab to activate
 * @returns void
 */
const selectFolderSettingsTab = async (page: Page, tabName: string) => {
  await test.step(`Select folder settings tab "${tabName}"`, async () => {
    await page.getByTestId(`folder-settings-tab-${tabName}`).click();
  });
};

const setTableRowDescriptionValue = async (rowLocator: Locator, value: string) => {
  const descCell = rowLocator.getByTestId('column-description');
  await descCell.evaluate((el: any, val: string) => {
    const cmEl = el.querySelector('.CodeMirror');
    if (!cmEl) throw new Error('No CodeMirror in description cell');
    const cm = (cmEl as any).CodeMirror;
    if (!cm) throw new Error('CodeMirror instance not found');
    cm.setValue(val);
  }, value);
};

// --- CodeMirror link-aware assertions (open-as-transient-request feature) -------------------

type LinkAwareRequestType = 'http' | 'graphql' | 'grpc' | 'ws';

// Name of the committed fixture collection under tests/codeeditor-state/codemirror/fixtures.
const LINK_AWARE_COLLECTION_NAME = 'codemirror-linkaware';

// Cmd on macOS, Ctrl elsewhere — matches isCmdOrCtrlPressed() in linkAware.js.
const LINK_CLICK_MODIFIER: 'Meta' | 'Control' = process.platform === 'darwin' ? 'Meta' : 'Control';

const LINK_AWARE_METHOD_LABEL: Record<LinkAwareRequestType, string | null> = {
  http: null, // HTTP shows the verb (GET/POST/...), not a fixed label
  graphql: 'GQL',
  grpc: 'gRPC',
  ws: 'WS'
};

const linkAwareUrlBarCm = (page: Page, type: LinkAwareRequestType): Locator =>
  type === 'grpc'
    ? buildGrpcCommonLocators(page).request.queryUrlContainer().locator('.CodeMirror')
    : buildCommonLocators(page).request.urlInput();

/** Asserts the currently active tab is a freshly-created transient request of the given type. */
const expectTransientRequestOpened = async (page: Page, opts: { type: LinkAwareRequestType; url?: string }) => {
  const tab = page.locator('.request-tab.active');
  await expect(tab).toContainText('Untitled', { timeout: 10000 });

  const expectedLabel = LINK_AWARE_METHOD_LABEL[opts.type];
  if (expectedLabel) {
    await expect(tab.locator('.tab-method')).toHaveText(expectedLabel, { timeout: 5000 });
  } else {
    await expect(tab.locator('.tab-method')).not.toHaveText('', { timeout: 5000 });
  }

  if (opts.url && opts.type !== 'ws') {
    await expect.poll(
      () => linkAwareUrlBarCm(page, opts.type).evaluate((el: any) => el.CodeMirror?.getValue() ?? ''),
      { timeout: 5000 }
    ).toBe(opts.url);
  }
};

/** Plain click on the marked link — asserts a new transient request of `type` opens with `url`. */
const expectLinkOpensRequest = async (page: Page, cm: Locator, opts: { type: LinkAwareRequestType; url: string }) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await expectTransientRequestOpened(page, opts);
};

/** Modifier+click on the marked link — must fall back to "open externally", no new tab. */
const expectLinkOpensExternally = async (page: Page, cm: Locator) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  const tabCountBefore = await page.locator('.request-tab').count();
  await link.click({ modifiers: [LINK_CLICK_MODIFIER] });
  await page.waitForTimeout(300); // no new-tab locator to await — asserting absence of change
  await expect(page.locator('.request-tab')).toHaveCount(tabCountBefore);
};

/**
 * Editable fields (Params, Vars, Headers, ...) only mark URLs and let Cmd/Ctrl+Click open them
 * externally — a plain click just places the cursor, matching the URL bar's pre-existing
 * behaviour. Click-to-open-as-a-request is reserved for response previews.
 */
const expectLinkDoesNotOpenRequest = async (page: Page, cm: Locator) => {
  const link = cm.locator('.CodeMirror-link').first();
  await expect(link).toBeVisible({ timeout: 10000 });
  await link.click();
  await expect(cm).toContainClass('CodeMirror-focused');

  await expectLinkOpensExternally(page, cm);
};

/**
 * A URL-looking value must behave as plain text (e.g. `{{var}}`-interpolated, `ws://`, or a
 * field with link-awareness disabled): clicking it — with or without the open-externally
 * modifier — must be handled as a normal text click (CodeMirror focuses and places the
 * cursor), never intercepted to open a transient request.
 */
const expectNoLink = async (cm: Locator) => {
  await cm.click();
  await expect(cm).toContainClass('CodeMirror-focused');

  await cm.click({ modifiers: [LINK_CLICK_MODIFIER] });
  await expect(cm).toContainClass('CodeMirror-focused');
};

type DialogOptions = {
  showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>;
};

const openWorkspaceFromDialog = async (app: any, page: any, targetPath: string) => {
  await app.evaluate(
    ({ dialog }: { dialog: DialogOptions }, workspacePath: string) => {
      dialog.showOpenDialog = () =>
        Promise.resolve({ canceled: false, filePaths: [workspacePath] });
    },
    targetPath
  );

  await page.getByTestId('workspace-menu').click();
  await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
};

/**
 * Trigger "Generate Docs" from a collection's sidebar context menu and capture
 * the generated HTML documentation.
 *
 * The GenerateDocumentation modal hands the file to `FileSaver.saveAs`, which
 * builds an in-memory Blob and saves it via an `<a download>` click rather than
 * an Electron IPC write. Electron doesn't surface that as a Playwright
 * `download` event, so instead we intercept it in the renderer: `URL.createObjectURL`
 * gives us the Blob's content, and overriding the anchor click captures the
 * suggested file name while suppressing the real save (no file leaks to disk).
 *
 * @param page - The page object
 * @param collectionName - The name of the collection to generate docs for
 * @returns The generated HTML content and the download's suggested file name
 */
const generateCollectionDocs = async (
  page: Page,
  collectionName: string,
  beforeGenerate?: () => Promise<void>
): Promise<{ content: string; fileName: string }> => {
  return await test.step(`Generate docs for collection "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);

    // Make sure the collection has finished mounting before interacting — on a
    // cold start the row (and its hover-revealed actions icon) isn't ready yet,
    // so this keeps the helper self-sufficient for any caller.
    await waitForCollectionMount(page, collectionName);

    // Open the collection's context menu and click "Generate Docs"
    await locators.sidebar.collection(collectionName).hover();
    const collectionAction = locators.actions.collectionActions(collectionName);
    await expect(collectionAction).toBeVisible({ timeout: 2000 });
    await collectionAction.click();
    await locators.generateDocs.menuItem().click();

    // Wait for the Generate Documentation modal to reach its ready (non-loading)
    // state — the confirm button reads "Loading..." while the collection's items
    // are still mounting and only becomes "Generate" once they are ready.
    const modal = locators.generateDocs.modal();
    await expect(modal).toBeVisible({ timeout: 5000 });
    const generateButton = locators.generateDocs.generateButton();
    await expect(generateButton).toBeEnabled({ timeout: 10000 });

    // Let the caller interact with the modal (e.g. toggle environment selection)
    // after it is ready and before the docs are generated.
    if (beforeGenerate) {
      await beforeGenerate();
    }

    // Arm the renderer-side interception before the save fires. `file-saver`
    // (v2) reads the Blob through `URL.createObjectURL` and then triggers the
    // save by dispatching a synthetic click on a detached `<a download>` (via
    // `setTimeout(…, 0)`), so both points are intercepted. Each is exposed as a
    // promise to absorb that deferred dispatch without a race.
    await page.evaluate(() => {
      const w = window as any;
      const originalCreate = URL.createObjectURL.bind(URL);
      const originalDispatch = HTMLAnchorElement.prototype.dispatchEvent;

      w.__docsContent = new Promise<string>((resolve) => {
        URL.createObjectURL = function (obj: Blob | MediaSource) {
          if (obj instanceof Blob) {
            obj.text().then(resolve);
          }
          return originalCreate(obj as Blob);
        };
      });

      w.__docsFileName = new Promise<string>((resolve) => {
        HTMLAnchorElement.prototype.dispatchEvent = function (this: HTMLAnchorElement, event: Event) {
          if (this.download && event && event.type === 'click') {
            resolve(this.download);
            // Suppress the actual save — the Blob content is already captured.
            return true;
          }
          return originalDispatch.call(this, event);
        };
      });
    });

    await generateButton.click();

    const content = await page.evaluate(() => (window as any).__docsContent as Promise<string>);
    const fileName = await page.evaluate(() => (window as any).__docsFileName as Promise<string>);

    // The modal closes itself on the success path.
    await expect(modal).toBeHidden({ timeout: 5000 });

    return { content, fileName };
  });
};

const openShareCollectionModal = async (page: Page, collectionName: string) => {
  await test.step(`Open Share Collection for "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);

    await openCollection(page, collectionName);

    const collectionAction = locators.actions.collectionActions(collectionName);
    await locators.sidebar.collection(collectionName).hover();
    await expect(collectionAction).toBeVisible({ timeout: 2000 });
    await collectionAction.click();
    await locators.dropdown.item('Share').click();
    await expect(locators.modal.title('Share Collection')).toBeVisible();
  });
};

const openExportToPostmanModal = async (page: Page, collectionName: string) => {
  await test.step(`Open Export to Postman for "${collectionName}"`, async () => {
    const locators = buildCommonLocators(page);

    await openShareCollectionModal(page, collectionName);

    // In enterprise version, the export tab is visible, so need to click it to proceed.
    const exportTab = locators.export.exportTab();
    if (await exportTab.isVisible()) {
      await exportTab.click();
    }

    await locators.export.postmanFormatCard().click();
    await locators.modal.button('Proceed').click();
    await expect(locators.modal.title('Export to Postman')).toBeVisible();
  });
};

const closeExportToPostmanModal = async (page: Page) => {
  await test.step('Close the export modal', async () => {
    const locators = buildCommonLocators(page);

    await locators.export.postmanModal().getByTestId('modal-close-button').click();
    await expect(locators.modal.title('Export to Postman')).toBeHidden();
    await expect(locators.modal.title('Share Collection')).toBeHidden();
  });
};

// Dismiss an open modal if one is present
const dismissModalIfOpen = async (page: Page) => {
  const { modal } = buildCommonLocators(page);
  if (await modal.closeButton().isVisible()) {
    await modal.closeButton().click({ force: true });
    await expect(modal.card()).toBeHidden();
  }
};

const exportCollectionToPostman = async (
  page: Page,
  collectionName: string,
  outputDir: string,
  { preserveScripts = false }: { preserveScripts?: boolean } = {}
) => {
  const locators = buildCommonLocators(page);

  await openExportToPostmanModal(page, collectionName);

  await test.step('Set the export location', async () => {
    await locators.export.locationInput().fill(outputDir);
  });

  await test.step('Configure preserve scripts', async () => {
    if (preserveScripts) {
      await locators.export.optionsButton().click();
      await locators.export.advancedOptionsToggle().click();
      const checkbox = locators.export.preserveScriptsToggle();
      await expect(checkbox).toBeVisible();
      await checkbox.check();
      await expect(checkbox).toBeChecked();
    }
  });

  return await test.step('Export and read the written file', async () => {
    await locators.modal.button('Export').click();
    const filePath = path.join(outputDir, `${collectionName}.json`);
    await expect.poll(() => fs.existsSync(filePath), { timeout: 5000 }).toBe(true);
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  });
};

const exportCollectionAsSingleYaml = async (
  page: Page,
  electronApp: ElectronApplication,
  collectionName: string,
  outputDir: string
) => {
  const filePath = path.join(outputDir, `${collectionName}.yml`);
  const locators = buildCommonLocators(page);

  // FileSaver.saveAs triggers Electron's will-download event;
  // set the save path to the temp directory to avoid the system save dialog.
  await electronApp.evaluate(({ session }, savePath) => {
    session.defaultSession.once('will-download', (_event, item) => {
      item.setSavePath(savePath);
    });
  }, filePath);

  await openShareCollectionModal(page, collectionName);

  // In enterprise version, the export tab is visible, so need to click it to proceed.
  const exportTab = locators.export.exportTab();
  if (await exportTab.isVisible()) {
    await exportTab.click();
  }

  await locators.export.yamlFormatCard().click();
  await locators.modal.button('Proceed').click();
  await expect.poll(() => fs.existsSync(filePath)).toBe(true);
  return fs.readFileSync(filePath, 'utf8');
};

const exportCollectionAsZip = async (
  page: Page,
  electronApp: ElectronApplication,
  collectionName: string,
  outputDir: string
) => {
  const zipPath = path.join(outputDir, `${collectionName}.zip`);

  await electronApp.evaluate(({ dialog }, filePath) => {
    (dialog as any).__savedShowSaveDialog = dialog.showSaveDialog;
    dialog.showSaveDialog = async () => ({ filePath, canceled: false });
  }, zipPath);

  try {
    await openShareCollectionModal(page, collectionName);

    return await test.step('Export as ZIP and read the written entries', async () => {
      const locators = buildCommonLocators(page);
      // In enterprise version, the export tab is visible, so need to click it to proceed.
      const exportTab = locators.export.exportTab();
      if (await exportTab.isVisible()) {
        await exportTab.click();
      }
      await locators.modal.button('Proceed').click();
      await expect(locators.modal.title('Share Collection')).toBeHidden();
      await expect.poll(() => fs.existsSync(zipPath), { timeout: 10000 }).toBe(true);
      return new AdmZip(zipPath).getEntries().map((entry) => entry.entryName);
    });
  } finally {
    await electronApp.evaluate(({ dialog }) => {
      dialog.showSaveDialog = (dialog as any).__savedShowSaveDialog;
      delete (dialog as any).__savedShowSaveDialog;
    });
  }
};

/**
 * Toggle the "Enable App" request setting idempotently (Settings tab).
 * Enabling exposes the App tab and the Request/App/File view-mode toggle.
 * @param page - The page object
 * @param enabled - Whether apps should be enabled for the request
 */
const setAppEnabled = async (page: Page, enabled: boolean) => {
  await test.step(`Set Enable App ${enabled ? 'ON' : 'OFF'}`, async () => {
    await selectRequestPaneTab(page, 'Settings');
    const toggle = page.getByTestId('enable-app-toggle');
    await expect(toggle).toBeVisible();
    const current = (await toggle.getAttribute('aria-checked')) === 'true';
    if (current !== enabled) {
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-checked', String(enabled));
    }
  });
};

/**
 * Set the request's app code. Enables apps in the request settings (the App
 * tab is hidden otherwise), opens the App tab and writes the editor value
 * directly via the CodeMirror API (avoids auto-close-bracket corruption when
 * typing HTML/JS char-by-char). The app view must not be active (editor visible).
 * @param page - The page object
 * @param code - The HTML/JS app code
 */
const setAppCode = async (page: Page, code: string) => {
  await setAppEnabled(page, true);
  await test.step('Set app code', async () => {
    await selectRequestPaneTab(page, 'App');
    const editor = appCodeEditor(page);
    await editor.waitFor({ state: 'visible' });
    await editor.evaluate((el, val) => {
      const cm = (el as any).CodeMirror;
      if (cm) cm.setValue(val);
    }, code);
  });
};

/**
 * The CodeMirror element of the request-level App-tab editor.
 * @param page - The page object
 */
const appCodeEditor = (page: Page) => page.getByTestId('app-code-editor').locator('.CodeMirror').first();

/**
 * Read the app code currently loaded in the App-tab editor (via the CodeMirror API).
 * @param page - The page object
 * @returns The editor's current value
 */
const readAppEditor = (page: Page): Promise<string | undefined> =>
  appCodeEditor(page).evaluate((el) => (el as any).CodeMirror?.getValue());

/**
 * The App tab of the request pane tab bar.
 * @param page - The page object
 */
const requestPaneAppTab = (page: Page) => page.getByTestId('responsive-tab-app');

/**
 * The keep-alive preview slot of the ACTIVE tab. The AppPreviewKeepAlive
 * overlay keeps app views of background tabs mounted (hidden) and the Electron
 * instance is shared across tests in a worker, so bare app-view lookups can
 * match a stale slot from another test. Always scope through the active slot.
 * @param page - The page object
 */
const activeAppPreviewSlot = (page: Page) => page.locator('.app-preview-slot.active');

/**
 * The app view of the ACTIVE tab (see activeAppPreviewSlot).
 * @param page - The page object
 */
const activeAppView = (page: Page) => activeAppPreviewSlot(page).getByTestId('app-view');

/**
 * The shared "No app yet" empty state, rendered by both the request-level app
 * view and the standalone collection app whenever the app has no code.
 * @param page - The page object
 */
const appEmptyState = (page: Page) => activeAppPreviewSlot(page).getByTestId('empty-app-state');

/**
 * Open the app view via the App tab's "Preview" button. Asserts the app view
 * takes over the request/response area.
 * @param page - The page object
 */
const previewApp = async (page: Page) => {
  await test.step('Preview app (App tab button)', async () => {
    await selectRequestPaneTab(page, 'App');
    await page.getByTestId('app-preview-btn').click();
    await expect(activeAppView(page)).toBeVisible({ timeout: 5000 });
  });
};

/**
 * Exit app mode via the app view's "Exit to editor" button.
 * @param page - The page object
 */
const exitApp = async (page: Page) => {
  await test.step('Exit app mode', async () => {
    await activeAppView(page).getByTestId('app-exit-button').click();
    await expect(activeAppView(page)).toHaveCount(0, { timeout: 5000 });
  });
};

/**
 * Switch the active request's view mode using the collection toolbar toggle.
 * @param page - The page object
 * @param mode - 'request' | 'app' | 'file'
 */
const selectViewMode = async (page: Page, mode: 'request' | 'app' | 'file') => {
  await test.step(`Switch view mode to "${mode}"`, async () => {
    await page.getByTestId(`view-mode-${mode}`).click();
  });
};

/**
 * The document URL of the active app's <webview>. Guest URLs are unique per
 * app, so this identifies one guest exactly — preferable to picking the newest
 * WebContents, which silently binds to a leftover guest from an earlier test in
 * the same worker. Throws if no webview attaches within the timeout; callers
 * polling for a guest should catch and retry.
 */
const getAppWebviewSrc = async (page: Page): Promise<string> => {
  const webview = activeAppView(page).locator('webview');
  await webview.waitFor({ state: 'attached', timeout: 5000 });
  return (await webview.getAttribute('src')) || '';
};

/**
 * Evaluate `code` inside the active app's <webview> guest. The guest runs
 * out-of-process, so it is unreachable from the renderer page: the guest
 * WebContents is located in the Electron main process by the exact document
 * URL the active webview is showing, which identifies one guest even when
 * guests from earlier tests are still alive in the same worker.
 *
 * Returns undefined while the webview has not attached yet (it mounts only
 * after the document-registration IPC round-trip resolves), so expect.poll
 * callers can keep retrying instead of failing on a slow mount.
 */
const evalInActiveAppGuest = async (page: Page, electronApp: ElectronApplication, code: string): Promise<unknown> => {
  let src: string;
  try {
    src = await getAppWebviewSrc(page);
  } catch {
    return undefined;
  }
  return electronApp.evaluate(
    async ({ webContents }, { src: wanted, code: c }) => {
      const guest = webContents.getAllWebContents().find((wc) => {
        try {
          return wc.getType() === 'webview' && wc.getURL() === wanted;
        } catch {
          return false;
        }
      });
      if (!guest) return undefined;
      return await guest.executeJavaScript(c, true);
    },
    { src, code }
  );
};

/**
 * Wait until the active app's guest has booted far enough that `window.bru.ctx`
 * exists — the injected bootstrap has run and the ctx bridge is usable.
 */
const waitForAppGuestReady = async (page: Page, electronApp: ElectronApplication, options: { timeout?: number } = {}) => {
  await expect
    .poll(async () => evalInActiveAppGuest(page, electronApp, 'window.bru && typeof window.bru.ctx'), {
      timeout: options.timeout ?? 15000
    })
    .toBe('object');
};

/**
 * Create a standalone (collection-level or folder-level) app via the sidebar
 * context menu. Opens the new tab once created.
 * @param page - The page object
 * @param appName - Name to give the new app
 * @param parent - Either `{ collectionName }` for a collection-level app,
 *                 or `{ collectionName, folderName }` for a folder-level app.
 */
const createApp = async (
  page: Page,
  appName: string,
  parent: { collectionName: string; folderName?: string }
) => {
  await test.step(`Create app "${appName}" in ${parent.folderName ? `folder "${parent.folderName}"` : `collection "${parent.collectionName}"`}`, async () => {
    const locators = buildCommonLocators(page);

    if (parent.folderName) {
      const collectionScope = locators.sidebar.collectionScope(parent.collectionName);
      const folderRow = collectionScope.locator('.collection-item-name').filter({ hasText: parent.folderName });
      await folderRow.hover();
      await folderRow.locator('.menu-icon').click();
    } else {
      await locators.sidebar.collection(parent.collectionName).hover();
      const collectionAction = locators.actions.collectionActions(parent.collectionName);
      await expect(collectionAction).toBeVisible({ timeout: 2000 });
      await collectionAction.click();
    }

    await page.locator('.tippy-box:visible .dropdown-item').filter({ hasText: 'New App' }).click();

    const modal = page.locator('.bruno-modal').filter({ hasText: 'New App' });
    await expect(modal).toBeVisible({ timeout: 5000 });
    await modal.locator('input[name="appName"]').fill(appName);
    await modal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(modal).toBeHidden({ timeout: 5000 });
  });
};

/**
 * Switch the CollectionApp tab between Code and Preview views.
 * @param page - The page object
 * @param view - 'code' | 'preview'
 */
const selectAppView = async (page: Page, view: 'code' | 'preview') => {
  await test.step(`Switch collection app to "${view}"`, async () => {
    // Scope through the active keep-alive slot — hidden slots of background
    // app tabs (possibly from earlier tests in the shared Electron) also
    // render this toggle.
    await activeAppPreviewSlot(page).getByTestId(`collection-app-view-${view}`).click();
  });
};

/**
 * Rename a websocket message by double-clicking its label and typing a new name.
 * @param page - The page object
 * @param index - The zero-based index of the message in the list
 * @param name - The new message name
 */
const renameWsMessage = async (page: Page, index: number, name: string) => {
  await test.step(`Rename websocket message ${index} to "${name}"`, async () => {
    const { websocket } = buildCommonLocators(page);
    await websocket.message.label(index).dblclick();
    const nameInput = websocket.message.nameInput(index);
    await expect(nameInput).toBeVisible();
    await nameInput.selectText();
    await page.keyboard.type(name);
    await nameInput.press('Enter');
  });
};

const SETTLE_MS = 2_000;

/**
 * Scroll a row inside a react-virtuoso table (request/folder/collection vars or
 * env vars — both rendered with the `table-container` className) into view so it
 * mounts in the DOM. Virtuoso only keeps rows near the viewport mounted and can
 * restore a persisted scroll position, so reset to the top first — retried, to
 * beat that restore — then walk down until `target` mounts.
 */
const scrollVirtuosoRowIntoView = async (page: Page, target: Locator) => {
  if (await target.count()) {
    await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
    return;
  }

  const scroll = (toTop: boolean) => page.evaluate((toTop) => {
    let moved = false;
    document.querySelectorAll('.table-container').forEach((el) => {
      const before = el.scrollTop;
      el.scrollTop = toTop ? 0 : el.scrollTop + el.clientHeight * 0.7 + 80;
      if (el.scrollTop !== before) moved = true;
    });
    return moved;
  }, toTop);

  for (let i = 0; i < 5; i++) {
    await scroll(true);
    await page.waitForTimeout(120);
    if (await target.count()) {
      await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
      return;
    }
  }

  for (let i = 0; i < 40; i++) {
    if (await target.count()) break;
    if (!(await scroll(false))) break;
    await page.waitForTimeout(120);
  }
  await target.scrollIntoViewIfNeeded({ timeout: SETTLE_MS }).catch(() => { });
};

/**
 * @param page - The page object
 */
const dismissVarTooltip = async (page: Page) => {
  await page.locator('body').click();
};

/**
 * Hover a `{{var}}` token in the URL editor and return its (visible) info tooltip.
 * @param page - The page object
 * @param varName - The variable name inside the braces
 * @param state - Highlight class to match: 'valid' (known) or 'invalid' (unknown); omit to match either
 * @returns The tooltip popup locator
 */
const openUrlVarTooltip = async (
  page: Page,
  varName: string,
  state?: 'valid' | 'invalid'
): Promise<Locator> => {
  const { request, varInfoPopup } = buildCommonLocators(page);
  // Dismiss any previously-open tooltip first.
  await page.mouse.move(0, 0);
  await request.urlVariableToken(varName, state).hover();

  const tooltip = varInfoPopup.all().first();
  await expect(tooltip).toBeVisible();
  return tooltip;
};

/**
 * Hover a `{{var}}` token inside another row's Value cell in the (collection or global)
 * environment table itself, and return its (visible) info tooltip. Use this for the
 * "go to definition from inside the environment table it would target" scenario, as opposed
 * to `openUrlVarTooltip` which hovers a token in a request's URL bar.
 * @param page - The page object
 * @param rowName - The name of the environment row whose Value cell contains the token
 * @param tokenName - The variable name inside the braces to hover
 * @param state - Highlight class to match: 'valid' (known) or 'invalid' (unknown); omit to match either
 * @returns The tooltip popup locator
 */
const openEnvValueVarTooltip = async (
  page: Page,
  rowName: string,
  tokenName: string,
  state?: 'valid' | 'invalid'
): Promise<Locator> => {
  const { environment, varInfoPopup } = buildCommonLocators(page);
  const selector = state ? `.cm-variable-${state}` : '.cm-variable-valid, .cm-variable-invalid';
  // Dismiss any previously-open tooltip first.
  await page.mouse.move(0, 0);
  await environment.varRowValueEditor(rowName).locator(selector).filter({ hasText: tokenName }).first().hover();

  const tooltip = varInfoPopup.all().first();
  await expect(tooltip).toBeVisible();
  return tooltip;
};

/**
 * Returns true if the element is on top at its centre (not hidden behind a header),
 * i.e. the topmost element at its centre is inside a dropdown/tippy container.
 * @param locator - The dropdown item locator
 * @returns Whether the item is the topmost element at its own centre
 */
const elementIsInsideDropdown = async (locator: Locator) => {
  const box = await locator.boundingBox();
  expect(box, 'dropdown item should have a layout box').not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  return locator.page().evaluate(
    ({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('.tippy-box, .dropdown')),
    { x, y }
  );
};

/**
* Open the System Proxy panel in the Preferences dialog and wait for the refresh button to be visible.
* @param page - The page object
*/

const openSystemProxyPanel = async (page: Page) => {
  await openPreferences(page);
  await selectPreferencesTab(page, 'Proxy');

  const systemProxyLocators = buildPreferencesLocators(page).systemProxy;
  await systemProxyLocators.systemProxyMode().click();
  await systemProxyLocators.systemProxyRefreshButton().waitFor({ state: 'visible' });
};

// Sidebar item actions: clone / copy / paste / rename / create, opened through a
// row's menu.

/**
 * Opens the environment import review modal and selects the given files.
 * @param page - The Playwright Page object
 * @param scope - The environment scope ('collection' | 'global')
 * @param filePaths - The paths to the environment files to import
 */
const openImportReview = async (page: Page, scope: 'collection' | 'global', ...filePaths: string[]) => {
  const { environment } = buildCommonLocators(page);
  await openEnvironmentConfigTab(page, scope);
  await environment.importSettingsButton().click();
  await environment.importModal(scope).waitFor({ state: 'visible' });

  const fileChooserPromise = page.waitForEvent('filechooser');
  await environment.importFileTrigger(scope).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePaths);
};

/**
 * Clicks outside the modal backdrop to test click-outside behavior.
 * @param page - The Playwright Page object
 */
const clickOutsideModal = async (page: Page) => {
  const { modal } = buildCommonLocators(page);

  await modal.backdrop().click({
    position: { x: 10, y: 10 }
  });
};

const getAppWebviewHtml = async (page: Page, electronApp: ElectronApplication): Promise<string> => {
  await waitForAppGuestReady(page, electronApp);
  return (await evalInActiveAppGuest(page, electronApp, 'document.documentElement.outerHTML')) as string;
};

/**
 * Resizes the main window's content area and waits until the renderer reports the new width.
 * @param app - The Electron app owning the window
 * @param page - The Playwright page object
 * @param size - The content width and height to resize to
 * @returns void
 */
const setWindowContentSize = async (app: ElectronApplication, page: Page, size: { width: number; height: number }) => {
  await app.evaluate(({ BrowserWindow }, { width, height }) => {
    BrowserWindow.getAllWindows()[0].setContentSize(width, height);
  }, size);

  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(size.width);
};

export {
  waitForReadyPage,
  readClipboard,
  setRequestUrlAndSave,
  openUrlVarTooltip,
  dismissVarTooltip,
  openEnvValueVarTooltip,
  scrollVirtuosoRowIntoView,
  dismissImportIssuesToasts,
  closeAllCollections,
  openCollection,
  openCollectionFromDialog,
  createCollection,
  createRequest,
  createUntitledRequest,
  createTransientRequest,
  createTransientRequestFromPreset,
  setRequestTypePreset,
  setRequestUrlPreset,
  fillRequestUrl,
  deleteCollectionFromOverview,
  importCollection,
  openBulkImportModal,
  closeOpenCollectionModal,
  removeCollection,
  openEnvironmentSelector,
  openEnvironmentConfigTab,
  importEnvironment,
  createEnvironment,
  renameEnvironment,
  openEnvironmentInSettings,
  getEnvironmentColumnWidths,
  dragEnvironmentColumnDivider,
  setEnvironmentInheritance,
  copyEnvironment,
  deleteEnvironment,
  addEnvironmentVariable,
  addEnvironmentVariables,
  addRowToActiveTab,
  cycleVariableSort,
  getVisibleVariableNames,
  dragVariableRow,
  setEnvironmentVariableValue,
  disableEnvironmentVariable,
  setEnvironmentSecrets,
  searchEnvironmentVariables,
  deleteAllGlobalEnvironments,
  saveEnvironment,
  closeEnvironmentPanel,
  selectEnvironment,
  sendRequest,
  selectfolderPaneTab,
  selectFolderScriptPaneTab,
  openCollectionSettings,
  selectCollectionPaneTab,
  selectCollectionScriptPaneTab,
  focusFolderSettingsTab,
  focusCollectionSettingsTab,
  getResponseBody,
  expectResponseContains,
  selectRequestPaneTab,
  readRequestBody,
  expectRequestMaxRedirects,
  selectRequestBodyMode,
  selectResponsePaneTab,
  selectResponsePaneTabViaOverflow,
  mockBrowseFiles,
  addMultipartFileToLastRow,
  removeFirstMultipartFile,
  sendRequestAndWaitForResponse,
  switchResponseFormat,
  switchToPreviewTab,
  switchToEditorTab,
  expandAllXmlNodes,
  clickResponseAction,
  addAssertion,
  editAssertion,
  deleteAssertion,
  saveRequest,
  addGrpcMessage,
  generateGrpcSampleMessage,
  selectGrpcMethod,
  sendGrpcRequest,
  streamGrpcMessagesAndEndCall,
  closeAllTabs,
  closeAllOpenTabs,
  switchToOpenTab,
  createWorkspace,
  switchWorkspace,
  selectScriptSubTab,
  editCodeMirrorEditor,
  setCodeMirrorEditorValue,
  addPreRequestScript,
  addPostResponseScript,
  writeScriptContent,
  readScriptContent,
  addTestScript,
  addFolderScript,
  addCollectionScript,
  sendAndWaitForErrorCard,
  sendAndWaitForResponse,
  resetResponse,
  selectAuthMode,
  fieldEditor,
  typeIntoField,
  writeFieldValue,
  readField,
  createExampleFromSidebar,
  openWorkspaceFromDialog,
  setCodeMirrorValue,
  expectTransientRequestOpened,
  expectLinkOpensRequest,
  expectLinkOpensExternally,
  expectLinkDoesNotOpenRequest,
  expectNoLink,
  LINK_AWARE_COLLECTION_NAME,
  LINK_CLICK_MODIFIER,
  generateCollectionDocs,
  openShareCollectionModal,
  openExportToPostmanModal,
  closeExportToPostmanModal,
  dismissModalIfOpen,
  exportCollectionToPostman,
  exportCollectionAsSingleYaml,
  exportCollectionAsZip,
  addTag,
  removeTag,
  saveFolderSettings,
  openFolderSettings,
  openFolderSettingsByPath,
  selectFolderSettingsTab,
  setTableRowDescriptionValue,
  setAppCode,
  setAppEnabled,
  readAppEditor,
  requestPaneAppTab,
  openRequestPaneTabOverflow,
  requestPaneOverflowTabItem,
  activeAppPreviewSlot,
  activeAppView,
  appEmptyState,
  previewApp,
  exitApp,
  selectViewMode,
  getAppWebviewSrc,
  getAppWebviewHtml,
  evalInActiveAppGuest,
  waitForAppGuestReady,
  createApp,
  selectAppView,
  renameWsMessage,
  elementIsInsideDropdown,
  openSystemProxyPanel,
  setTextBody,
  saveTransientRequestAs,
  openImportReview,
  clickOutsideModal,
  setWindowContentSize
};

export type { SandboxMode, EnvironmentType, EnvironmentVariable, ImportCollectionOptions, LinkAwareRequestType };
export type { AssertionInput } from '../../../playwright/pages/request/assertions';
export type { ScriptSubTab } from '../../../playwright/pages/request/script';
export type { CreateRequestOptions, CreateUntitledRequestOptions, CreateTransientRequestOptions } from '../../../playwright/pages/request/create';

// Moved to playwright/pages/sidebar/. Re-exported for existing deep imports of utils/page/actions.
export {
  clickEmptySidebarSpace,
  collapseFolder,
  expandCollection,
  expandFolder,
  openExampleFromSidebar,
  openFolderRequest,
  openRequest,
  openRequestInFolder,
  openfolder,
  toggleOpenCollectionItem,
  toggleRequestExamples
} from '../../../playwright/pages/sidebar/collection-tree';

export {
  chooseCloneLocation,
  cloneItem,
  copyItem,
  createFolder,
  createFolderViaModal,
  createRequestFromEmptyStateCta,
  createRequestViaModal,
  createRequestWithEditedFilename,
  deleteRequest,
  openCloneCollectionModal,
  openItemActionsMenu,
  openNewFolderModal,
  openNewRequestModal,
  openRenameModal,
  pasteIntoCollection,
  pasteIntoFolder,
  renameCollectionItem,
  renameItemTo,
  renameViaFilename,
  revealFilesystemName
} from '../../../playwright/pages/sidebar/item-actions';
