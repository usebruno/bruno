import { execSync } from 'child_process';
import { test, expect } from '../../../playwright';
import { Page, ElectronApplication } from '@playwright/test';
import path from 'path';
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
  test.afterAll(async () => {
    // Reset the request file to the original state after saving changes
    execSync(`git checkout -- "${path.join(__dirname, 'fixtures', 'collections', 'collection 1', 'test-request.bru')}"`);
  });

  test('should show/hide close all icon based on hover state', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    await test.step('Verify initial state', async () => {
      await expect(locators.sidebar.collection('collection 1')).toBeVisible();
      const closeAllButton = locators.sidebar.closeAllCollectionsButton();
      await expect(closeAllButton).toHaveCSS('opacity', '0');
    });

    await test.step('Hover to show icon', async () => {
      const closeAllButton = locators.sidebar.closeAllCollectionsButton();
      await locators.sidebar.collectionsContainer().hover();
      await expect(closeAllButton).toHaveCSS('opacity', '1');
    });

    await test.step('Move mouse away to hide icon', async () => {
      const closeAllButton = locators.sidebar.closeAllCollectionsButton();
      await page.mouse.move(0, 0);
      await expect(closeAllButton).toHaveCSS('opacity', '0');
    });
  });

  test('should handle closing all collections without unsaved changes', async ({ restartApp }) => {
    const { page, locators } = await restartAppAndGetLocators(restartApp);

    await test.step('Verify collections are visible', async () => {
      await expect(locators.sidebar.collection('collection 1')).toBeVisible();
      await expect(locators.sidebar.collection('collection 2')).toBeVisible();
    });

    await test.step('Cancel closing collections', async () => {
      // Hover and click close all icon
      await locators.sidebar.collectionsContainer().hover();
      await locators.sidebar.closeAllCollectionsButton().click();

      // Verify confirmation modal appears
      const confirmModal = locators.modal.byTitle('Close all collections');
      await expect(confirmModal).toBeVisible();

      // Click "Cancel" to dismiss the modal
      await locators.modal.closeButton().click();

      // Verify collections are still visible
      await expect(locators.sidebar.collection('collection 1')).toBeVisible();
      await expect(locators.sidebar.collection('collection 2')).toBeVisible();
    });

    await test.step('Confirm closing collections', async () => {
      // Hover and click close all icon again
      await locators.sidebar.collectionsContainer().hover();
      await locators.sidebar.closeAllCollectionsButton().click();

      // Verify confirmation modal appears
      const confirmModal = locators.modal.byTitle('Close all collections');
      await expect(confirmModal).toBeVisible();

      // Click "Close All" to confirm
      await locators.modal.button('Close All').click();

      // Verify collections are closed
      await expect(locators.sidebar.collection('collection 1')).not.toBeVisible();
      await expect(locators.sidebar.collection('collection 2')).not.toBeVisible();
    });
  });

  test('should discard changes and close collections when Discard and Close is clicked', async ({ restartApp }) => {
    const { page, locators: newLocators } = await restartAppAndGetLocators(restartApp);

    await test.step('Verify collections are visible', async () => {
      await expect(newLocators.sidebar.collection('collection 1')).toBeVisible();
      await expect(newLocators.sidebar.collection('collection 2')).toBeVisible();
    });

    await test.step('Create unsaved changes', async () => {
      await openCollectionAndAcceptSandbox(page, 'collection 1');
      await newLocators.sidebar.request('test-request').click();

      const urlContainer = page.locator('#request-url');
      await expect(urlContainer).toBeVisible();

      const codeMirrorEditor = urlContainer.locator('.CodeMirror');
      await codeMirrorEditor.click();
      await page.keyboard.type('modified');
    });

    await test.step('Trigger close all and discard changes', async () => {
      await newLocators.sidebar.collectionsContainer().hover();
      await newLocators.sidebar.closeAllCollectionsButton().click();

      const unsavedChangesModal = newLocators.modal.byTitle('Close all collections');
      await expect(unsavedChangesModal).toBeVisible();
      await expect(unsavedChangesModal.getByText('Do you want to save')).toBeVisible();

      await newLocators.modal.button('Discard and Close').click();

      await expect(page.getByText('Closed all collections')).toBeVisible();
      await expect(newLocators.sidebar.collection('collection 1')).not.toBeVisible();
      await expect(newLocators.sidebar.collection('collection 2')).not.toBeVisible();
    });

    await test.step('Restart app to verify changes were discarded', async () => {
      const { page: restartedPage, locators: restartedLocators } = await restartAppAndGetLocators(restartApp);

      await expect(restartedLocators.sidebar.collection('collection 1')).toBeVisible();
      await openCollectionAndAcceptSandbox(restartedPage, 'collection 1');
      await restartedLocators.sidebar.request('test-request').click();

      const urlContainerAfterReopen = restartedPage.locator('#request-url');
      await expect(urlContainerAfterReopen).toBeVisible();
      const urlAfterReopen = await urlContainerAfterReopen.locator('.CodeMirror').textContent();
      expect(urlAfterReopen).not.toContain('modified');
    });
  });

  test('should save changes and close collections when Save and Close is clicked', async ({ restartApp }) => {
    const { page, locators: newLocators } = await restartAppAndGetLocators(restartApp);

    await test.step('Verify collections are visible', async () => {
      await expect(newLocators.sidebar.collection('collection 1')).toBeVisible();
      await expect(newLocators.sidebar.collection('collection 2')).toBeVisible();
    });

    await test.step('Create unsaved changes', async () => {
      await openCollectionAndAcceptSandbox(page, 'collection 1');
      await newLocators.sidebar.request('test-request').click();

      const urlContainer = page.locator('#request-url');
      await expect(urlContainer).toBeVisible();

      const codeMirrorEditor = urlContainer.locator('.CodeMirror');
      await codeMirrorEditor.click();
      await page.keyboard.type('modified');
    });

    await test.step('Trigger close all and save changes', async () => {
      await newLocators.sidebar.collectionsContainer().hover();
      await newLocators.sidebar.closeAllCollectionsButton().click();

      const unsavedChangesModal = newLocators.modal.byTitle('Close all collections');
      await expect(unsavedChangesModal).toBeVisible();
      await expect(unsavedChangesModal.getByText('Do you want to save')).toBeVisible();

      await newLocators.modal.button('Save and Close').click();

      await expect(newLocators.sidebar.collection('collection 1')).not.toBeVisible();
      await expect(newLocators.sidebar.collection('collection 2')).not.toBeVisible();
    });

    await test.step('Restart app to verify changes were saved', async () => {
      const { page: restartedPage, locators: restartedLocators } = await restartAppAndGetLocators(restartApp);

      await expect(restartedLocators.sidebar.collection('collection 1')).toBeVisible();
      await openCollectionAndAcceptSandbox(restartedPage, 'collection 1');
      await restartedLocators.sidebar.request('test-request').click();

      const urlContainerAfterReopen = restartedPage.locator('#request-url');
      await expect(urlContainerAfterReopen).toBeVisible();
      const urlAfterReopen = await urlContainerAfterReopen.locator('.CodeMirror').textContent();
      expect(urlAfterReopen).toContain('modified');
    });
  });
});
