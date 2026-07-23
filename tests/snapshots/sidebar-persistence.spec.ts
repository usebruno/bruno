import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { readSnapshot, waitForSnapshotFile } from '../utils/snapshot';
import { SIDEBAR_WIDTH_KEY, SIDEBAR_COLLAPSED_KEY } from '../../packages/bruno-app/src/utils/common/localStorage';

async function resizeSidebar(page: any, targetWidth: number) {
  const dragHandle = page.getByTestId('sidebar-drag-handle');
  await expect(dragHandle).toBeVisible({ timeout: 10000 });

  await dragHandle.dispatchEvent('mousedown', { button: 0 });
  await page.waitForTimeout(100);

  // Mouse move and up on document (React attaches these listeners to document)
  await page.evaluate((width) => {
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: width, clientY: 100 }));
  }, targetWidth);
  await page.waitForTimeout(100);

  await page.evaluate((width) => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: width, clientY: 100 }));
  }, targetWidth);

  await page.waitForTimeout(100);
}

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
  test('sidebar collapsed state persists across restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-collapsed');

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
      await expect.poll(async () => {
        const width = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
        return width;
      }, { timeout: 5000 }).toBe(0);

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

    await test.step('Sidebar is collapsed on next launch', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const sidebar2 = page2.getByTestId('sidebar');
      await expect.poll(async () => {
        return await sidebar2.evaluate((el: HTMLElement) => el.offsetWidth);
      }).toBe(0);

      await closeElectronApp(app2);
    });
  });

  test('sidebar width persists across restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-width');
    const TARGET_WIDTH = 380;

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    const sidebar = page.getByTestId('sidebar');

    await test.step('Resize sidebar by dragging the drag handle', async () => {
      await resizeSidebar(page, TARGET_WIDTH);

      await expect.poll(async () => {
        const width = await sidebar.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(width - TARGET_WIDTH);
      }, { timeout: 5000 }).toBeLessThan(15);
    });

    await test.step('Wait for debounced snapshot save', async () => {
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

    await test.step('Sidebar restores the saved width on next launch', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      const sidebar2 = page2.getByTestId('sidebar');
      await expect.poll(async () => {
        const restoredWidth = await sidebar2.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(restoredWidth - TARGET_WIDTH) < 15;
      }).toBe(true);

      await closeElectronApp(app2);
    });
  });

  test('snapshot file extras.sidebar is optional in existing snapshots, and populated with defaults on first launch', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-schema');
    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
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

    const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      const data = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      delete data.extras.sidebar;
      fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2), 'utf8');
    }

    const app2 = await launchElectronApp({ userDataPath });
    const page2 = await waitForReadyPage(app2);

    await resizeSidebar(page2, 300);
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

    await test.step('Session 1: establish collapsed state and width in snapshot', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      const toggleButton = page.getByTestId('toggle-sidebar-button');

      await resizeSidebar(page, 300);

      await toggleButton.click();
      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.collapsed;
      }).toBe(true);
      await closeElectronApp(app);
    });

    await test.step('Session 2: configure mixed localStorage keys', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await page2.evaluate(([widthKey, collapsedKey]) => {
        window.localStorage.setItem(widthKey, '450');
        window.localStorage.removeItem(collapsedKey);
      }, [SIDEBAR_WIDTH_KEY, SIDEBAR_COLLAPSED_KEY]);
      await closeElectronApp(app2);
    });

    await test.step('Session 3: verify mixed hydration takes effect', async () => {
      const app3 = await launchElectronApp({ userDataPath });
      const page3 = await waitForReadyPage(app3);

      const sidebar3 = page3.getByTestId('sidebar');
      await expect.poll(async () => {
        return await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
      }).toBe(0);

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

    await test.step('Session 1: establish collapsed state and width in snapshot', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      await resizeSidebar(page, 380);

      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.width !== undefined && Math.abs(snapshot.extras.sidebar.width - 380) < 15;
      }).toBe(true);
      await closeElectronApp(app);
    });

    await test.step('Session 2: configure mixed localStorage keys', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await page2.evaluate(([widthKey, collapsedKey]) => {
        window.localStorage.setItem(collapsedKey, 'true');
        window.localStorage.removeItem(widthKey);
      }, [SIDEBAR_WIDTH_KEY, SIDEBAR_COLLAPSED_KEY]);
      await closeElectronApp(app2);
    });

    await test.step('Session 3: verify mixed hydration takes effect', async () => {
      const app3 = await launchElectronApp({ userDataPath });
      const page3 = await waitForReadyPage(app3);

      const sidebar3 = page3.getByTestId('sidebar');
      await expect.poll(async () => {
        return await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
      }).toBe(0);

      const toggleButton3 = page3.getByTestId('toggle-sidebar-button');
      await toggleButton3.click();
      await expect.poll(async () => {
        const width = await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(width - 380) < 15;
      }).toBe(true);

      await closeElectronApp(app3);
    });
  });

  test('localStorage takes precedence over snapshot when both exist', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-sidebar-precedence');

    await test.step('Session 1: establish snapshot values', async () => {
      const app = await launchElectronApp({ userDataPath });
      const page = await waitForReadyPage(app);

      await resizeSidebar(page, 380);

      const toggleButton = page.getByTestId('toggle-sidebar-button');
      await toggleButton.click();

      await expect.poll(() => {
        const snapshot = readSnapshot(userDataPath);
        return snapshot?.extras?.sidebar?.collapsed === true && Math.abs(snapshot.extras.sidebar.width - 380) < 15;
      }).toBe(true);
      await closeElectronApp(app);
    });

    await test.step('Session 2: set conflicting localStorage values', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await page2.evaluate(([widthKey, collapsedKey]) => {
        window.localStorage.setItem(widthKey, '450');
        window.localStorage.setItem(collapsedKey, 'false');
      }, [SIDEBAR_WIDTH_KEY, SIDEBAR_COLLAPSED_KEY]);
      await closeElectronApp(app2);
    });

    await test.step('Session 3: verify localStorage values are used', async () => {
      const app3 = await launchElectronApp({ userDataPath });
      const page3 = await waitForReadyPage(app3);

      const sidebar3 = page3.getByTestId('sidebar');

      await expect.poll(async () => {
        const width = await sidebar3.evaluate((el: HTMLElement) => el.offsetWidth);
        return Math.abs(width - 450) < 15;
      }).toBe(true);

      await closeElectronApp(app3);
    });
  });
});
