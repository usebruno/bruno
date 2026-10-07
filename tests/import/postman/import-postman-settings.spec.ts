import { test, expect } from '../../../playwright';
import * as path from 'path';
import { closeAllCollections, importCollection } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { selectRequestPaneTab } from '../../utils/page/actions';

test.describe('Import Postman Collection with Settings', () => {
  let locators: ReturnType<typeof buildCommonLocators>;

  test.beforeEach(async ({ page }) => {
    locators = buildCommonLocators(page);
  });

  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('should import Postman collection settings successfully', async ({ page, createTmpDir }) => {
    const postmanFile = path.resolve(__dirname, 'fixtures', 'postman-with-settings.json');

    await importCollection(page, postmanFile, await createTmpDir('postman-settings-test'), {
      expectedCollectionName: 'Postman Collection with Settings'
    });

    await test.step('Open request and go to Settings tab', async () => {
      await expect(locators.sidebar.collection('Postman Collection with Settings')).toBeVisible();
      await locators.sidebar.collection('Postman Collection with Settings').click();
      await locators.sidebar.request('Request with Auth Forwarding').click();
      await selectRequestPaneTab(page, 'Settings');
    });

    await test.step('Assert settings toggles match Postman protocolProfileBehavior', async () => {
      // URL Encoding should be off
      await expect(locators.requestSettings.encodeUrlToggle()).toHaveAttribute('aria-checked', 'false');

      // Follow Redirects should be on
      await expect(locators.requestSettings.followRedirectsToggle()).toHaveAttribute('aria-checked', 'true');

      // Forward Auth Header should be on
      await expect(locators.requestSettings.forwardAuthToggle()).toHaveAttribute('aria-checked', 'true');

      // Max Redirects should be 10
      await expect(locators.requestSettings.maxRedirectsInput()).toHaveValue('10');
    });

    await test.step('Open request with disabled auth forwarding and assert toggle is off', async () => {
      await locators.sidebar.request('Disabled Auth Forwarding Request').click();
      await selectRequestPaneTab(page, 'Settings');

      // Wait for Settings pane to render (should still be on Settings tab)
      await expect(locators.requestSettings.forwardAuthToggle()).toHaveAttribute('aria-checked', 'false');
    });
  });
});
