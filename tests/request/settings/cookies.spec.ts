import { test, expect } from '../../../playwright';
import { selectRequestPaneTab } from '../../utils/page';

test.describe('Per-request Cookie Settings Tests', () => {
  test('controls automatic cookie storage and sending independently', async ({
    pageWithUserData: page
  }) => {
    await expect(page.locator('#sidebar-collection-name').getByText('settings-test')).toBeVisible();
    await page.locator('#sidebar-collection-name').getByText('settings-test').click();

    await page.getByRole('complementary').getByText('cookie-login').click();
    await selectRequestPaneTab(page, 'Settings');

    const storeCookiesToggle = page.getByTestId('store-cookies-toggle');
    await expect(storeCookiesToggle).toBeVisible();
    await expect(storeCookiesToggle).not.toBeChecked();

    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('200');

    await page.getByRole('complementary').getByText('cookie-protected').click();
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('401');

    await page.getByRole('complementary').getByText('cookie-login').click();
    await selectRequestPaneTab(page, 'Settings');
    await storeCookiesToggle.click();
    await expect(storeCookiesToggle).toBeChecked();
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('200');

    await page.getByRole('complementary').getByText('cookie-protected').click();
    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('200');

    await selectRequestPaneTab(page, 'Settings');
    const sendCookiesToggle = page.getByTestId('send-cookies-toggle');
    await expect(sendCookiesToggle).toBeChecked();
    await sendCookiesToggle.click();
    await expect(sendCookiesToggle).not.toBeChecked();

    await page.getByTestId('send-arrow-icon').click();
    await expect(page.getByTestId('response-status-code')).toContainText('401');
  });
});
