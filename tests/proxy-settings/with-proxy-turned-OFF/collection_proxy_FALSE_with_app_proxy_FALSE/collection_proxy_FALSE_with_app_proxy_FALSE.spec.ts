import { test, expect } from '../../../../playwright';

test.describe.serial('collection proxy FALSE with app proxy FALSE - `proxy server OFF`', () => {
  test('developer mode - should succeed when proxy server not running', async ({ pageWithUserData: page }) => {
    // init dev mode
    await page.getByText('proxy-false').click();
    await page.getByLabel('Developer Mode(use only if').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // close collection settings tab
    await page.getByTestId('collection-settings-tab-close-button').click();

    await page.getByText('test-request').click();

    // send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // Collection proxy FALSE ignores app proxy FALSE - should succeed (no proxy used)
    await page.getByTestId('response-status-code').waitFor({ state: 'visible' });
    await expect(page.getByTestId('response-status-code')).toHaveText(/200/);
  });

  test('safe mode - should succeed when proxy server not running', async ({ pageWithUserData: page }) => {
    // init safe mode
    await page.getByText('Developer Mode').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // close security settings tab
    await page.getByTestId('security-settings-tab-close-button').click();

    await page.getByText('test-request').nth(1).click();

    // send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // Collection proxy FALSE ignores app proxy FALSE - should succeed (no proxy used)
    await page.getByTestId('response-status-code').waitFor({ state: 'visible' });
    await expect(page.getByTestId('response-status-code')).toHaveText(/200/);
  });
});
