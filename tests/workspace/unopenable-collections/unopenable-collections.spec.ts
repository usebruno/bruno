import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import { switchWorkspace, waitForReadyPage, buildCommonLocators } from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixturePath = path.join(__dirname, 'fixtures', 'workspace-with-broken-collections');
const localOnlyFixturePath = path.join(__dirname, 'fixtures', 'workspace-local-only');

const WORKSPACE_NAME = 'Broken WS';
const HEALTHY_COLL = 'Healthy Coll';
const MISSING_COLL = 'Missing Coll';
const EMPTY_COLL = 'Empty Coll';
const GHOST_COLL = 'Ghost Coll';

test.describe('Collections that cannot be opened', () => {
  test('switching into the workspace reports how many collections failed to open', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('unopenable-coll-toast');
    await fs.promises.cp(fixturePath, workspacePath, { recursive: true });

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { toast, sidebar, workspaceOverview } = buildCommonLocators(page);

    await test.step('The missing folder and the folder without a collection config are both counted', async () => {
      await switchWorkspace(page, WORKSPACE_NAME);
      await expect(toast.byMessage('Failed to open 2 collections')).toBeVisible({ timeout: 10000 });
    });

    await test.step('The git-backed entry that is not cloned yet is not counted as a failure', async () => {
      await expect(toast.byMessage('Failed to open 3 collections')).toHaveCount(0);
    });

    await test.step('The healthy collection still opens', async () => {
      await expect(sidebar.collection(HEALTHY_COLL)).toBeVisible({ timeout: 10000 });
    });

    await test.step('Both failed collections stay listed on the overview, badged as failed', async () => {
      for (const name of [MISSING_COLL, EMPTY_COLL]) {
        await expect(workspaceOverview.collectionCard(name)).toBeVisible();
        await expect(workspaceOverview.collectionCard(name).getByText('Failed to open')).toBeVisible();
      }
    });

    await test.step('The healthy and git-backed cards carry no failure badge', async () => {
      await expect(workspaceOverview.collectionCard(HEALTHY_COLL).getByText('Failed to open')).toHaveCount(0);
      await expect(workspaceOverview.collectionCard(GHOST_COLL).getByText('Failed to open')).toHaveCount(0);
    });

    await test.step('The collections count excludes the failed collections', async () => {
      await expect(page.locator('.stat-item').filter({ hasText: 'Collections' }).locator('.stat-value'))
        .toHaveText('2');
    });

    await test.step('Clicking a failed collection reports the failure and opens no tab', async () => {
      await workspaceOverview.collectionCard(MISSING_COLL).click();
      await expect(toast.byMessage(`Collection "${MISSING_COLL}" could not be opened`)).toBeVisible();
    });

    await closeElectronApp(app);
  });

  test('a workspace with no git-backed entries still reports and badges its broken collection', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('unopenable-coll-local-only');
    await fs.promises.cp(localOnlyFixturePath, workspacePath, { recursive: true });

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { toast, sidebar, workspaceOverview } = buildCommonLocators(page);

    await test.step('The broken collection is reported on switch', async () => {
      await switchWorkspace(page, 'Local Only WS');
      await expect(toast.byMessage('Failed to open 1 collection')).toBeVisible({ timeout: 10000 });
    });

    await test.step('It is listed on the overview with a failure badge', async () => {
      await expect(workspaceOverview.collectionCard(MISSING_COLL)).toBeVisible();
      await expect(workspaceOverview.collectionCard(MISSING_COLL).getByText('Failed to open')).toBeVisible();
    });

    await test.step('The count reflects only the collection that opened', async () => {
      await expect(sidebar.collection(HEALTHY_COLL)).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.stat-item').filter({ hasText: 'Collections' }).locator('.stat-value'))
        .toHaveText('1');
    });

    await closeElectronApp(app);
  });

  test('a workspace whose collections all open reports nothing', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('unopenable-coll-none');
    await fs.promises.cp(fixturePath, workspacePath, { recursive: true });

    await fs.promises.writeFile(
      path.join(workspacePath, 'workspace.yml'),
      [
        'opencollection: 1.0.0',
        'info:',
        '  name: "Broken WS"',
        '  type: workspace',
        '',
        'collections:',
        '  - name: "Healthy Coll"',
        '    path: "collections/healthy-coll"',
        '',
        'specs:',
        '',
        'docs: \'\'',
        ''
      ].join('\n')
    );

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { toast, sidebar } = buildCommonLocators(page);

    await test.step('The workspace opens without a failure toast', async () => {
      await switchWorkspace(page, WORKSPACE_NAME);
      await expect(sidebar.collection(HEALTHY_COLL)).toBeVisible({ timeout: 10000 });
      await expect(toast.byMessage(/Failed to open \d+ collection/)).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('removing a failed collection prunes it from workspace.yml', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('unopenable-coll-remove');
    await fs.promises.cp(fixturePath, workspacePath, { recursive: true });

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { toast, workspaceOverview } = buildCommonLocators(page);

    await test.step('Choose Remove from the failed collection card menu', async () => {
      await switchWorkspace(page, WORKSPACE_NAME);
      await expect(workspaceOverview.collectionCard(MISSING_COLL)).toBeVisible({ timeout: 10000 });
      await workspaceOverview.collectionCardMenu(MISSING_COLL).click();
      await workspaceOverview.collectionCardMenuItems(MISSING_COLL).getByText('Remove', { exact: true }).click();
    });

    await test.step('The card disappears without a confirmation modal', async () => {
      await expect(toast.byMessage('Collection removed from workspace')).toBeVisible();
      await expect(workspaceOverview.collectionCard(MISSING_COLL)).toHaveCount(0, { timeout: 5000 });
    });

    await test.step('workspace.yml no longer lists the entry, and the others survive', async () => {
      const raw = await fs.promises.readFile(path.join(workspacePath, 'workspace.yml'), 'utf8');
      expect(raw).not.toContain(MISSING_COLL);
      expect(raw).toContain(HEALTHY_COLL);
      expect(raw).toContain(EMPTY_COLL);
      expect(raw).toContain(GHOST_COLL);
    });

    await closeElectronApp(app);
  });

  test('a failed collection card offers Remove and no other action', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('unopenable-coll-menu');
    await fs.promises.cp(fixturePath, workspacePath, { recursive: true });

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { sidebar, workspaceOverview } = buildCommonLocators(page);

    await test.step('Switch into the workspace and let the healthy collection finish loading', async () => {
      await switchWorkspace(page, WORKSPACE_NAME);
      await expect(sidebar.collection(HEALTHY_COLL)).toBeVisible({ timeout: 10000 });
    });

    await test.step('The failed collection card menu holds Remove and nothing else', async () => {
      await workspaceOverview.collectionCardMenu(MISSING_COLL).click();
      await expect(workspaceOverview.collectionCardMenuItems(MISSING_COLL)).toHaveText(['Remove']);
    });

    await test.step('A collection that opened keeps its full menu in the same workspace', async () => {
      await workspaceOverview.collectionCardMenu(HEALTHY_COLL).click();
      await expect(workspaceOverview.collectionCardMenuItems(HEALTHY_COLL)).toHaveText([
        'Rename',
        'Share',
        /^Reveal in /,
        'Connect to Git',
        'Remove',
        'Delete'
      ]);
    });

    await closeElectronApp(app);
  });
});
