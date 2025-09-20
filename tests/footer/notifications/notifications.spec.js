import { test, expect } from '../../../playwright';

test.describe('Notifications Modal', () => {
  test('should open notifications modal when clicking bell icon and close with close button', async ({ page }) => {
    // Get the notification bell icon in the status bar
    const notificationBell = page.getByLabel('Check all Notifications');
    
    // Click on the bell icon to open notifications
    await notificationBell.click();
    
    // Get modal elements
    const notificationsModal = page.locator('.bruno-modal');
    const modalCloseButton = notificationsModal.locator('div.bruno-modal-header div.close');
    
    // Verify modal is visible and has the correct title
    await expect(notificationsModal).toBeVisible();
    await expect(notificationsModal.locator('.bruno-modal-header-title')).toContainText('NOTIFICATIONS');
    
    // Click the close button
    await modalCloseButton.click();
    
    // Verify modal is closed
    await expect(notificationsModal).not.toBeVisible();
  });
});