import { test, expect } from '../../../playwright';
import { createCollection, createEnvironment, closeAllCollections, pressSaveShortcut } from '../../utils/page';

test.describe('Environment Variables Focus Retention', () => {
  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('should keep focus on name input after save hotkey', async ({ page, createTmpDir }) => {
    await createCollection(page, 'env-focus', await createTmpDir('env-focus'));
    await createEnvironment(page, 'Focus Env', 'collection');

    const nameInput = page.locator('input[name="0.name"]');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.click();
    await page.keyboard.type('apiKey');
    await expect(nameInput).toBeFocused();

    // Draft sync is debounced (~300ms); Cmd/Ctrl+S no-ops until the draft exists.
    await expect(page.locator('.request-tab.active').getByTestId('tab-draft-icon')).toBeVisible({ timeout: 5000 });

    await pressSaveShortcut(page);
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible({ timeout: 15000 });

    // intentionally wait a few seconds because the focus is lost after a while
    await page.waitForTimeout(1000);
    await expect(nameInput).toBeFocused();
  });
});
