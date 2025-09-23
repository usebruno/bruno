import { test, expect } from '../../playwright';

test.describe.serial('URL Interpolation', () => {
  test.setTimeout(2 * 10 * 1000);

  test('Interpolate basic path params', async ({ pageWithUserData: page }) => {
    await page.locator('#sidebar-collection-name').click();
    await page.getByRole('complementary').getByText('echo-request-url').click();
    await page.getByTestId('send-arrow-icon').click();

    expect(page.getByTestId('response-status-code')).toHaveText(/200/);

    const texts = await page.locator('div:nth-child(2) > .CodeMirror-scroll').allInnerTexts();
    expect(texts.some(d => d.includes(`"url": "/path/some-data"`))).toBe(true);
  });

  test('Interpolate oData path params', async ({ pageWithUserData: page }) => {
    await page.getByRole('complementary').getByText('echo-request-odata').click();
    await page.getByTestId('send-arrow-icon').click();

    expect(page.getByTestId('response-status-code')).toHaveText(/200/);

    const texts = await page.locator('div:nth-child(2) > .CodeMirror-scroll').allInnerTexts();
    expect(texts.some(d => d.includes(`"url": "/path/Category('category123')/Item(item456)/foobar/Tags(%22tag%20test%22)"`))).toBe(true);
  });
});
