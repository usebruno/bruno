import { test, expect } from '../../../playwright';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Redirect Authorization Stripping E2E Tests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeEach(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test('should strip Authorization and Proxy-Authorization on cross-origin redirects when setting is OFF', async ({
    pageWithUserData: page
  }) => {
    await test.step('Arrange - Open collection and request', async () => {
      await expect(locators.sidebar.collection('settings-test')).toBeVisible();
      await locators.sidebar.collection('settings-test').click();
      await locators.sidebar.request('cross-origin-redirect-auth-strip').click();
    });

    await test.step('Act - Send request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Assert - Verify headers are stripped', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
      const responseTexts = await locators.response.previewContainer().locator('.CodeMirror-scroll').allInnerTexts();
      const fullText = responseTexts.join('\n');
      expect(fullText).not.toContain('"authorization":');
      expect(fullText).not.toContain('"proxy-authorization":');
    });

    await test.step('Cleanup - Close tab', async () => {
      await locators.tabs.closeTab('cross-origin-redirect-auth-strip').click({ force: true });
    });
  });

  test('should preserve Authorization and Proxy-Authorization on cross-origin redirects when setting is ON', async ({
    pageWithUserData: page
  }) => {
    await test.step('Arrange - Open collection and request', async () => {
      await expect(locators.sidebar.collection('settings-test')).toBeVisible();
      await locators.sidebar.collection('settings-test').click();
      await locators.sidebar.request('cross-origin-redirect-auth-forward').click();
    });

    await test.step('Act - Send request', async () => {
      await locators.request.sendButton().click();
    });

    await test.step('Assert - Verify headers are preserved', async () => {
      await expect(locators.response.statusCode()).toContainText('200', { timeout: 15000 });
      const responseTexts = await locators.response.previewContainer().locator('.CodeMirror-scroll').allInnerTexts();
      const fullText = responseTexts.join('\n');
      expect(fullText).toContain('"authorization": "Bearer token-test"');
      expect(fullText).toContain('"proxy-authorization": "Bearer proxy-test"');
    });

    await test.step('Cleanup - Close tab', async () => {
      await locators.tabs.closeTab('cross-origin-redirect-auth-forward').click({ force: true });
    });
  });
});
