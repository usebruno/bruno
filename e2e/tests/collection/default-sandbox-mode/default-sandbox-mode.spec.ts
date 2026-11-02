import { test, expect } from '@e2e/test';
import { createCollection, openCollection } from '@e2e/pages';
import { buildSandboxLocators } from '@e2e/pages';

test.describe('Default JavaScript Sandbox Mode', () => {
  test('should set jsSandboxMode to safe by default when creating a new collection', async ({ page, createTmpDir }) => {
    const collectionName = 'test-sandbox-collection';

    await createCollection(page, collectionName, await createTmpDir());
    const sandboxLocators = buildSandboxLocators(page);

    // Verify sandbox mode is set to safe by default
    await expect(sandboxLocators.sandboxModeSelector()).toBeVisible();

    // Click on sandbox mode selector to open security settings
    await sandboxLocators.sandboxModeSelector().click();

    // Safe mode should be selected by default
    await expect(sandboxLocators.safeModeRadio()).toHaveAttribute('aria-checked', 'true');

    // Change to developer mode. The option is a menuitemradio whose checked
    // state flips only after the async save dispatch resolves
    const developerRadio = sandboxLocators.developerModeRadio();
    await developerRadio.click();
    await expect(developerRadio).toHaveAttribute('aria-checked', 'true');

    // Safe mode should no longer be selected
    await expect(sandboxLocators.safeModeRadio()).toHaveAttribute('aria-checked', 'false');

    await page.keyboard.press('Escape');
  });
});
