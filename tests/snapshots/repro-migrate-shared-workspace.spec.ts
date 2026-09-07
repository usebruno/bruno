import fs from 'fs';
import path from 'path';
import { test, expect } from '../../playwright';
import {
  buildCommonLocators,
  confirmMigration,
  createCollection,
  createRequest,
  openCollection,
  openMigrateToYmlModalFromOverview,
  openRequest,
  openWorkspaceFromDialog,
  switchWorkspace,
  waitForReadyPage
} from '../utils/page';

/**
 * Failure chain (fixed by remapping snapshot tabs across all workspaces):
 * 1. Persist ReqA.bru tabs in workspace A for a shared bru collection
 * 2. Open the same collection in workspace B and migrate to yml there
 * 3. Migration flushSnapshotNow only rewrites the active workspace entry
 * 4. Without remap, serializeSnapshot preserves workspace A's ReqA.bru tabs verbatim
 * 5. Switching back restores a dead "Not Found" tab against the yml collection
 */
test('migration clears stale tabs for the same collection in another workspace', async ({
  launchElectronApp,
  createTmpDir
}) => {
  test.setTimeout(90_000);

  const userDataPath = await createTmpDir('migrate-shared-workspace-user-data');
  const collectionParentPath = await createTmpDir('migrate-shared-workspace-collection');
  const workspaceBPath = await createTmpDir('migrate-shared-workspace-b');
  const sharedCollectionPath = path.join(collectionParentPath, 'SharedCol');

  fs.writeFileSync(
    path.join(workspaceBPath, 'workspace.yml'),
    [
      'opencollection: 1.0.0',
      'info:',
      '  name: WorkspaceB',
      '  type: workspace',
      'collections:',
      'specs: []',
      'docs: \'\'',
      ''
    ].join('\n')
  );

  const app = await launchElectronApp({ userDataPath });
  const page = await waitForReadyPage(app);
  const locators = buildCommonLocators(page);

  await test.step('Create a bru collection and persist ReqA in the default workspace', async () => {
    await createCollection(page, 'SharedCol', collectionParentPath, 'bru');
    await createRequest(page, 'ReqA', 'SharedCol', {
      url: 'https://echo.usebruno.com',
      method: 'GET'
    });
    await createRequest(page, 'ReqB', 'SharedCol', {
      url: 'https://echo.usebruno.com',
      method: 'GET'
    });
    await openRequest(page, 'SharedCol', 'ReqA', { persist: true });
    await page.waitForTimeout(2_000);
  });

  await test.step('Open WorkspaceB, add the same collection, and persist ReqB', async () => {
    await openWorkspaceFromDialog(app, page, workspaceBPath);
    await expect(page.getByTestId('workspace-name')).toHaveText('WorkspaceB');

    await app.evaluate(
      ({ dialog }, targetPath: string) => {
        (dialog as any).showOpenDialog = () =>
          Promise.resolve({ canceled: false, filePaths: [targetPath] });
      },
      sharedCollectionPath
    );
    await page.getByTestId('collections-header-add-menu').click();
    await page.locator('.tippy-box .dropdown-item').filter({ hasText: 'Open collection' }).click();

    await expect(locators.sidebar.collection('SharedCol')).toBeVisible();
    await openCollection(page, 'SharedCol');
    await openRequest(page, 'SharedCol', 'ReqB', { persist: true });
    await page.waitForTimeout(2_000);
  });

  await test.step('Migrate the shared collection from WorkspaceB', async () => {
    await openMigrateToYmlModalFromOverview(page, 'SharedCol');
    await confirmMigration(page);
    await expect(page.getByText('Collection migrated to YML format successfully')).toBeVisible({
      timeout: 30_000
    });
  });

  await test.step('Switch back to the default workspace and open the shared collection', async () => {
    await switchWorkspace(page, 'My Workspace');
    await expect(locators.sidebar.collection('SharedCol')).toBeVisible();
    await openCollection(page, 'SharedCol');
  });

  await test.step('Stale bru tabs from the inactive workspace must not come back', async () => {
    await page.waitForTimeout(2_000);
    const tabLabels = await page.getByTestId('request-tab').allTextContents();
    // Restored dead ReqA.bru tab is labeled "Not Found", not "ReqA".
    expect(tabLabels.some((label) => /Not Found/i.test(label))).toBe(false);
  });
});
