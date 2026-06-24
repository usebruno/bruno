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
    const sidebar = page.getByTestId('sidebar');

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

      // Poll snapshot until collapsed=true is recorded
      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.collapsed;
      }).toBe(true);
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

      const sidebar2 = page2.getByTestId('sidebar');
      // Wait for layout/hydration to complete and verify collapsed width = 0
      await expect.poll(async () => {
        return await sidebar2.evaluate((el: HTMLElement) => el.offsetWidth);
      }).toBe(0);

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

    const dragHandle = page.getByTestId('sidebar-drag-handle');
    const sidebar = page.getByTestId('sidebar');

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
      // Poll snapshot until new width is written
      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.width !== undefined && Math.abs(snapshot.extras.sidebar.width - TARGET_WIDTH) < 15;
      }).toBe(true);
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

      const sidebar2 = page2.getByTestId('sidebar');
      // Wait for layout/hydration to apply the saved width
      await expect.poll(async () => {
        const restoredWidth = await sidebar2.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(restoredWidth - TARGET_WIDTH) < 15;
      }).toBe(true);

      await closeElectronApp(app2);
    });
  });

  // ─── Snapshot file structure ──────────────────────────────────────────────

  test('snapshot file extras.sidebar is optional in existing snapshots, and populated with defaults on first launch', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-schema');

    // Launch & close without changes (first launch)
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    // Wait for initial snapshot write
    await expect.poll(() => {
      const snapshot = readSnapshot(userDataPath);
      return snapshot?.extras?.sidebar !== undefined;
    }).toBe(true);
    await closeElectronApp(app);

    const snapshot = readSnapshot(userDataPath);
    expect(snapshot).not.toBeNull();
    expect(snapshot.extras.sidebar).toBeDefined();
    expect(snapshot.extras.sidebar.collapsed).toBe(false);
    expect(snapshot.extras.sidebar.width).toBe(250);

    // Simulate an existing snapshot by deleting the sidebar state
    const fs = require('fs');
    const path = require('path');
    const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      delete data.extras.sidebar;
      fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2), 'utf8');
    }

    // Launch again with the existing snapshot (missing sidebar) and verify it doesn't crash
    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);
    const dragHandle = page2.getByTestId('sidebar-drag-handle');
    await expect(dragHandle).toBeVisible({ timeout: 10000 });

    const handleBox = await dragHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    await page2.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page2.mouse.down();
    await page2.mouse.move(300, handleBox!.y + handleBox!.height / 2, { steps: 10 });
    await page2.mouse.up();
    // Wait for the new save to reflect the new width
    await expect.poll(() => {
      const snapshot2 = readSnapshot(userDataPath);
      return snapshot2?.extras?.sidebar?.width !== undefined && Math.abs(snapshot2.extras.sidebar.width - 300) < 15;
    }).toBe(true);
    await closeElectronApp(app2);

    const snapshot2 = readSnapshot(userDataPath);
    expect(snapshot2).not.toBeNull();
    expect(snapshot2.extras.sidebar).toBeDefined();
    expect(typeof snapshot2.extras.sidebar.collapsed).toBe('boolean');
    expect(typeof snapshot2.extras.sidebar.width).toBe('number');
    expect(Math.abs(snapshot2.extras.sidebar.width - 300)).toBeLessThan(15);
  });

  test('sidebar mixed-source hydration (width from localStorage, collapsed from snapshot)', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-mixed');

    // ── Session 1: establish collapsed state and width in snapshot ───────────
    await test.step('Session 1: establish collapsed state and width in snapshot', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      const toggleButton = page.getByTestId('toggle-sidebar-button');
      const dragHandle = page.getByTestId('sidebar-drag-handle');
      await expect(dragHandle).toBeVisible({ timeout: 10000 });

      const handleBox = await dragHandle.boundingBox();
      expect(handleBox).not.toBeNull();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(300, handleBox!.y + handleBox!.height / 2, { steps: 10 });
      await page.mouse.up();

      // Collapse the sidebar
      await toggleButton.click();
      // Wait for snapshot file update
      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.collapsed;
      }).toBe(true);
      await closeElectronApp(app);
    });

    // ── Session 2: configure mixed localStorage keys ─────────────────────────
    await test.step('Session 2: configure mixed localStorage keys', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      // Set width and delete collapsed state in localStorage
      await page2.evaluate(() => {
        window.localStorage.setItem('bruno.leftSidebarWidth', '450');
        window.localStorage.removeItem('bruno.sidebarCollapsed');
      });
      await closeElectronApp(app2);
    });

    // ── Session 3: verify mixed hydration takes effect ───────────────────────
    await test.step('Session 3: verify mixed hydration takes effect', async () => {
      const app3 = await launchElectronApp({ userDataPath });
      const page3 = await waitForReadyPage(app3);

      const sidebar3 = page3.getByTestId('sidebar');
      // Wait for layout/hydration to complete and verify collapsed width = 0
      await expect.poll(async () => {
        return await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
      }).toBe(0);

      // Uncollapse and verify it restores width = 450 from localStorage
      const toggleButton3 = page3.getByTestId('toggle-sidebar-button');
      await toggleButton3.click();
      await expect.poll(async () => {
        const width = await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(width - 450) < 15;
      }).toBe(true);

      await closeElectronApp(app3);
    });
  });

  test('sidebar mixed-source hydration (collapsed from localStorage, width from snapshot)', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-mixed-inverse');

    // ── Session 1: establish collapsed state (false) and width (380) in snapshot ──
    await test.step('Session 1: establish collapsed state and width in snapshot', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      const dragHandle = page.getByTestId('sidebar-drag-handle');
      await expect(dragHandle).toBeVisible({ timeout: 10000 });

      const handleBox = await dragHandle.boundingBox();
      expect(handleBox).not.toBeNull();
      await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
      await page.mouse.down();
      await page.mouse.move(380, handleBox!.y + handleBox!.height / 2, { steps: 10 });
      await page.mouse.up();

      // Wait for snapshot file update
      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.width !== undefined && Math.abs(snapshot.extras.sidebar.width - 380) < 15;
      }).toBe(true);
      await closeElectronApp(app);
    });

    // ── Session 2: configure mixed localStorage keys (collapsed in localStorage, width removed) ──
    await test.step('Session 2: configure mixed localStorage keys', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      // Set collapsed to true in localStorage, and delete width key
      await page2.evaluate(() => {
        window.localStorage.setItem('bruno.sidebarCollapsed', 'true');
        window.localStorage.removeItem('bruno.leftSidebarWidth');
      });
      await closeElectronApp(app2);
    });

    // ── Session 3: verify mixed hydration takes effect ───────────────────────
    await test.step('Session 3: verify mixed hydration takes effect', async () => {
      const app3 = await launchElectronApp({ userDataPath });
      const page3 = await waitForReadyPage(app3);

      const sidebar3 = page3.getByTestId('sidebar');
      // Wait for layout/hydration to complete and verify collapsed width = 0
      await expect.poll(async () => {
        return await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
      }).toBe(0);

      // Uncollapse and verify it restores width = 380 from snapshot
      const toggleButton3 = page3.getByTestId('toggle-sidebar-button');
      await toggleButton3.click();
      await expect.poll(async () => {
        const width = await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(width - 380) < 15;
      }).toBe(true);

      await closeElectronApp(app3);
    });
  });
});
