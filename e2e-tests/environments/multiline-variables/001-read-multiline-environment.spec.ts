import { test, expect } from '../../../playwright';

test.describe('Multiline Variables - Read Environment Test', () => {
  test('should read existing multiline environment variables and execute request', async ({ pageWithUserData: page }) => {
    test.setTimeout(30 * 1000);

    // Step 1: Wait for collection to be loaded and click it
    await expect(page.locator('#sidebar-collection-name')).toBeVisible();
    await page.locator('#sidebar-collection-name').click();

    // Step 2: Handle collection dialog (following proven pattern from persistent-env-tests)
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();

    // Step 3: Wait for collection to be ready and navigate to ping-request
    await expect(page.getByText('ping-request', { exact: true })).toBeVisible();
    await page.getByText('ping-request', { exact: true }).click();

    // Step 4: Wait for request page to load and select Test environment
    await expect(page.getByText('No Environment')).toBeVisible();
    await page.getByText('No Environment').click();

    // Step 5: Wait for environment dropdown and select Test
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Test' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Test' }).click();

    // Step 6: Wait for Test environment to be selected
    await expect(page.locator('.current-environment').filter({ hasText: /Test/ })).toBeVisible();

    // Step 7: Wait for send button and execute request
    const sendButton = page.locator('#send-request').getByRole('img').nth(2);
    await expect(sendButton).toBeVisible();
    await sendButton.click();

    // Step 8: Wait for response status
    await expect(page.getByText('200')).toBeVisible();

            // Step 9: Verify environment variable resolution in response content
    await expect(page.getByRole('main')).toContainText('httpfaker.org');
    await expect(page.getByRole('main')).toContainText('Host: https://www.httpfaker.org');
    await expect(page.getByRole('main')).toContainText('Ping Test Request');

    // Step 10: Verify multiline environment variable resolution
    // The multiline_data variable should be resolved and contain all three lines
    await expect(page.getByRole('main')).toContainText('line1: first line of data');
    await expect(page.getByRole('main')).toContainText('line2: second line of data');
    await expect(page.getByRole('main')).toContainText('line3: third line of data');
    await expect(page.getByRole('main')).toContainText('Multiline Data:');
  });
});