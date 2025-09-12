import { test, expect } from '../../playwright';

test('Hardware acceleration preference should toggle correctly with restart notifications', async ({ page }) => {
  // Wait for the page to load completely
  await page.waitForLoadState('domcontentloaded');
  
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
  
  // Get initial state (should be true by default, but handle dynamically)
  const initialState = await hardwareAccelerationCheckbox.isChecked();
  
  // Toggle the checkbox to opposite state
  await hardwareAccelerationCheckbox.click();
  
  // Verify the state changed
  const newState = await hardwareAccelerationCheckbox.isChecked();
  expect(newState).toBe(!initialState);
  
  // Save the preferences
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Wait for success message (use first() to avoid strict mode violation)
  await expect(page.getByText('Preferences saved successfully').first()).toBeVisible();
  
  // Check for restart notification (should appear when hardware acceleration changes)
  const restartPattern = newState 
    ? /Hardware acceleration enabled.*restart/
    : /Hardware acceleration disabled.*restart/;
  await expect(page.getByText(restartPattern).first()).toBeVisible({ timeout: 5000 });
  
  // Close preferences dialog
  await page.keyboard.press('Escape');
  
  // Wait for dialog to close
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });
  
  // Verify the setting persisted by reopening preferences
  await page.getByLabel('Open Preferences').click();
  await page.waitForSelector('[role="dialog"]');
  await page.getByRole('tab', { name: 'General' }).click();
  
  // Verify the checkbox maintained its new state
  const persistedCheckbox = page.getByRole('checkbox', { name: 'Hardware Acceleration' });
  const persistedState = await persistedCheckbox.isChecked();
  expect(persistedState).toBe(newState);
  
  // Test toggling back to original state
  await persistedCheckbox.click();
  await expect(persistedCheckbox).toHaveValue(initialState ? 'on' : 'off');
  
  // Save again
  await page.getByRole('button', { name: 'Save' }).click();
  
  // Wait for success message and restart notification
  await expect(page.getByText('Preferences saved successfully').first()).toBeVisible();
  const backRestartPattern = initialState 
    ? /Hardware acceleration enabled.*restart/
    : /Hardware acceleration disabled.*restart/;
  await expect(page.getByText(backRestartPattern).first()).toBeVisible({ timeout: 5000 });
  
  // Close preferences dialog to clean up
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { state: 'detached' });
});
