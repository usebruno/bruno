import { test, expect } from '../../../../playwright';
import { buildCommonLocators, setSandboxMode } from '../../../utils/page';

test.describe.serial('collection proxy INHERIT with app proxy CONFIG - `proxy server OFF`', () => {
  test('developer mode - should fail when proxy server not running', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Configure developer mode
    await setSandboxMode(page, 'proxy-inherit', 'developer');

    // Open request and send
    await page.getByText('test-request').click();
    await locators.request.sendButton().click();

    // Expect proxy error
    await expect(page.getByText('ECONNREFUSED', { exact: false }))
      .toBeVisible({ timeout: 2 * 60 * 1000 });
  });

  test('safe mode - should fail when proxy server not running', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Configure safe mode
    await setSandboxMode(page, 'proxy-inherit', 'safe');

    // Open request and send
    await page.getByText('test-request').nth(1).click();
    await locators.request.sendButton().click();

    // Expect proxy error
    await expect(page.getByText('ECONNREFUSED', { exact: false }))
      .toBeVisible({ timeout: 2 * 60 * 1000 });
  });
});
