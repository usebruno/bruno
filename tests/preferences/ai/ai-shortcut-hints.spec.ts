import { test, expect } from '../../../playwright';

const expectedModifier = process.platform === 'darwin' ? '⌘' : 'Ctrl';

test.describe('AI shortcut hints', () => {
  test('autocomplete keymap shows the platform-correct modifier', async ({ pageWithUserData: page }) => {
    await page.locator('[data-app-state="loaded"]').waitFor();

    await page.locator('.status-bar button[data-trigger="preferences"]').click();
    await page.getByRole('tab', { name: 'AI', exact: true }).click();
    await page.getByTestId('ai-tab-autocomplete').click();

    const keymap = page.locator('.autocomplete-keymap');
    await expect(keymap).toBeVisible();
    await expect(keymap.getByText(expectedModifier, { exact: true })).toBeVisible();
  });
});
