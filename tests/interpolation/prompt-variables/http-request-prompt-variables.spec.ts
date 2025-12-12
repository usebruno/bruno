import { test, expect } from '../../../playwright';
import { closeAllCollections } from '../../utils/page';

test.describe('Prompt Variables Interpolation', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  // without client certificate - no HTTPS
  test('Verifying if the prompt variables are prompted correctly for the http request - without client certificate', async ({ pageWithUserData: page }) => {
    let promptVariablesModal;
    let promptInputs;

    await test.step('Open collection and navigate to the http request with prompt variables', async () => {
      // Open collection and accept sandbox mode
      await page.locator('#sidebar-collection-name').filter({ hasText: 'prompt-variables-interpolation' }).click();

      // Navigate to the request
      await page.locator('.collection-item-name').filter({ hasText: 'http-folder' }).click();
      await page.locator('.collection-item-name').filter({ hasText: 'http-request-without-ca' }).click();
    });

    await test.step('Send the request and verify the prompt variables modal is visible', async () => {
      // Send the request
      await page.getByTestId('send-arrow-icon').click();

      promptVariablesModal = page.getByRole('dialog').filter({ has: page.locator('.bruno-modal-header-title').getByText('Input Required') });
      await promptVariablesModal.waitFor({ state: 'visible' });
    });

    await test.step('Verify duplicate prompt variables are not allowed', async () => {
      // Enter the prompt variables
      promptInputs = promptVariablesModal.getByTestId('prompt-variable-input-container');
      await expect(promptInputs).toHaveCount(11);
    });

    await test.step('Verify disabled / non selected modes prompt variables are not prompted', async () => {
      // verify that any prompt added to the inactive fields starting with label "Should Not Prompt" are not displayed
      // eg: 1. Headers - disabled or hierarchical overrides should not be displayed
      // 2. Vars - respects hierarchical overrides, eg: request var > folder var > collection var > global env var
      // 3. Body - only prompts from selected body mode should be displayed eg: json
      // 4. Auth - only prompts from selected mode should be displayed eg: basic, respects hierarchical overrides
      // 5. Client Cert - only prompts from current domain config should be displayed
      await expect(promptInputs.filter({ hasText: 'Should Not Prompt', exact: true })).toHaveCount(0);
    });

    await test.step('Fill the prompt variables and send the request', async () => {
      await promptInputs.filter({ hasText: 'Enter Query Variable' }).locator('input').fill('queryPromptValue');
      await promptInputs.filter({ hasText: 'Enter Body Variable' }).locator('input').fill('bodyPromptValue');
      await promptInputs.filter({ hasText: 'Enter Number Variable' }).locator('input').fill('123');
      await promptInputs.filter({ hasText: 'Enter Boolean Variable' }).locator('input').fill('true');
      await promptInputs.filter({ hasText: 'Enter Request Variable' }).locator('input').fill('requestVarPromptValue');
      await promptInputs.filter({ hasText: 'Enter Folder Variable' }).locator('input').fill('folderVarPromptValue');
      await promptInputs.filter({ hasText: 'Enter Collection Variable' }).locator('input').fill('collectionVarPromptValue');
      await promptInputs.filter({ hasText: 'Enter Collection Env Variable' }).locator('input').fill('collectionEnvVarPromptValue');
      await promptInputs.filter({ hasText: 'Enter Global Env Variable' }).locator('input').fill('globalEnvVarPromptValue');
      await promptInputs.filter({ hasText: 'Enter Folder Auth Password' }).locator('input').fill('folderAuthPasswordValue');
      await promptInputs.filter({ hasText: 'Enter Folder Header Variable' }).locator('input').fill('folderHeaderVarPromptValue');

      // Submit the prompt variables
      await promptVariablesModal.getByRole('button', { name: 'Continue' }).click();
    });

    await test.step('Verify the request is sent with the correct variables', async () => {
      // Verify the response status code
      await expect(page.getByTestId('response-status-code')).toHaveText(/200/);
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"folderVar": "folderVarPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"collectionVar": "collectionVarPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"collectionEnvVar": "collectionEnvVarPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"globalEnvVar": "globalEnvVarPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"requestVar": "requestVarPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"body": "bodyPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"repeat-1": "bodyPromptValue"').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"bodyNumber": 123').first()).toBeVisible();
      await expect(page.locator('.response-pane').locator('.CodeMirror-line').getByText('"bodyBoolean": true').first()).toBeVisible();
    });
  });

  // with client certificate - HTTPS
  test('Verifying if the prompt variables are prompted correctly for the http request - with client certificate', async ({ pageWithUserData: page }) => {
    let promptVariablesModal;
    let promptInputs;

    await test.step('Open collection and navigate to the http request with prompt variables', async () => {
      // Open collection and accept sandbox mode
      await page.locator('#sidebar-collection-name').filter({ hasText: 'prompt-variables-interpolation' }).click();

      // Navigate to the request
      await page.locator('.collection-item-name').filter({ hasText: 'http-folder' }).click();
      await page.locator('.collection-item-name').filter({ hasText: 'https-request-with-ca' }).click();
    });

    await test.step('Send the request and verify the prompt variables modal is visible', async () => {
      // Send the request
      await page.getByTestId('send-arrow-icon').click();

      promptVariablesModal = page.getByRole('dialog').filter({ has: page.locator('.bruno-modal-header-title').getByText('Input Required') });
      await promptVariablesModal.waitFor({ state: 'visible' });
    });

    await test.step('Verify disabled / non selected modes prompt variables are not prompted', async () => {
      promptInputs = promptVariablesModal.getByTestId('prompt-variable-input-container');
      // verify that any prompt added to the inactive fields starting with label "Should Not Prompt" are not displayed
      // eg: 1. Headers - disabled or hierarchical overrides should not be displayed
      // 2. Vars - respects hierarchical overrides, eg: request var > folder var > collection var > global env var
      // 3. Body - only prompts from selected body mode should be displayed eg: json
      // 4. Auth - only prompts from selected mode should be displayed eg: basic, respects hierarchical overrides
      // 5. Client Cert - only prompts from current domain config should be displayed
      await expect(promptInputs.filter({ hasText: 'Should Not Prompt', exact: true })).toHaveCount(0);
      await expect(promptInputs.filter({ hasText: 'Enter Client CA Password', exact: true })).toHaveCount(1);
    });

    await test.step('Fill the prompt variables and send the request', async () => {
      await promptInputs.filter({ hasText: 'Enter Client CA Password' }).locator('input').fill('clientCAPasswordValue');
      // leave the rest of the prompt variables empty

      // Submit the prompt variables
      await promptVariablesModal.getByRole('button', { name: 'Continue' }).click();
    });

    // @TODO: setup a valid certificate and server required to verify the request is sent with the correct variables
  });
});
