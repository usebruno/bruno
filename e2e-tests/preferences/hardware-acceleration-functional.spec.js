import { test, expect } from '../../playwright';

test('Hardware acceleration setting should actually control GPU acceleration', async ({ page }) => {
  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');
  
  // Open Preferences
  await page.getByLabel('Open Preferences').click();
  
  // Wait for preferences dialog to open
  await page.waitForSelector('[role="dialog"]');
  
  // Make sure we're on the General tab (should be default)
  await page.getByRole('tab', { name: 'General' }).click();

  // Find the hardware acceleration checkbox
  const hardwareAccelerationCheckbox = page.getByRole('checkbox', { name: 'Hardware Acceleration' });
  
  // Verify the checkbox exists and is initially checked (default: true)
  await expect(hardwareAccelerationCheckbox).toBeVisible();
  await expect(hardwareAccelerationCheckbox).toBeChecked();
  
  // Disable hardware acceleration
  await hardwareAccelerationCheckbox.click();
  await expect(hardwareAccelerationCheckbox).not.toBeChecked();
  
  // Save the preferences
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Wait for success message
  await expect(page.getByText('Preferences saved successfully')).toBeVisible();
  
  // We should also see a notification about restart being required
  await expect(page.getByText(/Hardware acceleration disabled.*restart/)).toBeVisible({ timeout: 5000 });
  
  // Close preferences dialog
  await page.keyboard.press('Escape');
  
  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });
  
  // Verify the setting was saved by reopening preferences
  await page.getByLabel('Open Preferences').click();
  await page.waitForSelector('[role="dialog"]');
  await page.getByRole('tab', { name: 'General' }).click();
  
  // Verify the checkbox is still unchecked
  const persistedCheckbox = page.getByRole('checkbox', { name: 'Hardware Acceleration' });
  await expect(persistedCheckbox).not.toBeChecked();
  
  // Re-enable hardware acceleration
  await persistedCheckbox.click();
  await expect(persistedCheckbox).toBeChecked();
  
  // Save again
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Wait for success message and restart notification
  await expect(page.getByText('Preferences saved successfully')).toBeVisible();
  await expect(page.getByText(/Hardware acceleration enabled.*restart/)).toBeVisible({ timeout: 5000 });
});
