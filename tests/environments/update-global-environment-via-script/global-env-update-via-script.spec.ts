import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Global Environment Variable Update via Script', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should update global environment values via script and verify the changes', async ({
    pageWithUserData: page
  }) => {
    await test.step('Open the collection from sidebar', async () => {
      await page.locator('#sidebar-collection-name').filter({ hasText: 'Global Environment Update' }).click();
    });

    await test.step('Open the test request that has a pre-request script', async () => {
      await page.locator('.collection-name', { hasText: 'Global Environment Update' }).click();
      await page.locator('.collection-item-name', { hasText: 'Test Request' }).click();
    });

    await test.step('Run the request', async () => {
      await page.getByTestId('send-arrow-icon').click();
    });

    await test.step('Open the Global Environment Config modal', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();
      await page.getByText('Configure', { exact: true }).click();
    });

    const globalEnvModal = page.locator('.bruno-modal').filter({ hasText: 'Global Environments' });

    await test.step('Verify that the value of "existingEnvEnabled" is updated by the pre-request script', async () => {
      const updatedExistingEnvEnabledInputDiv = await globalEnvModal.getByTestId('env-var-value-1');
      const updatedExistingEnvEnabledValue = await updatedExistingEnvEnabledInputDiv.locator('.CodeMirror-line').textContent();
      await expect(updatedExistingEnvEnabledValue).toContain('newExistingEnvEnabledValue');
    });

    await test.step('Verify that the value of "existingEnvDisabled" is updated by the pre-request script', async () => {
      const updatedExistingEnvDisabledInputDiv = await globalEnvModal.getByTestId('env-var-value-2');
      const updatedExistingEnvDisabledValue = await updatedExistingEnvDisabledInputDiv.locator('.CodeMirror-line').textContent();
      await expect(updatedExistingEnvDisabledValue).toContain('newExistingEnvDisabledValue');
    });

    await test.step('Verify that a new env variable "newEnv" is added by the pre-request script to the global environment', async () => {
      const newEnvInputDiv = await globalEnvModal.getByTestId('env-var-value-3');
      const newEnvValue = await newEnvInputDiv.locator('.CodeMirror-line').textContent();
      await expect(newEnvValue).toContain('newEnvValue');
    });

    await test.step('Verify that the value of "baseUrl" is unchanged.', async () => {
      const currentBaseUrlInputDiv = await globalEnvModal.getByTestId('env-var-value-0');
      const currentBaseUrlValue = await currentBaseUrlInputDiv.locator('.CodeMirror-line').textContent();
      await expect(currentBaseUrlValue).toContain('https://echo.usebruno.com');
    });

    await test.step('Close the global environment config modal.', async () => {
      await page.getByTestId('modal-close-button').click();
    });
  });
});
