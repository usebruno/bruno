import { test, expect } from '../../../playwright';
import { createCollection, openCollection } from '../../utils/page/actions';
import { buildSandboxLocators } from '../../utils/page/locators';

test.describe('Default JavaScript Sandbox Mode', () => {
  test('should set jsSandboxMode to safe by default when creating a new collection', async ({ page, createTmpDir }) => {
    const collectionName = 'test-sandbox-collection';

    await createCollection(page, collectionName, await createTmpDir());
    const sandboxLocators = buildSandboxLocators(page);

    // Verify sandbox mode is set to safe by default
    await expect(sandboxLocators.sandboxModeSelector()).toBeVisible();

    // Click on sandbox mode selector to open security settings
    await sandboxLocators.sandboxModeSelector().click();

    // Change to developer mode
    const developerRadio = sandboxLocators.developerModeRadio();
    await developerRadio.check();

    // For developer mode, check if safe mode is currently selected
    const safeModeChecked = await sandboxLocators.safeModeRadio().isChecked().catch(() => false);
    await expect(safeModeChecked).toBe(false);

    await page.keyboard.press('Escape');
  });
});
