import { test, expect } from '../../../playwright';

test.describe.serial('collection-level proxy false and with app-level proxy as system', () => {
  test('developer mode', async ({ restartApp }) => {
    process.env.http_proxy = 'http://127.0.0.1:8091';
    process.env.https_proxy = 'http://127.0.0.1:8091';
    const app = await restartApp();
    const page = await app.firstWindow();
    // init dev mode
    await page.getByText('proxy-false').click();
    await page.getByLabel('Developer Mode(use only if').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // close collection settings tab
    await page.getByTestId('collection-settings-tab-close-button').click();

    // check if the app-level proxy is set to `system`
    await page.getByRole('button', { name: 'Open Preferences' }).click();
    await page.getByRole('tab', { name: 'Proxy' }).click();
    await expect(page.getByRole('radio', { name: 'System Proxy' })).toBeChecked();
    await page.locator('[data-test-id="modal-close-button"]').click();

    // check if the collection-level proxy is set to `off`
    await page.getByTitle('proxy-false').click();
    await page.getByRole('tab', { name: 'Proxy' }).click();
    await expect(page.getByRole('radio', { name: 'Off' })).toBeChecked();

    await page.getByText('test-request').click();

    // send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // wait for response
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible', timeout: 2 * 60 * 1000 });

    await page.locator('[data-test-id="response-headers-tab"]').click();

    // check the response headers
    await expect(page.getByRole('cell', { name: 'X-Bruno-Proxy-System' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'X-Bruno-Proxy-App' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'X-Bruno-Proxy-Collection' })).not.toBeVisible();

    process.env.http_proxy = '';
    process.env.https_proxy = '';
  });

  test('safe mode', async ({ restartApp }) => {
    process.env.http_proxy = 'http://127.0.0.1:8091';
    process.env.https_proxy = 'http://127.0.0.1:8091';
    const app = await restartApp();
    const page = await app.firstWindow();
    // init safe mode
    await page.getByText('proxy-false').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // close collection settings tab
    await page.getByTestId('collection-settings-tab-close-button').click();

    // check if the app-level proxy is set to `system`
    await page.getByRole('button', { name: 'Open Preferences' }).click();
    await page.getByRole('tab', { name: 'Proxy' }).click();
    await expect(page.getByRole('radio', { name: 'System Proxy' })).toBeChecked();
    await page.locator('[data-test-id="modal-close-button"]').click();

    // check if the collection-level proxy is set to `off`
    await page.getByTitle('proxy-false').click();
    await page.getByRole('tab', { name: 'Proxy' }).click();
    await expect(page.getByRole('radio', { name: 'Off' })).toBeChecked();

    await page.getByText('test-request').click();

    // send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // wait for response
    await page.locator('[data-testid="response-status-code"]').waitFor({ state: 'visible', timeout: 2 * 60 * 1000 });

    await page.locator('[data-test-id="response-headers-tab"]').click();

    // check the response headers
    await expect(page.getByRole('cell', { name: 'X-Bruno-Proxy-System' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'X-Bruno-Proxy-App' })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'X-Bruno-Proxy-Collection' })).not.toBeVisible();

    process.env.http_proxy = '';
    process.env.https_proxy = '';
  });
});
