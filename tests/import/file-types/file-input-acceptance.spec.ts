import { test, expect } from '../../../playwright';

test.describe('File Input Acceptance', () => {
  test('File input accepts expected file types', async ({ page }) => {
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Import collection' }).click();

    // Check that file input exists (even if hidden)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Verify it accepts the expected file types
    const acceptValue = await fileInput.getAttribute('accept');
    expect(acceptValue).toContain('.json');
    expect(acceptValue).toContain('.yaml');
    expect(acceptValue).toContain('.yml');

    // Cleanup: close any open modals
    await page.getByTestId('modal-close-button').click();
  });
});
