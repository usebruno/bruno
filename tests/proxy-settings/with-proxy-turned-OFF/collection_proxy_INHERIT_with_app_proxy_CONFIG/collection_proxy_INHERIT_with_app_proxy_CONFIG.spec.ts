import { test, expect } from '../../../../playwright';

test.describe.serial('collection proxy INHERIT with app proxy CONFIG - `proxy server OFF`', () => {
  test('developer mode - should fail when proxy server not running', async ({ pageWithUserData: page }) => {
    // init dev mode
    await page.getByText('proxy-inherit').click();
    await page.getByLabel('Developer Mode(use only if').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // close collection settings tab
    await page.getByTestId('collection-settings-tab-close-button').click();

    await page.getByText('test-request').click();

    // send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // check that request failed (proxy not available)
    await expect(page.getByText('ECONNREFUSED', { exact: false })).toBeVisible({ timeout: 2 * 60 * 1000 });
  });

  test('safe mode - should fail when proxy server not running', async ({ pageWithUserData: page }) => {
    // init safe mode
    await page.getByText('Developer Mode').click();
    await page.getByLabel('Safe Mode').check();
    await page.getByRole('button', { name: 'Save' }).click();

    // close security settings tab
    await page.getByTestId('security-settings-tab-close-button').click();

    await page.getByText('test-request').nth(1).click();

    // send the request
    await page.locator('#send-request').getByRole('img').nth(2).click();

    // check that request failed (proxy not available)
    await expect(page.getByText('ECONNREFUSED', { exact: false })).toBeVisible({ timeout: 2 * 60 * 1000 });
  });
});
