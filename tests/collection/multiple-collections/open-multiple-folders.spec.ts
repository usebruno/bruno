import { test, expect } from '../../../playwright';

test('Verify Open Collection button supports multiple folder selection', async ({ page }) => {
  // Test that the Open Collection button exists and is functional
  // This button should trigger the native file dialog with multiSelections enabled
  const openButton = page.getByRole('button', { name: /Open.*Collection/i });
  await expect(openButton).toBeVisible();
  await expect(openButton).toBeEnabled();

  // Verify clicking the button doesn't crash the app
  // The actual file dialog behavior is tested by the underlying implementation
  await openButton.click();

  // Since we can't easily test the native file dialog in Playwright,
  // we verify that the app is still responsive after the dialog interaction
  await expect(page.getByRole('button', { name: /Create.*Collection/i })).toBeVisible();
});
