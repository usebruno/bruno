import { test, expect } from '../../playwright';
import { closeAllCollections, sendRequest } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe.serial('URL Interpolation', () => {
  test.afterAll(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Interpolate basic path params', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.collection('interpolation').click();
    await locators.sidebar.request('echo-request-url').click();
    await sendRequest(page, 200);

    const texts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
    await expect(texts.some((d) => d.includes(`"url": "/path/some-data"`))).toBe(true);
  });

  test('Interpolate oData path params', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);
    await locators.sidebar.request('echo-request-odata').click();
    await sendRequest(page, 200);

    const texts = await page.getByTestId('response-preview-container').locator('.CodeMirror-scroll').allInnerTexts();
    await expect(texts.some((d) => d.includes(`"url": "/path/Category('category123')/Item(item456)/foobar/Tags(%22tag%20test%22)"`))).toBe(true);
  });
});
