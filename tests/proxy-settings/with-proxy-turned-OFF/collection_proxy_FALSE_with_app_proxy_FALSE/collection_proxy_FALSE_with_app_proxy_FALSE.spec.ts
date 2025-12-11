import { test, expect } from '../../../../playwright';
import { buildCommonLocators, setSandboxMode } from '../../../utils/page';

test.describe.serial('collection proxy FALSE with app proxy FALSE - `proxy server OFF`', () => {
  test('developer mode - should succeed when proxy server not running', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Configure developer mode
    await setSandboxMode(page, 'proxy-false', 'developer');

    // Open request and send
    await page.getByText('test-request').click();
    await locators.request.sendButton().click();

    // Collection proxy FALSE ignores app proxy FALSE - should succeed (no proxy used)
    await locators.response.statusCode().waitFor({ state: 'visible' });
    await expect(locators.response.statusCode()).toHaveText(/200/);
  });

  test('safe mode - should succeed when proxy server not running', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Configure safe mode
    await setSandboxMode(page, 'proxy-false', 'safe');

    // Open request and send
    await page.getByText('test-request').nth(1).click();
    await locators.request.sendButton().click();

    // Collection proxy FALSE ignores app proxy FALSE - should succeed (no proxy used)
    await locators.response.statusCode().waitFor({ state: 'visible' });
    await expect(locators.response.statusCode()).toHaveText(/200/);
  });
});
