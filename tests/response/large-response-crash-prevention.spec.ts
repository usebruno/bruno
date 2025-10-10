import { test, expect } from '../../playwright';

test.describe('Large Response Crash Prevention', () => {
  test('should show appropriate warning for responses over 10MB', async ({ page, createTmpDir }) => {
    // Create collection
    await page.getByLabel('Create Collection').click();
    await page.getByLabel('Name').fill('size-warning-test');
    await page.getByLabel('Name').press('Tab');
    await page.getByLabel('Location').fill(await createTmpDir('size-warning-test'));
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await page.getByText('size-warning-test').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // Create request
    await page.locator('#create-new-tab').getByRole('img').click();
    await page.getByPlaceholder('Request Name').fill('size-check');
    await page.locator('#new-request-url .CodeMirror').click();
    await page.locator('textarea').fill('https://samples.json-format.com/employees/json/employees_50MB.json');
    await page.getByRole('button', { name: 'Create' }).click();

    // Send request
    const sendButton = page.locator('#send-request').getByRole('img').nth(2);
    await sendButton.click();

    // Verify warning appears
    await expect(page.getByText('Large Response Warning')).toBeVisible({ timeout: 60000 });

    // Verify warning content
    await expect(page.getByText('Handling responses over')).toBeVisible();
    await expect(page.getByText('could degrade performance')).toBeVisible();

    // Verify action button
    await expect(page.getByRole('button', { name: 'View' })).toBeVisible();

    console.log('Large response warning displayed correctly');
  });
});
