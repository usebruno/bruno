import { test, expect } from '../../../playwright';

test.describe('Redirect Authorization Stripping E2E Tests', () => {
  test('should strip Authorization and Proxy-Authorization on cross-origin redirects when setting is OFF', async ({
    pageWithUserData: page
  }) => {
    const collectionLocator = page.locator('#sidebar-collection-name').getByText('settings-test');

    await test.step('Arrange - Open collection and request', async () => {
      await expect(collectionLocator).toBeVisible();
      await collectionLocator.click();
      await page.getByRole('complementary').getByText('cross-origin-redirect-auth-strip').click();
    });

    await test.step('Act - Send request', async () => {
      await page.getByTestId('send-arrow-icon').click();
    });

    await test.step('Assert - Verify headers are stripped', async () => {
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      const responseTexts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
      const fullText = responseTexts.join('\n');
      expect(fullText).not.toContain('"authorization":');
      expect(fullText).not.toContain('"proxy-authorization":');
    });

    await test.step('Cleanup - Close tab', async () => {
      await page.locator('.close-icon-container').click({ force: true });
    });
  });

  test('should preserve Authorization and Proxy-Authorization on cross-origin redirects when setting is ON', async ({
    pageWithUserData: page
  }) => {
    const collectionLocator = page.locator('#sidebar-collection-name').getByText('settings-test');

    await test.step('Arrange - Open collection and request', async () => {
      await expect(collectionLocator).toBeVisible();
      await collectionLocator.click();
      await page.getByRole('complementary').getByText('cross-origin-redirect-auth-forward').click();
    });

    await test.step('Act - Send request', async () => {
      await page.getByTestId('send-arrow-icon').click();
    });

    await test.step('Assert - Verify headers are preserved', async () => {
      await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });
      const responseTexts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
      const fullText = responseTexts.join('\n');
      expect(fullText).toContain('"authorization": "Bearer token-test"');
      expect(fullText).toContain('"proxy-authorization": "Bearer proxy-test"');
    });

    await test.step('Cleanup - Close tab', async () => {
      await page.locator('.close-icon-container').click({ force: true });
    });
  });
});
