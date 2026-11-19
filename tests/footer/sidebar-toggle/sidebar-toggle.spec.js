import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  dragSidebarBy,
  dragSidebarTo,
  expandSidebar,
  getSidebarWidth,
  getStoredSidebarState,
  hoverSidebarHandle
} from '../../utils/page';

test.describe('Sidebar Toggle', () => {
  // The collapsed flag persists on the shared window, so always start and end expanded
  test.beforeEach(async ({ page }) => {
    await expandSidebar(page);
  });

  test.afterEach(async ({ page }) => {
    await expandSidebar(page);
  });

  test('should toggle sidebar visibility when clicking the toggle button', async ({ page }) => {
    const { sidebar } = buildCommonLocators(page);

    await test.step('Hide the sidebar; the drag handle stays so it can be reopened', async () => {
      await sidebar.toggleSidebarButton().click();
      await expect.poll(() => getSidebarWidth(page)).toBe(0);
      await expect(sidebar.dragHandle()).toHaveClass(/collapsed/);
    });

    await test.step('Show the sidebar again', async () => {
      await sidebar.toggleSidebarButton().click();
      await expect.poll(() => getSidebarWidth(page)).toBeGreaterThan(0);
      await expect(sidebar.dragHandle()).not.toHaveClass(/collapsed/);
    });
  });

  test('should collapse when dragged below the threshold and reopen when dragged back', async ({ page }) => {
    await test.step('Drag below the 150px collapse threshold', async () => {
      await dragSidebarTo(page, 60);

      await expect.poll(() => getSidebarWidth(page)).toBe(0);
      await expect.poll(() => getStoredSidebarState(page)).toBe('true');
    });

    await test.step('Drag the collapsed handle back out', async () => {
      await dragSidebarTo(page, 320);
      await expect.poll(() => getSidebarWidth(page)).toBeGreaterThan(0);
      await expect.poll(() => getStoredSidebarState(page)).toBe('false');
    });
  });

  test('should stay collapsed when the collapsed handle is dragged a short way', async ({ page }) => {
    const { sidebar } = buildCommonLocators(page);

    await sidebar.toggleSidebarButton().click();
    await expect.poll(() => getSidebarWidth(page)).toBe(0);
    // Moves more than the click tolerance, but stays under the 150px threshold
    await dragSidebarTo(page, 60);
    await expect.poll(() => getSidebarWidth(page)).toBe(0);
    await expect(sidebar.dragHandle()).toHaveClass(/collapsed/);
  });

  test('should reopen at the previous width when the collapsed handle is clicked, even with a small wiggle', async ({ page }) => {
    const widthBefore = await getSidebarWidth(page);

    await dragSidebarTo(page, 60);
    await expect.poll(() => getSidebarWidth(page)).toBe(0);
    await dragSidebarBy(page, 2);
    await expect.poll(() => getSidebarWidth(page)).toBe(widthBefore);
  });

  test('should show a tooltip when hovering the collapsed handle', async ({ page }) => {
    const { sidebar } = buildCommonLocators(page);
    await sidebar.toggleSidebarButton().click();
    await expect.poll(() => getSidebarWidth(page)).toBe(0);
    await hoverSidebarHandle(page);
    await expect(sidebar.dragHandleTooltip()).toContainText('Show sidebar');
  });
});
