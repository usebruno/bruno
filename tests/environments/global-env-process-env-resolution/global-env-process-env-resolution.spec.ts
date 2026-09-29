import { test, expect } from '../../../playwright';
import {
  openCollection,
  openEnvironmentSelector,
  openRequest,
  sendRequest,
  expectResponseContains
} from '../../utils/page';

test.describe('Global Environment process.env Resolution', () => {
  test('should resolve process.env variables referenced in global environment', async ({
    pageWithUserData: page
  }) => {
    await test.step('Open collection', async () => {
      await openCollection(page, 'process-env-global-test');
    });

    await test.step('Create .env file with variable via UI', async () => {
      // Open global environment configuration
      await openEnvironmentSelector(page, 'global');
      await page.getByTestId('configure-env').click();

      // Expand the .env Files section
      const dotEnvSection = page.getByTestId('dotenv-files-section');
      await dotEnvSection.waitFor({ state: 'visible' });
      await dotEnvSection.click();

      // Click + to create a new .env file
      await page.getByTestId('create-dotenv-file').click();

      // Accept the default name (.env) and press Enter
      await page.getByTestId('dotenv-name-input').press('Enter');
      await expect(page.getByText('.env file created!')).toBeVisible();

      // Switch to Raw mode to type the variable
      await page.getByTestId('dotenv-view-raw').click();

      // Type the variable into the raw editor
      const rawEditor = page.getByTestId('dotenv-raw-editor').locator('.CodeMirror');
      await rawEditor.click();
      await page.keyboard.type('MY_SECRET=hello-from-dotenv');

      // Save the .env file
      await page.getByTestId('save-dotenv-raw').click();
    });

    await test.step('Verify global environment is active', async () => {
      await expect(page.locator('.current-environment')).toContainText('ProcessEnv Test');
    });

    await test.step('Open request', async () => {
      await openRequest(page, 'process-env-global-test', 'echo-post');
    });

    await test.step('Send request and verify process.env resolved', async () => {
      await sendRequest(page, 200);
    });

    await test.step('Verify response contains resolved value from .env file', async () => {
      await expectResponseContains(page, ['hello-from-dotenv']);
    });
  });
});
