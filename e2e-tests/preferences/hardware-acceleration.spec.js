import { test, expect } from '../../playwright';

test('Should be able to toggle hardware acceleration in preferences', async ({ page }) => {
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
  
  // Verify the checkbox exists
  await expect(hardwareAccelerationCheckbox).toBeVisible();
  
  // Get initial state
  const initialState = await hardwareAccelerationCheckbox.isChecked();
  
  // Toggle the checkbox
  await hardwareAccelerationCheckbox.click();
  
  // Verify the state changed
  const newState = await hardwareAccelerationCheckbox.isChecked();
  expect(newState).toBe(!initialState);
  
  // Save the preferences
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Wait for success message
  await expect(page.getByText('Preferences saved successfully')).toBeVisible();
  
  // Close preferences dialog
  await page.keyboard.press('Escape');
  
  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });
  
  // Re-open preferences to verify the setting persisted
  await page.getByLabel('Open Preferences').click();
  await page.waitForSelector('[role="dialog"]');
  await page.getByRole('tab', { name: 'General' }).click();
  
  // Verify the checkbox maintained its new state
  const persistedState = await page.getByRole('checkbox', { name: 'Hardware Acceleration' }).isChecked();
  expect(persistedState).toBe(newState);
});

test('Should have hardware acceleration enabled by default', async ({ page }) => {
  // Wait for the page to load completely
  await page.waitForLoadState('networkidle');
  
  // Open Preferences
  await page.getByLabel('Open Preferences').click();
  
  // Wait for preferences dialog to open
  await page.waitForSelector('[role="dialog"]');
  
  // Make sure we're on the General tab
  await page.getByRole('tab', { name: 'General' }).click();
  
  // Find the hardware acceleration checkbox
  const hardwareAccelerationCheckbox = page.getByRole('checkbox', { name: 'Hardware Acceleration' });
  
  // Verify the checkbox is checked by default (since we default to true)
  await expect(hardwareAccelerationCheckbox).toBeChecked();
});
