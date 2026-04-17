import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  openCollection,
  createWorkspace,
  switchWorkspace,
  selectRequestPaneTab
} from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

/**
 * Helper: read the snapshot JSON from the user data directory.
 * electron-store saves it as `ui-state-snapshot.json`.
 */
const readSnapshot = (userDataPath: string) => {
  const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
  if (!fs.existsSync(snapshotPath)) return null;
  return JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
};

// ─── Tab Persistence ────────────────────────────────────────────────────────

test.describe('Snapshot: Tab Persistence', () => {
  test('open tabs are restored after app restart in the same order', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-tabs-order');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection with two requests and open both', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await createRequest(page, 'ReqBeta', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });
      await openRequest(page, 'TestCol', 'ReqBeta', { persist: true });
    });

    await test.step('Close and restart app', async () => {
      // Wait for debounced snapshot save to flush
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify tabs restored in order', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      // Wait for snapshot hydration to restore tabs
      await expect(locators.tabs.requestTab('ReqAlpha')).toBeVisible({ timeout: 15000 });
      await expect(locators.tabs.requestTab('ReqBeta')).toBeVisible({ timeout: 10000 });

      // Verify order: ReqAlpha before ReqBeta
      const tabs = page2.locator('.request-tab .tab-label');
      const tabTexts = await tabs.allTextContents();
      const alphaIndex = tabTexts.findIndex((t) => t.includes('ReqAlpha'));
      const betaIndex = tabTexts.findIndex((t) => t.includes('ReqBeta'));
      expect(alphaIndex).toBeGreaterThanOrEqual(0);
      expect(betaIndex).toBeGreaterThan(alphaIndex);

      await closeElectronApp(app2);
    });
  });

  test('active tab is remembered after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-active-tab');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create two requests and focus ReqAlpha', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqAlpha', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await createRequest(page, 'ReqBeta', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqBeta', { persist: true });
      await openRequest(page, 'TestCol', 'ReqAlpha', { persist: true });

      const locators = buildCommonLocators(page);
      await expect(locators.tabs.activeRequestTab()).toContainText('ReqAlpha');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify ReqAlpha is the active tab', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.activeRequestTab()).toContainText('ReqAlpha', { timeout: 10000 });

      await closeElectronApp(app2);
    });
  });

  test('closed tab stays closed after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-closed-tab');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create two requests, open both, close one', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'ReqKeep', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await createRequest(page, 'ReqClose', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'ReqKeep', { persist: true });
      await openRequest(page, 'TestCol', 'ReqClose', { persist: true });

      const locators = buildCommonLocators(page);
      await locators.tabs.closeTab('ReqClose').click({ force: true });
      await expect(locators.tabs.requestTab('ReqClose')).not.toBeVisible();
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify ReqClose is not restored', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      await expect(locators.tabs.requestTab('ReqKeep')).toBeVisible({ timeout: 10000 });
      await expect(locators.tabs.requestTab('ReqClose')).not.toBeVisible();

      await closeElectronApp(app2);
    });
  });

  test('request pane tab selection persists after restart', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const userDataPath = await createTmpDir('snap-pane-tab');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create request and switch to Headers tab', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'Req1', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'Req1', { persist: true });
      await selectRequestPaneTab(page, 'Headers');
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify Headers tab is still selected', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      // The active collection's tabs should be auto-restored by switchWorkspace
      await expect(locators.tabs.requestTab('Req1')).toBeVisible({ timeout: 15000 });
      // Click the request tab to make it active and show its pane
      await locators.tabs.requestTab('Req1').click({ force: true });

      // The active request pane tab should be Headers
      const requestPane = page2.locator('.request-pane > .px-4');
      await expect(requestPane).toBeVisible({ timeout: 5000 });
      const headersTab = requestPane.locator('.tabs').getByRole('tab', { name: 'Headers' });
      await expect(headersTab).toHaveClass(/active/, { timeout: 5000 });

      await closeElectronApp(app2);
    });
  });
});

// ─── Workspace State ────────────────────────────────────────────────────────

test.describe('Snapshot: Workspace State', () => {
  test('active workspace is remembered after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-active-ws');
    const workspaceBPath = await createTmpDir('workspace-b');
    const WORKSPACE_YML = [
      'opencollection: 1.0.0',
      'info:',
      '  name: WorkspaceB',
      '  type: workspace',
      'collections:',
      'specs: []',
      'docs: \'\'',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), WORKSPACE_YML);

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Open WorkspaceB and switch to it', async () => {
      await app.evaluate(
        ({ dialog }, targetPath: string) => {
          (dialog as any).showOpenDialog = () =>
            Promise.resolve({ canceled: false, filePaths: [targetPath] });
        },
        workspaceBPath
      );
      await page.getByTestId('workspace-menu').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
      await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });
    });

    await test.step('Close and restart app', async () => {
      // Wait for debounced snapshot save to flush
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify WorkspaceB is still active', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await expect(page2.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });

      await closeElectronApp(app2);
    });
  });

  test('each workspace remembers its own active collection', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const userDataPath = await createTmpDir('snap-ws-active-col');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');
    const workspaceBPath = await createTmpDir('workspace-b');
    const WORKSPACE_YML = [
      'opencollection: 1.0.0',
      'info:',
      '  name: WorkspaceB',
      '  type: workspace',
      'collections:',
      'specs: []',
      'docs: \'\'',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), WORKSPACE_YML);

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create ColA with request in default workspace', async () => {
      await createCollection(page, 'ColA', colAPath);
      await createRequest(page, 'ReqA', 'ColA', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'ColA', 'ReqA', { persist: true });
    });

    await test.step('Open WorkspaceB', async () => {
      await app.evaluate(
        ({ dialog }, targetPath: string) => {
          (dialog as any).showOpenDialog = () =>
            Promise.resolve({ canceled: false, filePaths: [targetPath] });
        },
        workspaceBPath
      );
      await page.getByTestId('workspace-menu').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
      await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });
    });

    await test.step('Create ColB with request in WorkspaceB', async () => {
      await createCollection(page, 'ColB', colBPath);
      await createRequest(page, 'ReqB', 'ColB', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'ColB', 'ReqB', { persist: true });
    });

    await test.step('Switch back to default workspace and verify ColA tabs restored', async () => {
      // Wait for snapshot to save before switching
      await page.waitForTimeout(2000);
      await switchWorkspace(page, 'My Workspace');
      // Wait for collections to load, then click collection to mount and restore tabs
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.collection('ColA')).toBeVisible({ timeout: 10000 });
      await openCollection(page, 'ColA');
      await expect(locators.tabs.requestTab('ReqA')).toBeVisible({ timeout: 15000 });
    });

    await test.step('Switch to WorkspaceB and verify ColB tabs restored', async () => {
      await page.waitForTimeout(2000);
      await switchWorkspace(page, 'WorkspaceB');
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.collection('ColB')).toBeVisible({ timeout: 10000 });
      await openCollection(page, 'ColB');
      await expect(locators.tabs.requestTab('ReqB')).toBeVisible({ timeout: 15000 });
    });

    await closeElectronApp(app);
  });
});

// ─── Collection State ───────────────────────────────────────────────────────

test.describe('Snapshot: Collection State', () => {
  test('collection expanded state persists after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-col-expanded');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and open a request (expands it)', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'Req1', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'Req1', { persist: true });

      // Verify collection is expanded (request is visible in sidebar)
      const locators = buildCommonLocators(page);
      await expect(locators.sidebar.request('Req1')).toBeVisible();
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify collection is still expanded', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const locators = buildCommonLocators(page2);
      // The active collection should be expanded, showing items in sidebar
      await expect(locators.sidebar.request('Req1')).toBeVisible({ timeout: 10000 });

      await closeElectronApp(app2);
    });
  });
});

// ─── Multi-Workspace Tab Isolation ──────────────────────────────────────────

test.describe('Snapshot: Multi-Workspace Tab Isolation', () => {
  test('tabs from workspace A do not leak into workspace B after restart', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const userDataPath = await createTmpDir('snap-tab-isolation');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');
    const workspaceBPath = await createTmpDir('workspace-b');
    const WORKSPACE_YML = [
      'opencollection: 1.0.0',
      'info:',
      '  name: WorkspaceB',
      '  type: workspace',
      'collections:',
      'specs: []',
      'docs: \'\'',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(workspaceBPath, 'workspace.yml'), WORKSPACE_YML);

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create ReqA in default workspace', async () => {
      await createCollection(page, 'ColA', colAPath);
      await createRequest(page, 'ReqA', 'ColA', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'ColA', 'ReqA', { persist: true });
    });

    await test.step('Switch to WorkspaceB and create ReqB', async () => {
      await app.evaluate(
        ({ dialog }, targetPath: string) => {
          (dialog as any).showOpenDialog = () =>
            Promise.resolve({ canceled: false, filePaths: [targetPath] });
        },
        workspaceBPath
      );
      await page.getByTestId('workspace-menu').click();
      await page.locator('.dropdown-item').filter({ hasText: 'Open workspace' }).click();
      await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });

      await createCollection(page, 'ColB', colBPath);
      await createRequest(page, 'ReqB', 'ColB', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'ColB', 'ReqB', { persist: true });
    });

    await test.step('Close and restart app', async () => {
      // Wait for debounced snapshot save to flush
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify WorkspaceB tabs do not show ReqA', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // App should restore to WorkspaceB (last active)
      await expect(page2.getByTestId('workspace-name')).toHaveText('WorkspaceB', { timeout: 10000 });

      const locators = buildCommonLocators(page2);
      // Wait for collection to load, then click to bring its tabs into view
      await expect(locators.sidebar.collection('ColB')).toBeVisible({ timeout: 10000 });
      await openCollection(page2, 'ColB');
      await expect(locators.tabs.requestTab('ReqB')).toBeVisible({ timeout: 10000 });
      await expect(locators.tabs.requestTab('ReqA')).not.toBeVisible();

      await test.step('Switch to default workspace and verify ReqA, not ReqB', async () => {
        await switchWorkspace(page2, 'My Workspace');
        // Wait for collections to load in the workspace
        await expect(locators.sidebar.collection('ColA')).toBeVisible({ timeout: 10000 });
        await openCollection(page2, 'ColA');
        await expect(locators.tabs.requestTab('ReqA')).toBeVisible({ timeout: 15000 });
        await expect(locators.tabs.requestTab('ReqB')).not.toBeVisible();
      });

      await closeElectronApp(app2);
    });
  });
});

// ─── DevTools State ─────────────────────────────────────────────────────────

test.describe('Snapshot: DevTools State', () => {
  test('devtools open state and active tab persist after restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-devtools');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Open devtools and switch to Performance tab', async () => {
      const devToolsButton = page.locator('button[data-trigger="dev-tools"]');
      await devToolsButton.click();
      await expect(page.locator('.console-header')).toBeVisible();

      const performanceTab = page.locator('.console-tab').filter({ hasText: 'Performance' });
      await performanceTab.click();
      await expect(performanceTab).toHaveClass(/active/);
    });

    await test.step('Close and restart app', async () => {
      // Wait for debounced snapshot save to flush
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Verify devtools is open with Performance tab active', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      // DevTools should be open
      await expect(page2.locator('.console-header')).toBeVisible({ timeout: 10000 });

      // Performance tab should be active
      const performanceTab = page2.locator('.console-tab').filter({ hasText: 'Performance' });
      await expect(performanceTab).toHaveClass(/active/, { timeout: 5000 });

      await closeElectronApp(app2);
    });
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

test.describe('Snapshot: Edge Cases', () => {
  test('fresh app launch with no snapshot file loads cleanly', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-fresh');

    // Ensure no snapshot file exists
    const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
    if (fs.existsSync(snapshotPath)) {
      fs.unlinkSync(snapshotPath);
    }

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    // App should load the default workspace without errors
    await expect(page.getByTestId('workspace-name')).toBeVisible({ timeout: 10000 });

    await closeElectronApp(app);
  });

  test('corrupt snapshot file results in graceful recovery', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-corrupt');

    // Write invalid JSON to snapshot file
    const snapshotPath = path.join(userDataPath, 'ui-state-snapshot.json');
    fs.writeFileSync(snapshotPath, '{ invalid json !!!', 'utf-8');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    // App should recover and show default workspace
    await expect(page.getByTestId('workspace-name')).toBeVisible({ timeout: 10000 });

    await closeElectronApp(app);
  });
});

// ─── Snapshot File Structure ────────────────────────────────────────────────

test.describe('Snapshot: File Structure', () => {
  test('snapshot file uses map-based structure with correct keys', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-structure');
    const colPath = await createTmpDir('col');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create collection and open a request', async () => {
      await createCollection(page, 'TestCol', colPath);
      await createRequest(page, 'Req1', 'TestCol', { url: 'https://echo.usebruno.com', method: 'GET' });
      await openRequest(page, 'TestCol', 'Req1', { persist: true });
    });

    // Give the debounced save time to flush
    await page.waitForTimeout(2000);

    await test.step('Close app and inspect snapshot file', async () => {
      await closeElectronApp(app);

      const snapshot = readSnapshot(userDataPath);
      expect(snapshot).not.toBeNull();

      // Top-level keys should exist
      expect(snapshot).toHaveProperty('activeWorkspacePath');
      expect(snapshot).toHaveProperty('extras');
      expect(snapshot).toHaveProperty('extras.devTools');
      expect(snapshot).toHaveProperty('workspaces');
      expect(snapshot).toHaveProperty('collections');
      expect(snapshot).toHaveProperty('tabs');

      // workspaces, collections, tabs should be objects (maps), not arrays
      expect(Array.isArray(snapshot.workspaces)).toBe(false);
      expect(typeof snapshot.workspaces).toBe('object');
      expect(Array.isArray(snapshot.collections)).toBe(false);
      expect(typeof snapshot.collections).toBe('object');
      expect(Array.isArray(snapshot.tabs)).toBe(false);
      expect(typeof snapshot.tabs).toBe('object');

      // There should be at least one workspace
      const workspaceKeys = Object.keys(snapshot.workspaces);
      expect(workspaceKeys.length).toBeGreaterThanOrEqual(1);

      // Workspace should have expected shape
      const firstWorkspace = snapshot.workspaces[workspaceKeys[0]];
      expect(firstWorkspace).toHaveProperty('lastActiveCollectionPathname');
      expect(firstWorkspace).toHaveProperty('sorting');
      expect(firstWorkspace).toHaveProperty('collectionPathnames');
      expect(Array.isArray(firstWorkspace.collectionPathnames)).toBe(true);

      // There should be at least one collection
      const collectionKeys = Object.keys(snapshot.collections);
      expect(collectionKeys.length).toBeGreaterThanOrEqual(1);

      // Collection should have expected shape
      const firstCollection = snapshot.collections[collectionKeys[0]];
      expect(firstCollection).toHaveProperty('workspacePathname');
      expect(firstCollection).toHaveProperty('environment');
      expect(firstCollection).toHaveProperty('isOpen');
      expect(firstCollection).toHaveProperty('isMounted');

      // Tabs should exist for the collection
      const tabKeys = Object.keys(snapshot.tabs);
      expect(tabKeys.length).toBeGreaterThanOrEqual(1);

      // Tab entry should have expected shape
      const firstTabEntry = snapshot.tabs[tabKeys[0]];
      expect(firstTabEntry).toHaveProperty('tabs');
      expect(Array.isArray(firstTabEntry.tabs)).toBe(true);
      expect(firstTabEntry).toHaveProperty('activeTab');
    });
  });
});
