import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { readSnapshot, waitForSnapshotFile } from '../utils/snapshot';

/**
 * Sidebar Persistence Tests
 *
 * Verifies that the sidebar collapsed state and width are:
 *   1. Written to `ui-state-snapshot.json` when changed.
 *   2. Restored from the snapshot on the next app launch (via async preloadedState).
 *
 * These tests avoid LCP comparisons entirely: they inspect the actual DOM geometry
 * (offsetWidth) and the snapshot file on disk, so they are deterministic regardless
 * of dev-server performance.
 */
test.describe('Snapshot: Sidebar Persistence', () => {
  // ─── Collapsed state ──────────────────────────────────────────────────────

  test('sidebar collapsed state persists across restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-collapsed');

    // ── Session 1: collapse the sidebar ──────────────────────────────────────
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    const toggleButton = page.getByTestId('toggle-sidebar-button');
    const sidebar = page.locator('aside.sidebar');

    await test.step('Sidebar is visible on first launch', async () => {
      await expect(sidebar).toBeVisible({ timeout: 10000 });
      const width = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
      expect(width).toBeGreaterThan(0);
    });

    await test.step('Collapse sidebar and wait for snapshot save', async () => {
      await toggleButton.click();
      // Sidebar should animate to width=0
      await expect.poll(async () => {
        const width = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
        return width;
      }, { timeout: 5000 }).toBe(0);

      // Wait for the debounced snapshot save (1 s debounce + buffer)
      await page.waitForTimeout(2000);
    });

    await test.step('Snapshot file records collapsed=true', async () => {
      await waitForSnapshotFile(userDataPath);
      const snapshot = readSnapshot(userDataPath);
      expect(snapshot?.extras?.sidebar?.collapsed).toBe(true);
    });

    await closeElectronApp(app);

    // ── Session 2: verify sidebar starts collapsed ────────────────────────────
    await test.step('Sidebar is collapsed on next launch', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const sidebar2 = page2.locator('aside.sidebar');
      // Give the async preloadedState a moment to take effect
      await page2.waitForTimeout(500);

      const width = await sidebar2.evaluate((el: HTMLElement) => el.offsetWidth);
      expect(width).toBe(0);

      await closeElectronApp(app2);
    });
  });

  // ─── Width ────────────────────────────────────────────────────────────────

  test('sidebar width persists across restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-width');
    const TARGET_WIDTH = 380;

    // ── Session 1: resize sidebar to TARGET_WIDTH ─────────────────────────────
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    const dragHandle = page.locator('.sidebar-drag-handle');
    const sidebar = page.locator('aside.sidebar');

    await test.step('Resize sidebar by dragging the drag handle', async () => {
      await expect(dragHandle).toBeVisible({ timeout: 10000 });

      // Drag from the handle's current position to TARGET_WIDTH px from the left edge
      const handleBox = await dragHandle.boundingBox();
      expect(handleBox).not.toBeNull();

      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(TARGET_WIDTH, handleBox!.y + handleBox!.height / 2, { steps: 20 });
      await page.mouse.up();

      // The sidebar should be close to TARGET_WIDTH (within 10px clamp tolerance)
      await expect.poll(async () => {
        const width = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(width - TARGET_WIDTH);
      }, { timeout: 5000 }).toBeLessThan(15);
    });

    await test.step('Wait for debounced snapshot save', async () => {
      await page.waitForTimeout(2000);
    });

    await test.step('Snapshot file records the new width', async () => {
      await waitForSnapshotFile(userDataPath);
      const snapshot = readSnapshot(userDataPath);
      expect(snapshot?.extras?.sidebar?.width).toBeDefined();
      expect(Math.abs(snapshot.extras.sidebar.width - TARGET_WIDTH)).toBeLessThan(15);
    });

    await closeElectronApp(app);

    // ── Session 2: verify sidebar starts at the saved width ───────────────────
    await test.step('Sidebar restores the saved width on next launch', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const sidebar2 = page2.locator('aside.sidebar');
      // Brief pause for React to finish painting with preloadedState values
      await page2.waitForTimeout(500);

      const restoredWidth = await sidebar2.evaluate((el: HTMLElement) => el.offsetWidth);
      expect(Math.abs(restoredWidth - TARGET_WIDTH)).toBeLessThan(15);

      await closeElectronApp(app2);
    });
  });

  // ─── Snapshot file structure ──────────────────────────────────────────────

  test('snapshot file always contains extras.sidebar with correct shape', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-schema');

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    // Allow the app to settle and write an initial snapshot
    await page.waitForTimeout(2000);
    await closeElectronApp(app);

    const snapshot = readSnapshot(userDataPath);
    expect(snapshot).not.toBeNull();
    expect(snapshot).toHaveProperty('extras.sidebar');
    expect(typeof snapshot.extras.sidebar.collapsed).toBe('boolean');
    expect(typeof snapshot.extras.sidebar.width).toBe('number');

    // Defaults on first run
    expect(snapshot.extras.sidebar.collapsed).toBe(false);
    expect(snapshot.extras.sidebar.width).toBe(250);
  });
});
