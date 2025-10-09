import { test, expect } from '../../playwright';
import { closeAllCollections } from '../utils/page';

test.describe.serial('URL Interpolation', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    // cleanup: close all collections
    await closeAllCollections(page);
  });

  test('Interpolate basic path params', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByRole('complementary').getByText('echo-request-url').click();
    await page.getByTestId('send-arrow-icon').click();

    await expect(page.getByTestId('response-status-code')).toHaveText(/200/);

    const texts = await page.locator('div:nth-child(2) > .CodeMirror-scroll').allInnerTexts();
    await expect(texts.some((d) => d.includes(`"url": "/path/some-data"`))).toBe(true);
  });

  test('Interpolate oData path params', async ({ pageWithUserData: page }) => {
    await page.getByRole('complementary').getByText('echo-request-odata').click();
    await page.getByTestId('send-arrow-icon').click();

    await expect(page.getByTestId('response-status-code')).toHaveText(/200/);

    const texts = await page.locator('div:nth-child(2) > .CodeMirror-scroll').allInnerTexts();
    await expect(texts.some((d) => d.includes(`"url": "/path/Category('category123')/Item(item456)/foobar/Tags(%22tag%20test%22)"`))).toBe(true);
  });
});
