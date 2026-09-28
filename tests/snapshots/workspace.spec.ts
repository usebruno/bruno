import path from 'path';
import { test, expect, closeElectronApp } from '../../playwright';
import {
  createCollection,
  createRequest,
  openRequest,
  openWorkspaceFromDialog,
  waitForReadyPage
} from '../utils/page';
import fs from 'fs';

const buildWorkspaceYml = (workspaceName: string) => [
  'opencollection: 1.0.0',
  'info:',
  `  name: ${workspaceName}`,
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

test.describe('Snapshot: Deleted Workspace Restoration', () => {
  test('falls back to default workspace when saved workspace is deleted', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-workspace-state');
    const workspacePath = await createTmpDir('demo-workspace');
    const defaultCollectionPath = await createTmpDir('default-workspace-col');

    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml('Demo Workspace'));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create a collection in default workspace and mount it', async () => {
      await createCollection(page, 'Default Workspace Col', defaultCollectionPath);
      await createRequest(page, 'Default Workspace Req', 'Default Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Default Workspace Col', 'Default Workspace Req', { persist: true });
      await expect(page.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Open Demo Workspace and switch to it', async () => {
      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });
    });

    await test.step('Close and restart app', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Open after deleting workspace', async () => {
      await fs.promises.rm(workspacePath, { force: true, recursive: true });
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);
      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
      await expect(page2.getByTestId('sidebar-collection-row').filter({ hasText: 'Default Workspace Col' })).toBeVisible({ timeout: 10000 });
      await openRequest(page2, 'Default Workspace Col', 'Default Workspace Req');
      await expect(page2.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });

      await page2.getByTestId('workspace-menu').click();
      await expect(page2.locator('.workspace-item.active')).toContainText('My Workspace');
      await expect(page2.locator('.workspace-item').filter({ hasText: 'Demo Workspace' })).toHaveCount(0);
      await closeElectronApp(app2);
    });
  });

  test('falls back to default workspace when saved workspace exists but workspace.yml is missing', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-workspace-missing-yml');
    const workspacePath = await createTmpDir('demo-workspace-missing-yml');
    const defaultCollectionPath = await createTmpDir('default-workspace-col-missing-yml');

    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml('Demo Workspace'));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and request in default workspace', async () => {
      await createCollection(page, 'Default Workspace Col', defaultCollectionPath);
      await createRequest(page, 'Default Workspace Req', 'Default Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Default Workspace Col', 'Default Workspace Req', { persist: true });
      await expect(page.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Switch to demo workspace and restart', async () => {
      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });

      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Delete only workspace.yml and verify fallback', async () => {
      await fs.promises.unlink(path.join(workspacePath, 'workspace.yml'));

      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
      await expect(page2.getByTestId('sidebar-collection-row').filter({ hasText: 'Default Workspace Col' })).toBeVisible({ timeout: 10000 });

      await page2.getByTestId('workspace-menu').click();
      await expect(page2.locator('.workspace-item.active')).toContainText('My Workspace');
      await expect(page2.locator('.workspace-item').filter({ hasText: 'Demo Workspace' })).toHaveCount(0);

      await closeElectronApp(app2);
    });
  });

  test('falls back to default workspace when saved workspace.yml is malformed', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-workspace-malformed-yml');
    const workspacePath = await createTmpDir('demo-workspace-malformed-yml');
    const defaultCollectionPath = await createTmpDir('default-workspace-col-malformed-yml');

    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml('Demo Workspace'));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create collection and request in default workspace', async () => {
      await createCollection(page, 'Default Workspace Col', defaultCollectionPath);
      await createRequest(page, 'Default Workspace Req', 'Default Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Default Workspace Col', 'Default Workspace Req', { persist: true });
    });

    await test.step('Switch to demo workspace and restart', async () => {
      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });

      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Corrupt workspace.yml and verify fallback', async () => {
      fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'invalid: yaml: [[[');

      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
      await openRequest(page2, 'Default Workspace Col', 'Default Workspace Req');
      await expect(page2.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });

      await page2.getByTestId('workspace-menu').click();
      await expect(page2.locator('.workspace-item').filter({ hasText: 'Demo Workspace' })).toHaveCount(0);

      await closeElectronApp(app2);
    });
  });

  test('does not restore stale tabs from deleted workspace and remains interactive', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-workspace-stale-tabs-deleted');
    const workspacePath = await createTmpDir('demo-workspace-stale-tabs');
    const defaultCollectionPath = await createTmpDir('default-workspace-col-stale-tabs');
    const deletedWorkspaceCollectionPath = await createTmpDir('deleted-workspace-col');

    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml('Demo Workspace'));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create request in default workspace', async () => {
      await createCollection(page, 'Default Workspace Col', defaultCollectionPath);
      await createRequest(page, 'Default Workspace Req', 'Default Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Default Workspace Col', 'Default Workspace Req', { persist: true });
    });

    await test.step('Switch to demo workspace and open a request there', async () => {
      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });

      await createCollection(page, 'Deleted Workspace Col', deletedWorkspaceCollectionPath);
      await createRequest(page, 'Deleted Workspace Req', 'Deleted Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Deleted Workspace Col', 'Deleted Workspace Req', { persist: true });
      await expect(page.getByRole('tab', { name: 'Deleted Workspace Req' })).toBeVisible({ timeout: 10000 });
    });

    await test.step('Close app, delete active workspace, and verify stale tab is not restored', async () => {
      await page.waitForTimeout(2000);
      await closeElectronApp(app);

      await fs.promises.rm(workspacePath, { recursive: true, force: true });

      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
      await expect(page2.getByRole('tab', { name: 'Deleted Workspace Req' })).toHaveCount(0);

      await openRequest(page2, 'Default Workspace Col', 'Default Workspace Req');
      await expect(page2.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });

      await closeElectronApp(app2);
    });
  });

  test('falls back when active workspace and active tab belong to malformed workspace snapshot', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('snap-workspace-malformed-with-active-tab');
    const workspacePath = await createTmpDir('demo-workspace-malformed-active-tab');
    const defaultCollectionPath = await createTmpDir('default-workspace-col-malformed-active-tab');
    const malformedWorkspaceCollectionPath = await createTmpDir('malformed-workspace-col');

    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml('Demo Workspace'));

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);

    await test.step('Create default workspace request', async () => {
      await createCollection(page, 'Default Workspace Col', defaultCollectionPath);
      await createRequest(page, 'Default Workspace Req', 'Default Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Default Workspace Col', 'Default Workspace Req', { persist: true });
    });

    await test.step('Switch to demo workspace, create active request, and close app', async () => {
      await openWorkspaceFromDialog(app, page, workspacePath);
      await expect(page.getByTestId('workspace-name')).toHaveText('Demo Workspace', { timeout: 10000 });

      await createCollection(page, 'Malformed Workspace Col', malformedWorkspaceCollectionPath);
      await createRequest(page, 'Malformed Workspace Req', 'Malformed Workspace Col', {
        url: 'https://echo.usebruno.com',
        method: 'GET'
      });
      await openRequest(page, 'Malformed Workspace Col', 'Malformed Workspace Req', { persist: true });
      await expect(page.getByRole('tab', { name: 'Malformed Workspace Req' })).toBeVisible({ timeout: 10000 });

      await page.waitForTimeout(2000);
      await closeElectronApp(app);
    });

    await test.step('Corrupt workspace config and verify app recovers to default workspace', async () => {
      fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), 'broken: [[[');

      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await waitForReadyPage(app2);

      await expect(page2.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 10000 });
      await expect(page2.getByRole('tab', { name: 'Malformed Workspace Req' })).toHaveCount(0);

      await page2.getByTestId('workspace-menu').click();
      await expect(page2.locator('.workspace-item.active')).toContainText('My Workspace');
      await expect(page2.locator('.workspace-item').filter({ hasText: 'Demo Workspace' })).toHaveCount(0);
      await page2.keyboard.press('Escape');

      await openRequest(page2, 'Default Workspace Col', 'Default Workspace Req');
      await expect(page2.getByRole('tab', { name: 'Default Workspace Req' })).toBeVisible({ timeout: 10000 });

      await closeElectronApp(app2);
    });
  });
});
