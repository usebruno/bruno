import { test, expect } from '../../../playwright';

test.describe('Sidebar Toggle', () => {
  test('should toggle sidebar visibility when clicking the toggle button', async ({ page }) => {
    // Get the sidebar and toggle button elements
    const sidebar = page.locator('aside.sidebar');
    const toggleButton = page.getByLabel('Toggle Sidebar');
    const dragHandle = page.locator('.sidebar-drag-handle');
    
    // Initial state - sidebar and drag handle should be visible
    await expect(sidebar).toBeVisible();
    await expect(dragHandle).toBeVisible();
    
    // Click toggle to hide sidebar
    await toggleButton.click();
    
    // Wait for transition to complete and verify sidebar and drag handle are hidden
    await expect(sidebar).not.toBeVisible();
    await expect(dragHandle).not.toBeVisible();

    // Verify the sidebar has collapsed width
    const sidebarBox = await sidebar.boundingBox();
    expect(sidebarBox?.width).toBe(0);
    
    // Click toggle again to show sidebar
    await toggleButton.click();
    
    // Wait for transition and verify sidebar and drag handle are visible again
    await expect(sidebar).toBeVisible();
    await expect(dragHandle).toBeVisible();

    // Verify the sidebar has expanded width
    const expandedSidebarBox = await sidebar.boundingBox();
    expect(expandedSidebarBox?.width).toBeGreaterThan(0);
  });
});