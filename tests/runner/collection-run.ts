import { test } from '../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../utils/page/index';

test.describe.parallel('Collection Run', () => {
  test('Run bruno-testbench in Developer Mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    // Set up developer mode
    await setSandboxMode(page, 'bruno-testbench', 'developer');

    // Select environment
    await page.locator('.environment-selector').nth(1).click();
    await page.locator('.dropdown-item').getByText('Prod').click();

    // Run the collection
    await runCollection(page, 'bruno-testbench');

    // Validate test results
    await validateRunnerResults(page, {
      failed: 0
    });
  });

  test.fixme('Run bruno-testbench in Safe Mode', async ({ pageWithUserData: page }) => {
    test.setTimeout(2 * 60 * 1000);

    await page.getByText('bruno-testbench').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();
    await page.locator('.environment-selector').nth(1).click();
    await page.locator('.dropdown-item').getByText('Prod').click();
    const collectionContainer = page.locator('.collection-name').filter({ hasText: 'bruno-testbench' });
    await collectionContainer.locator('.collection-actions').hover();
    await collectionContainer.locator('.collection-actions .icon').waitFor({ state: 'visible' });
    await collectionContainer.locator('.collection-actions .icon').click();
    await page.getByText('Run', { exact: true }).click();
    // Wait for the runner tab to open
    // If there are existing results, reset first, otherwise wait for Run Collection button
    const resetButton = page.getByRole('button', { name: 'Reset' });
    const runCollectionButton = page.getByRole('button', { name: 'Run Collection' });

    // Check if Reset button is visible (means there are existing results)
    const resetVisible = await resetButton.isVisible().catch(() => false);
    if (resetVisible) {
      await resetButton.click();
      // Wait a bit for the reset to complete
      await page.waitForTimeout(500);
    }

    // Now wait for and click Run Collection button
    await runCollectionButton.waitFor({ state: 'visible', timeout: 10000 });
    await runCollectionButton.click();
    await page.getByRole('button', { name: 'Run Again' }).waitFor({ timeout: 2 * 60 * 1000 });

    // Parse and validate test results from filter buttons
    const allButton = page.locator('button').filter({ hasText: /^All/ });
    const passedButton = page.locator('button').filter({ hasText: /^Passed/ });
    const failedButton = page.locator('button').filter({ hasText: /^Failed/ });
    const skippedButton = page.locator('button').filter({ hasText: /^Skipped/ });

    const totalRequests = parseInt(await allButton.locator('span').innerText());
    const passed = parseInt(await passedButton.locator('span').innerText());
    const failed = parseInt(await failedButton.locator('span').innerText());
    const skipped = parseInt(await skippedButton.locator('span').innerText());

    await expect(failed).toBe(0);
    await expect(passed).toBe(totalRequests - skipped - failed);
  });
});