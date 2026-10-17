import path from 'path';
import { expect, test } from '../../../playwright';
import {
  buildCommonLocators,
  selectRequestPaneTab
} from '../../utils/page';

test.use({
  collectionFixturePath: path.join(__dirname, 'fixtures', 'collections')
});

test.describe('Encode URL Setting Tests', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeEach(async ({ pageWithUserData: page }) => {
    locators = buildCommonLocators(page);
  });

  test('should reflect encodeUrl true when the key is available', async ({ pageWithUserData: page }) => {
    await expect(locators.sidebar.collection('encode-url-test')).toBeVisible();
    await locators.sidebar.collection('encode-url-test').click();
    await locators.sidebar.request('encode-url-true').click();
    await selectRequestPaneTab(page, 'Settings');

    // Expected: Encode URL toggle should be checked because encodeUrl: true is in the bru file
    const encodeUrlToggle = locators.requestSettings.encodeUrlToggle();
    await expect(encodeUrlToggle).toHaveAttribute('aria-checked', 'true');
  });

  test('should reflect encodeUrl false when the key is not present', async ({ pageWithUserData: page }) => {
    await expect(locators.sidebar.collection('encode-url-test')).toBeVisible();
    await locators.sidebar.collection('encode-url-test').click();
    await locators.sidebar.request('encode-url-missing').click();
    await selectRequestPaneTab(page, 'Settings');

    // Expected: Encode URL toggle should be unchecked because encodeUrl is missing from the bru file, defaulting to false in UI
    const encodeUrlToggle = locators.requestSettings.encodeUrlToggle();
    await expect(encodeUrlToggle).toHaveAttribute('aria-checked', 'false');
  });

  test('should reflect encodeUrl false when the key is explicitly false', async ({ pageWithUserData: page }) => {
    await expect(locators.sidebar.collection('encode-url-test')).toBeVisible();
    await locators.sidebar.collection('encode-url-test').click();
    await locators.sidebar.request('encode-url-false').click();
    await selectRequestPaneTab(page, 'Settings');

    // Expected: Encode URL toggle should be unchecked because encodeUrl is false in the bru file
    const encodeUrlToggle = locators.requestSettings.encodeUrlToggle();
    await expect(encodeUrlToggle).toHaveAttribute('aria-checked', 'false');
  });
});
