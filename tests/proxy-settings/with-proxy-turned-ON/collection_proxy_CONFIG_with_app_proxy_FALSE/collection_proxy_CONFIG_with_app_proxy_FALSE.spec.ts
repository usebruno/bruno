import { test, expect } from '../../../../playwright';
import { buildCommonLocators, setSandboxMode } from '../../../utils/page';

// Declare global proxy server reference to share across test files
declare global {
  var globalProxyServer: any;
}

test.describe.serial('collection proxy CONFIG with app proxy FALSE - `proxy server ON`', () => {
  test('developer mode - should succeed when proxy server is running', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Configure developer mode
    await setSandboxMode(page, 'proxy-object', 'developer');

    // Open request and send
    await page.getByText('test-request').click();
    await locators.request.sendButton().click();

    // Collection proxy CONFIG uses proxy - should succeed (proxy working)
    await locators.response.statusCode().waitFor({ state: 'visible' });
    await expect(locators.response.statusCode()).toHaveText(/200/);
  });

  test('safe mode - should succeed when proxy server is running', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Configure safe mode
    await setSandboxMode(page, 'proxy-object', 'safe');

    // Open request and send
    await page.getByText('test-request').nth(1).click();
    await locators.request.sendButton().click();

    // Collection proxy CONFIG uses proxy - should succeed (proxy working)
    await locators.response.statusCode().waitFor({ state: 'visible' });
    await expect(locators.response.statusCode()).toHaveText(/200/);
  });
});
