import { test, expect } from '../../playwright';
import {
  closeAllCollections,
  createCollection,
  createRequest,
  openRequest,
  readField,
  saveRequest,
  selectAuthMode,
  selectRequestPaneTab,
  typeIntoField
} from '../utils/page';

type CollectionFormat = 'bru' | 'yml';

const runDraftIndicatorScenario = (format: CollectionFormat) => {
  test(`(${format}) switching back to the saved auth mode hides the draft indicator`, async ({ page, createTmpDir }) => {
    const collectionName = `auth-draft-indicator-${format}`;
    const requestName = `request-${format}`;

    await createCollection(page, collectionName, await createTmpDir(), format);
    await createRequest(page, requestName, collectionName, { url: 'https://example.com/api' });
    await openRequest(page, collectionName, requestName);
    await selectRequestPaneTab(page, 'Auth');

    const requestTab = page
      .locator('.request-tab')
      .filter({ has: page.locator('.tab-label', { hasText: requestName }) });

    await test.step('Save Bearer with a token — draft indicator clears', async () => {
      await selectAuthMode(page, 'Bearer Token');
      await typeIntoField(page, 'Token', 'saved-bearer-token');
      await saveRequest(page);

      await expect(requestTab.locator('.close-icon')).toBeVisible();
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });

    await test.step('Switching to Basic Auth without saving shows the draft indicator', async () => {
      await selectAuthMode(page, 'Basic Auth');

      await expect(requestTab.locator('.has-changes-icon')).toBeVisible();
      await expect(requestTab.locator('.close-icon')).not.toBeVisible();
    });

    await test.step('Switching back to the saved Bearer mode without saving hides the draft indicator', async () => {
      await selectAuthMode(page, 'Bearer Token');

      // Saved token is restored
      await expect.poll(() => readField(page, 'Token')).toBe('saved-bearer-token');

      // Draft now deep-equals the saved state — indicator must be gone
      await expect(requestTab.locator('.close-icon')).toBeVisible();
      await expect(requestTab.locator('.has-changes-icon')).not.toBeVisible();
    });
  });
};

test.describe('Auth mode switch — draft indicator clears on return to saved mode', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  runDraftIndicatorScenario('bru');
  runDraftIndicatorScenario('yml');
});
