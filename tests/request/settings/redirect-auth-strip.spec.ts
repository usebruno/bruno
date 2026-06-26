import { test, expect } from '../../../playwright';

test.describe('Redirect Authorization Stripping E2E Tests', () => {
  test('should strip Authorization and Proxy-Authorization on cross-origin redirects when setting is OFF', async ({
    pageWithUserData: page
  }) => {
    // Open collection
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('settings-test').click();

    // Open request
    await page.getByRole('complementary').getByText('cross-origin-redirect-auth-strip').click();

    // Send request
    await page.getByTestId('send-arrow-icon').click();

    // Verify status code
    await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

    // Verify headers are stripped
    const responseTexts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
    const fullText = responseTexts.join('\n');
    expect(fullText).not.toContain('"authorization":');
    expect(fullText).not.toContain('"proxy-authorization":');

    // Close tab
    await page.locator('.close-icon-container').click({ force: true });
  });

  test('should preserve Authorization and Proxy-Authorization on cross-origin redirects when setting is ON', async ({
    pageWithUserData: page
  }) => {
    // Open collection
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('settings-test').click();

    // Open request
    await page.getByRole('complementary').getByText('cross-origin-redirect-auth-forward').click();

    // Send request
    await page.getByTestId('send-arrow-icon').click();

    // Verify status code
    await expect(page.getByTestId('response-status-code')).toContainText('200', { timeout: 15000 });

    // Verify headers are preserved
    const responseTexts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
    const fullText = responseTexts.join('\n');
    expect(fullText).toContain('"authorization": "Bearer token-test"');
    expect(fullText).toContain('"proxy-authorization": "Bearer proxy-test"');

    // Close tab
    await page.locator('.close-icon-container').click({ force: true });
  });
});
