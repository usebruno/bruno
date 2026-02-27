import { test, expect } from '../../../playwright';
import { createCollection, createEnvironment, closeAllCollections } from '../../utils/page';

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

    await page.keyboard.press('Control+s');
    await expect(page.getByText('Changes saved successfully').last()).toBeVisible({ timeout: 5000 });

    // intentionally wait a few seconds because the focus is lost after a while
    await page.waitForTimeout(1000);
    await expect(nameInput).toBeFocused();
  });
});
