import path from 'path';
import fs from 'fs';
import http from 'http';
import { AddressInfo } from 'net';
import jsyaml from 'js-yaml';
import { test, expect, closeElectronApp } from '../../playwright';
import { openWorkspaceFromDialog, buildCommonLocators } from '../../pages';
import { openConnectedOpenApiSyncTab } from '../../pages/openapi-sync';
import { waitForReadyPage } from '../../utils';

const WORKSPACE_NAME = 'Shared Sync Workspace';
const COLLECTION_NAME = 'Shared Collection';
const SPEC = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'Shared API', version: '1' },
  paths: { '/pets': { get: { summary: 'List pets', responses: { 200: { description: 'ok' } } } } }
});

// Stands in for an internal service a shared collection points its sync source at.
const startListener = async () => {
  const requests: string[] = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url || '');
    res.setHeader('content-type', 'application/json');
    res.end(SPEC);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { requests, sourceUrl: `http://127.0.0.1:${port}/openapi.json`, close: () => new Promise((resolve) => server.close(resolve)) };
};

// A collection from someone else: its file links a source with auto check on, never approved here
const seedSharedCollection = async (createTmpDir: (tag?: string) => Promise<string>, sourceUrl: string) => {
  const userDataPath = await createTmpDir('openapi-source-approval-user-data');
  const workspacePath = await createTmpDir('openapi-source-approval-workspace');
  const collectionPath = path.join(workspacePath, 'collections', 'shared');
  fs.mkdirSync(collectionPath, { recursive: true });
  fs.writeFileSync(path.join(collectionPath, 'bruno.json'), JSON.stringify({
    version: '1',
    name: COLLECTION_NAME,
    type: 'collection',
    openapi: [{ sourceUrl, groupBy: 'tags', autoCheck: true, autoCheckInterval: 5 }]
  }, null, 2));
  fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), jsyaml.dump({
    opencollection: '1.0.0',
    info: { name: WORKSPACE_NAME, type: 'workspace' },
    collections: [{ name: COLLECTION_NAME, path: 'collections/shared' }],
    specs: [],
    docs: ''
  }));
  return { userDataPath, workspacePath };
};

test.describe('OpenAPI sync: a sync source that came with a shared collection', () => {
  test('is not contacted until the user approves it, then syncs', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(90000);
    const listener = await startListener();
    const { userDataPath, workspacePath } = await seedSharedCollection(createTmpDir, listener.sourceUrl);
    const app = await launchElectronApp({ userDataPath });

    try {
      const page = await waitForReadyPage(app);
      const { titleBar, openApi } = buildCommonLocators(page);
      const approval = openApi.sync.sourceApproval;

      await test.step('Open the workspace with the shared collection', async () => {
        await openWorkspaceFromDialog(app, page, workspacePath);
        await titleBar.activeWorkspaceName().filter({ hasText: WORKSPACE_NAME }).waitFor({ timeout: 10000 });
      });

      await test.step('The OpenAPI button shows the source needs review', async () => {
        await expect(approval.headerDot()).toBeVisible({ timeout: 10000 });
      });

      await test.step('The OpenAPI tab shows the full source and the private address warning instead of syncing', async () => {
        await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);
        await expect(approval.banner()).toBeVisible();
        await expect(approval.url()).toHaveText(listener.sourceUrl);
        await expect(approval.warning()).toContainText('private network');
        await expect(approval.tabDot()).toBeVisible();
      });

      await test.step('No request reaches the source past the first auto check', async () => {
        // The first auto check fires 10 s after opening; proving nothing arrived needs that time to pass
        await page.waitForTimeout(12000);
        expect(listener.requests).toEqual([]);
      });

      await test.step('Approving the source syncs from it and clears the review markers', async () => {
        await approval.approveButton().click();
        await expect.poll(() => listener.requests.length, { timeout: 15000 }).toBeGreaterThan(0);
        await expect(approval.banner()).toBeHidden();
        await expect(approval.headerDot()).toBeHidden();
        await expect(openApi.sync.checkUpdatesButton()).toBeVisible();
      });
    } finally {
      await closeElectronApp(app);
      await listener.close();
    }
  });

  test('dismissing keeps the source off and clears the review dot', async ({ launchElectronApp, createTmpDir }) => {
    test.setTimeout(60000);
    const listener = await startListener();
    const { userDataPath, workspacePath } = await seedSharedCollection(createTmpDir, listener.sourceUrl);
    const app = await launchElectronApp({ userDataPath });

    try {
      const page = await waitForReadyPage(app);
      const { titleBar, openApi } = buildCommonLocators(page);
      const approval = openApi.sync.sourceApproval;

      await test.step('Open the shared collection\'s OpenAPI tab', async () => {
        await openWorkspaceFromDialog(app, page, workspacePath);
        await titleBar.activeWorkspaceName().filter({ hasText: WORKSPACE_NAME }).waitFor({ timeout: 10000 });
        await openConnectedOpenApiSyncTab(page, COLLECTION_NAME);
        await expect(approval.banner()).toBeVisible();
      });

      await test.step('Dismiss: the dot clears, the banner stays as "sync is off", nothing is fetched', async () => {
        await approval.dismissButton().click();
        await expect(approval.banner()).toContainText('Sync is off for this collection');
        await expect(approval.dismissButton()).toBeHidden();
        await expect(approval.headerDot()).toBeHidden();
        await expect(approval.tabDot()).toBeHidden();
        expect(listener.requests).toEqual([]);
      });
    } finally {
      await closeElectronApp(app);
      await listener.close();
    }
  });
});
