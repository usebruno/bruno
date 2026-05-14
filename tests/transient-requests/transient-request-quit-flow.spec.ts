import { test, expect } from '../../playwright';
import { createCollection, createTransientRequest, fillRequestUrl, closeAllCollections } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe.serial('Transient Requests - Quit Flow', () => {
  test('should open transient save modal when saving during app quit flow', async ({ page, electronApp, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionPath = await createTmpDir('transient-quit-flow');

    await test.step('Create collection and transient request', async () => {
      await createCollection(page, 'transient-quit-flow-test', collectionPath);
      await createTransientRequest(page, { requestType: 'HTTP' });
      await fillRequestUrl(page, 'http://localhost:8081/ping');
    });

    await test.step('Trigger app quit flow from main process', async () => {
      await electronApp.evaluate(({ BrowserWindow }) => {
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.close();
          }
        }
      });

      const unsavedChangesModal = page.locator('.bruno-modal-card').filter({ hasText: 'Unsaved changes' });
      await expect(unsavedChangesModal).toBeVisible({ timeout: 10000 });
      await unsavedChangesModal.getByRole('button', { name: 'Save', exact: true }).click();
    });

    await test.step('Save transient request using existing Save Request flow', async () => {
      const saveTransientModal = page.locator('.bruno-modal-card').filter({ hasText: 'Save Request' });
      await expect(saveTransientModal).toBeVisible({ timeout: 10000 });

      const requestNameInput = saveTransientModal.locator('#request-name');
      await requestNameInput.clear();
      await requestNameInput.fill('Saved via quit flow');

      await saveTransientModal.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByText('Request saved successfully').last()).toBeVisible({ timeout: 10000 });
    });

    await test.step('Verify app remains open and request is saved', async () => {
      await expect(locators.sidebar.collection('transient-quit-flow-test')).toBeVisible();
      await locators.sidebar.collection('transient-quit-flow-test').click();
      await expect(locators.sidebar.request('Saved via quit flow')).toBeVisible({ timeout: 10000 });
    });

    await test.step('Cleanup collections', async () => {
      await closeAllCollections(page);
    });
  });
});
