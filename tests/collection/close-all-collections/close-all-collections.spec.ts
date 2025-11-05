import { test, expect } from '../../../playwright';
import { Page, ElectronApplication } from '@playwright/test';
import { openCollectionAndAcceptSandbox } from '../../utils/page/actions';
import { buildCommonLocators } from '../../utils/page/locators';

/**
 * Helper function to restart app and get fresh state with locators
 */
const restartAppAndGetLocators = async (restartApp: (options?: { initUserDataPath?: string }) => Promise<ElectronApplication>): Promise<{ app: ElectronApplication; page: Page; locators: ReturnType<typeof buildCommonLocators> }> => {
  const app = await restartApp();
  const page = await app.firstWindow();
  await page.locator('[data-app-state="loaded"]').waitFor();
  const locators = buildCommonLocators(page);
  return { app, page, locators };
};

test.describe('Close All Collections', () => {
  test('should show close all icon when collections exist and sidebar is hovered', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    const locators = buildCommonLocators(page);

    // Verify collections are visible
    await expect(locators.sidebar.collection('bruno-testbench')).toBeVisible();

    // Hover over Collections component to show close all icon
    await locators.sidebar.collections().hover();

    // Verify close all icon appears (opacity becomes 1)
    const closeAllButton = locators.sidebar.closeAllCollectionsButton();
    await expect(closeAllButton).toHaveCSS('opacity', '1');

    // Move mouse away to clear hover state for next test
    await page.mouse.move(0, 0);
  });

  test('should not show close all icon when sidebar is not hovered', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    const locators = buildCommonLocators(page);

    // Verify collections are visible
    await expect(locators.sidebar.collection('bruno-testbench')).toBeVisible();

    // Don't hover - icon should have opacity 0 (not visible)
    const closeAllButton = locators.sidebar.closeAllCollectionsButton();
    await expect(closeAllButton).toHaveCSS('opacity', '0');
  });

  test('should cancel closing all collections', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    const locators = buildCommonLocators(page);

    // Verify both collections are visible (pre-opened from init-user-data)
    await expect(locators.sidebar.collection('bruno-testbench')).toBeVisible();
    await expect(locators.sidebar.collection('OAuth2 Demo')).toBeVisible();

    // Hover and click close all icon
    await locators.sidebar.collections().hover();
    await locators.sidebar.closeAllCollectionsButton().click();

    // Click "Cancel" to dismiss the modal
    await locators.modal.closeButton().click();

    // Verify collections are still visible
    await expect(locators.sidebar.collection('bruno-testbench')).toBeVisible();
    await expect(locators.sidebar.collection('OAuth2 Demo')).toBeVisible();
  });

  test('should show unsaved changes modal when collections have drafts', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();
    const locators = buildCommonLocators(page);

    // Verify both collections are visible (pre-opened from init-user-data)
    await expect(locators.sidebar.collection('bruno-testbench')).toBeVisible();
    await expect(locators.sidebar.collection('OAuth2 Demo')).toBeVisible();

    // Open a collection and modify a request to create a draft
    await openCollectionAndAcceptSandbox(page, 'bruno-testbench');

    // Navigate to the asserts folder and click on the test-assert-combinations request
    await locators.sidebar.folder('asserts').click();
    await locators.sidebar.request('test-assert-combinations').click();

    // Modify the URL to create a draft
    const urlContainer = page.locator('#request-url');
    await expect(urlContainer).toBeVisible();
    await urlContainer.locator('.CodeMirror').click();
    await page.keyboard.type('modified');

    // Hover and click close all
    await locators.sidebar.collections().hover();
    await locators.sidebar.closeAllCollectionsButton().click();

    // Verify unsaved changes modal appears
    const unsavedChangesModal = locators.modal.element('Close all collection');
    await expect(unsavedChangesModal).toBeVisible();
    await expect(unsavedChangesModal.getByText('Do you want to save')).toBeVisible();

    // Click "Discard and Close" to close the modal and discard changes
    const discardButton = locators.modal.button('Discard and Close');
    await discardButton.click();
  });

  test('should close all collections when confirmed', async ({ restartApp }) => {
    // Restart app to get fresh state (previous test closed collections)
    const { page, locators: newLocators } = await restartAppAndGetLocators(restartApp);

    // Verify both collections are visible (pre-opened from init-user-data)
    await expect(newLocators.sidebar.collection('bruno-testbench')).toBeVisible();
    await expect(newLocators.sidebar.collection('OAuth2 Demo')).toBeVisible();

    // Hover and click close all icon
    await newLocators.sidebar.collections().hover();
    await newLocators.sidebar.closeAllCollectionsButton().click();

    // Verify confirmation modal appears
    const confirmModal = newLocators.modal.element('Close all collection');
    await expect(confirmModal).toBeVisible();

    // Click "Close All" to confirm
    await newLocators.modal.button('Close All').click();

    // Verify collections are closed
    await expect(newLocators.sidebar.collection('bruno-testbench')).not.toBeVisible();
    await expect(newLocators.sidebar.collection('OAuth2 Demo')).not.toBeVisible();
  });

  test('should discard changes and close collections when Discard and Close is clicked', async ({ restartApp }) => {
    // Restart app to get fresh state with collections open from init-user-data
    const { page, locators: newLocators } = await restartAppAndGetLocators(restartApp);

    // Verify both collections are visible (pre-opened from init-user-data)
    await expect(newLocators.sidebar.collection('bruno-testbench')).toBeVisible();
    await expect(newLocators.sidebar.collection('OAuth2 Demo')).toBeVisible();

    // Open the collection and accept sandbox to access folders/requests
    await openCollectionAndAcceptSandbox(page, 'bruno-testbench');

    // Navigate to the asserts folder and click on the test-assert-combinations request
    await newLocators.sidebar.folder('asserts').click();
    await newLocators.sidebar.request('test-assert-combinations').click();

    // Wait for the URL input to be visible
    const urlContainer = page.locator('#request-url');
    await expect(urlContainer).toBeVisible();

    // Click on the CodeMirror editor and modify it to create a draft
    const codeMirrorEditor = urlContainer.locator('.CodeMirror');
    await codeMirrorEditor.click();
    await page.keyboard.type('modified');

    // Hover and click close all
    await newLocators.sidebar.collections().hover();
    await newLocators.sidebar.closeAllCollectionsButton().click();

    // Verify unsaved changes modal appears
    const unsavedChangesModal = newLocators.modal.element('Close all collection');
    await expect(unsavedChangesModal).toBeVisible();
    await expect(unsavedChangesModal.getByText('Do you want to save')).toBeVisible();

    // Click "Discard and Close"
    await newLocators.modal.button('Discard and Close').click();

    // Verify toast notification and collections are closed
    await expect(page.getByText('Closed all collections')).toBeVisible();
    await expect(newLocators.sidebar.collection('bruno-testbench')).not.toBeVisible();
    await expect(newLocators.sidebar.collection('OAuth2 Demo')).not.toBeVisible();

    // Restart app to verify changes were discarded
    await test.step('Restart app to verify changes were discarded', async () => {
      const { page: restartedPage, locators: restartedLocators } = await restartAppAndGetLocators(restartApp);

      // Verify collection is open from init-user-data and open it
      await expect(restartedLocators.sidebar.collection('bruno-testbench')).toBeVisible();
      await openCollectionAndAcceptSandbox(restartedPage, 'bruno-testbench');
      await restartedLocators.sidebar.folder('asserts').click();
      await restartedLocators.sidebar.request('test-assert-combinations').click();

      // Verify the URL was not saved (should be original, not the modified version)
      const urlContainerAfterReopen = restartedPage.locator('#request-url');
      await expect(urlContainerAfterReopen).toBeVisible();
      const urlAfterReopen = await urlContainerAfterReopen.locator('.CodeMirror').textContent();
      expect(urlAfterReopen).not.toContain('modified');
    });
  });

  test('should save changes and close collections when Save and Close is clicked', async ({ restartApp }) => {
    // Restart app to get fresh state with collections open from init-user-data
    const { page, locators: newLocators } = await restartAppAndGetLocators(restartApp);

    // Verify both collections are visible (pre-opened from init-user-data)
    await expect(newLocators.sidebar.collection('bruno-testbench')).toBeVisible();
    await expect(newLocators.sidebar.collection('OAuth2 Demo')).toBeVisible();

    // Open the collection and accept sandbox to access folders/requests
    await openCollectionAndAcceptSandbox(page, 'bruno-testbench');

    // Navigate to the asserts folder and click on the test-assert-combinations request
    await newLocators.sidebar.folder('asserts').click();
    await newLocators.sidebar.request('test-assert-combinations').click();

    // Wait for the URL input to be visible
    const urlContainer = page.locator('#request-url');
    await expect(urlContainer).toBeVisible();

    // Click on the CodeMirror editor and modify it to create a draft
    const codeMirrorEditor = urlContainer.locator('.CodeMirror');
    await codeMirrorEditor.click();
    await page.keyboard.type('modified');

    // Hover and click close all
    await newLocators.sidebar.collections().hover();
    await newLocators.sidebar.closeAllCollectionsButton().click();

    // Verify unsaved changes modal appears
    const unsavedChangesModal = newLocators.modal.element('Close all collection');
    await expect(unsavedChangesModal).toBeVisible();
    await expect(unsavedChangesModal.getByText('Do you want to save')).toBeVisible();

    // Click "Save and Close"
    const saveButton = newLocators.modal.button('Save and Close');
    await saveButton.click();

    // Verify collections are closed
    await expect(newLocators.sidebar.collection('bruno-testbench')).not.toBeVisible();
    await expect(newLocators.sidebar.collection('OAuth2 Demo')).not.toBeVisible();

    // Restart app to verify changes were saved
    await test.step('Restart app to verify changes were saved', async () => {
      const { page: restartedPage, locators: restartedLocators } = await restartAppAndGetLocators(restartApp);

      // Verify collection is open from init-user-data and open it
      await expect(restartedLocators.sidebar.collection('bruno-testbench')).toBeVisible();
      await openCollectionAndAcceptSandbox(restartedPage, 'bruno-testbench');
      await restartedLocators.sidebar.folder('asserts').click();
      await restartedLocators.sidebar.request('test-assert-combinations').click();

      // Verify the URL was saved (should contain the modified version)
      const urlContainerAfterReopen = restartedPage.locator('#request-url');
      await expect(urlContainerAfterReopen).toBeVisible();
      const urlAfterReopen = await urlContainerAfterReopen.locator('.CodeMirror').textContent();
      expect(urlAfterReopen).toContain('modified');
    });
  });
});
