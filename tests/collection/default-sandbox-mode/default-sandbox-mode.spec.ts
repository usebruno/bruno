import { test, expect } from '../../../playwright';
import { createCollection, openCollection } from '../../utils/page/actions';

test.describe('Default JavaScript Sandbox Mode', () => {
  test('should set jsSandboxMode to safe by default when creating a new collection', async ({ page, createTmpDir }) => {
    const collectionName = 'test-sandbox-collection';

    await createCollection(page, collectionName, await createTmpDir());

    // Verify sandbox mode is set to safe by default
    const sandboxModeSelector = page.getByTestId('sandbox-mode-selector');
    await expect(sandboxModeSelector).toBeVisible();
    await expect(sandboxModeSelector).toHaveAttribute('title', 'Safe Mode');

    // Click on sandbox mode selector to open security settings
    await sandboxModeSelector.click();

    // Change to developer mode
    const developerRadio = page.locator('input[id="developer"]');
    await developerRadio.click();

    // Save
    const saveButton = page.getByRole('button', { name: 'Save' });
    await saveButton.click();

    // Verify mode changed to developer
    await expect(sandboxModeSelector).toHaveAttribute('title', 'Developer Mode');

    // Close all tabs
    await page.keyboard.press('Meta+Shift+W');

    // Reopen the collection
    await openCollection(page, collectionName);

    // Verify mode is still developer (persisted)
    await expect(sandboxModeSelector).toHaveAttribute('title', 'Developer Mode');
  });
});
