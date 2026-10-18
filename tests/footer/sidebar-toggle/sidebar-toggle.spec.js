import { test, expect } from '../../../playwright';

test.describe('Sidebar Toggle', () => {
  test('should toggle sidebar visibility when clicking the toggle button', async ({ page }) => {
    // Get the sidebar and toggle button elements
    const sidebar = page.locator('aside.sidebar');
    const toggleButton = page.getByTestId('toggle-sidebar-button');
    const dragHandle = page.locator('.sidebar-drag-handle');

    // Initial state - sidebar and drag handle should be visible
    await expect(sidebar).toBeVisible();
    await expect(dragHandle).toBeVisible();

    // Click toggle to hide sidebar
    await toggleButton.click();

    // Wait for transition to complete and verify sidebar and drag handle are hidden
    await expect(sidebar).not.toBeVisible();
    // The drag handle stays at the left edge so the sidebar, can be reopened by dragging/clicking it
    await expect(dragHandle).toHaveClass(/collapsed/);

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

  test('should collapse when dragged below the threshold and reopen when dragged back', async ({ page }) => {
    const sidebar = page.locator('aside.sidebar');
    const dragHandle = page.getByTestId('sidebar-drag-handle');

    const handleBox = await dragHandle.boundingBox();
    const y = handleBox.y + handleBox.height / 2;

    await test.step('Drag well below the 150px collapse threshold', async () => {
      await page.mouse.move(handleBox.x + 1, y);
      await page.mouse.down();
      await page.mouse.move(60, y, { steps: 5 });
      await page.mouse.up();

      await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(0);
      await expect(dragHandle).toHaveClass(/collapsed/);
    });

    await test.step('Drag the collapsed handle back out to reopen', async () => {
      const collapsedBox = await dragHandle.boundingBox();
      await page.mouse.move(collapsedBox.x + 1, y);
      await page.mouse.down();
      await page.mouse.move(320, y, { steps: 5 });
      await page.mouse.up();

      await expect.poll(async () => (await sidebar.boundingBox())?.width).toBeGreaterThan(0);
      await expect(dragHandle).not.toHaveClass(/collapsed/);
    });
  });

  test('should reopen when the collapsed handle is clicked and show a tooltip only while collapsed', async ({ page }) => {
    const sidebar = page.locator('aside.sidebar');
    const dragHandle = page.getByTestId('sidebar-drag-handle');
    const tooltip = page.getByTestId('sidebar-drag-handle-tooltip-title');

    await test.step('Collapse the sidebar', async () => {
      await page.getByTestId('toggle-sidebar-button').click();
      await expect.poll(async () => (await sidebar.boundingBox())?.width).toBe(0);
    });

    await test.step('Hovering the collapsed handle shows the tooltip', async () => {
      await dragHandle.hover();
      await expect(tooltip).toContainText('Show sidebar');
    });

    await test.step('Clicking the collapsed handle reopens the sidebar', async () => {
      await dragHandle.click({ position: { x: 1, y: 10 } });
      await expect.poll(async () => (await sidebar.boundingBox())?.width).toBeGreaterThan(0);
    });

    await test.step('No tooltip while the sidebar is open', async () => {
      // The main pane overlaps the open handle's right side, so hover its left edge
      await dragHandle.hover({ position: { x: 1, y: 10 } });
      await expect(tooltip).toHaveCount(0);
    });
  });
});
