import { test, expect } from '../../../playwright';

test.describe.serial('bru.setEnvVar(name, value)', () => {
  test.setTimeout(2 * 10 * 1000);

  test('set env var using script', async ({ pageWithUserData: page, restartApp }) => {
    // Select the collection and request
    await page.locator('#sidebar-collection-name').click();
    await page.getByText('api-setEnvVar-without-persist', { exact: true }).click();

    // open environment dropdown
    await page.locator('div.current-environment').click();

    // select stage environment
    await expect(page.locator('.dropdown-item').filter({ hasText: 'Stage' })).toBeVisible();
    await page.locator('.dropdown-item').filter({ hasText: 'Stage' }).click();
    await expect(page.locator('.current-environment').filter({ hasText: /Stage/ })).toBeVisible();

    // Send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();
    await page.waitForTimeout(1000);

    // confirm that the environment variable is set
    await page.locator('div.current-environment').click();
    await page.getByText('Configure', { exact: true }).click();
    await expect(page.getByRole('row', { name: 'token' }).getByRole('cell').nth(1)).toBeVisible();
    await expect(page.getByRole('row', { name: 'secret' }).getByRole('cell').nth(2)).toBeVisible();
    await page.getByText('×').click();

    // we restart the app to confirm that the environment variable is not persisted
    const newApp = await restartApp();
    const newPage = await newApp.firstWindow();

    // select the collection and request
    await newPage.locator('#sidebar-collection-name').click();
    await newPage.getByText('api-setEnvVar-without-persist', { exact: true }).click();

    // open environment dropdown
    await newPage.locator('div.current-environment').click();
    await newPage.getByText('Configure', { exact: true }).click();

    // ensure that the environment variable is not persisted
    await expect(newPage.locator('table.environment-variables tbody')).not.toContainText('token');

    // close the environment variable modal
    await newPage.getByText('×').click();
    await newPage.close();
  });
});
