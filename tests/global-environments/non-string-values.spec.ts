import { test, expect } from '../../playwright';
import { openCollectionAndAcceptSandbox, closeAllCollections } from '../utils/page';

test.describe('Global Environment Variables - Non-string Values', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    // Cleanup: close all collections
    await closeAllCollections(page);
  });

  test('should seed non-string globals via request and verify read-only + tooltip', async ({
    pageWithUserData: page
  }) => {
    await openCollectionAndAcceptSandbox(page, 'global-env-non-string', 'safe');

    await test.step('Create a new global environment with a string variable', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();

      // Create a new global environment
      await page.getByRole('button', { name: 'Create' }).click();
      await page.locator('#environment-name').click();
      await page.locator('#environment-name').fill('Test Env');
      await page.getByRole('button', { name: 'Create', exact: true }).click();

      // Add a string variable.
      await page.getByTestId('add-variable').click();
      const newRow = page.locator('tbody tr').last();
      await newRow.locator('input[name$=".name"]').fill('stringVar');
      await newRow.locator('.CodeMirror').click();
      await page.keyboard.type('hello world');

      // Save
      await page.getByTestId('save-env').click();

      // Verify that the string variable value is saved and displayed correctly.
      await expect(newRow.locator('.CodeMirror-line').first()).toContainText('hello world');
      // Close the environment modal
      await page.locator('[data-test-id="modal-close-button"]').click();
    });

    // Request contains a script that sets the non-string global variables.
    await test.step('Run the request to seed non-string global variables via post-script', async () => {
      await page.getByText('set-global-nonstring').click();
      await page.getByTestId('send-arrow-icon').click();

      // wait for the response to arrive
      await page.getByTestId('response-status-code').waitFor({ state: 'visible' });
      await expect(page.getByTestId('response-status-code')).toHaveText(/200/);
    });

    await test.step('Re-open Global Environments to see the seeded variables', async () => {
      await page.getByTestId('environment-selector-trigger').click();
      await page.getByTestId('env-tab-global').click();
      await page.getByRole('button', { name: 'Configure' }).click();
    });

    const envModal = page
      .locator('.bruno-modal-card')
      .filter({ has: page.locator('.bruno-modal-header-title', { hasText: 'Global Environments' }) });

    const numericInput = envModal.locator('input[value="numericVar"]');
    const booleanInput = envModal.locator('input[value="booleanVar"]');
    await expect(numericInput).toBeVisible();
    await expect(booleanInput).toBeVisible();
    const numericRow = numericInput.locator('xpath=ancestor::tr');
    const booleanRow = booleanInput.locator('xpath=ancestor::tr');

    await test.step('Verify that numericVar is read-only with tooltip', async () => {
      // This value is set via a post-script (not user input). We verify that attempts to edit the input do not change the value, proving it is read-only in the UI.

      // Verify the script-set value is rendered.
      await expect(numericRow.locator('.CodeMirror-line').first()).toContainText(/170001/);

      // Verify that typing into the input does not mutate the value.
      await numericRow.locator('.CodeMirror').click();
      await page.keyboard.type('999');
      await expect(numericRow.locator('.CodeMirror-line').first()).toContainText(/170001/);

      // Hovering over the info icon reveals the tooltip.
      // It is anchored to the info icon element id, so hover/click reveals it reliably.
      const infoIcon = page.locator('#numericVar-disabled-info-icon');
      await infoIcon.hover();

      // The tooltip explains why the field is locked.
      const tooltip = page.locator('[role="tooltip"], .react-tooltip');
      await expect(tooltip.first()).toBeVisible();
      await expect(tooltip.first()).toContainText('Non-string values set via scripts are read-only and can only be updated through scripts.');

      // Hovering outside the tooltip should hide it.
      await page.mouse.move(0, 0);
      await expect(tooltip.first()).not.toBeVisible();

      // Clicking the info icon reveals the tooltip.
      await infoIcon.click();
      await expect(tooltip.first()).toBeVisible();
      await expect(tooltip.first()).toContainText('Non-string values set via scripts are read-only and can only be updated through scripts.');
    });

    await test.step('Verify that booleanVar is read-only with tooltip', async () => {
      // This value is also set via post-script.
      await expect(booleanRow.locator('.CodeMirror-line').first()).toContainText(/true/);

      // Verify that typing into the input does not mutate the value.
      await booleanRow.locator('.CodeMirror').click();
      await page.keyboard.type('false');
      await expect(booleanRow.locator('.CodeMirror-line').first()).toContainText(/true/);

      // Hovering over the info icon reveals the tooltip.
      const infoIcon = page.locator('#booleanVar-disabled-info-icon');
      await infoIcon.hover();

      // The tooltip explains why the field is locked.
      const tooltip = page.locator('[role="tooltip"], .react-tooltip');
      await expect(tooltip.first()).toBeVisible();
      await expect(tooltip.first()).toContainText('Non-string values set via scripts are read-only and can only be updated through scripts.');
    });

    await test.step('Verify that stringVar remains editable', async () => {
      // Unlike script-managed values above, this one is user-managed.
      const stringInput = envModal.locator('input[value="stringVar"]');
      await expect(stringInput).toBeVisible();
      const stringRow = stringInput.locator('xpath=ancestor::tr');

      await expect(stringRow.locator('.CodeMirror-line').first()).toContainText('hello world');
      await stringRow.locator('.CodeMirror').click();
      await page.keyboard.type(' updated');

      // Verify the user edit persists in the UI.
      await expect(stringRow.locator('.CodeMirror-line').first()).toContainText('hello world updated');
      // Close the environment modal
      await page.locator('[data-test-id="modal-close-button"]').click();
    });
  });
});
