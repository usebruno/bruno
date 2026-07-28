import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp, ElectronApplication, Page } from '../../../playwright';
import {
  switchWorkspace,
  waitForReadyPage,
  buildCommonLocators,
  openWorkspaceOverview,
  selectCollectionCardMenuItem
} from '../../utils/page';

type CollectionEntry = { name?: string; path?: string; remote?: string };
type WorkspaceConfig = { collections?: CollectionEntry[] };

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixturePath = path.join(__dirname, 'fixtures', 'workspace-with-broken-collections');

const WORKSPACE_NAME = 'Broken WS';
const HEALTHY_COLL = 'Healthy Coll';
const MISSING_COLL = 'Missing Coll';
const EMPTY_COLL = 'Empty Coll';
const GHOST_COLL = 'Ghost Coll';

function readWorkspaceYml(workspacePath: string): WorkspaceConfig {
  const raw = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
  return yaml.load(raw) as WorkspaceConfig;
}

async function openBrokenWorkspaceOverview(
  launchElectronApp: (opts?: any) => Promise<ElectronApplication>,
  workspacePath: string
): Promise<{ app: ElectronApplication; page: Page }> {
  await fs.promises.cp(fixturePath, workspacePath, { recursive: true });

  const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
  const page = await waitForReadyPage(app);

  await switchWorkspace(page, WORKSPACE_NAME);
  await openWorkspaceOverview(page);

  return { app, page };
}

test.describe('Collections that fail to open', () => {
  test('badges distinguish a missing folder from a folder without a collection config', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('failed-coll-badges');
    const { app, page } = await openBrokenWorkspaceOverview(launchElectronApp, workspacePath);
    const overview = buildCommonLocators(page).workspaceOverview;

    await test.step('An entry whose folder does not exist is badged as Missing', async () => {
      await expect(overview.failedBadge(MISSING_COLL)).toHaveText('Missing', { timeout: 10000 });
    });

    await test.step('An entry whose folder has no collection config is badged as Failed to open', async () => {
      await expect(overview.failedBadge(EMPTY_COLL)).toHaveText('Failed to open');
    });

    await test.step('A collection that opens fine carries no failure badge', async () => {
      await expect(overview.card(HEALTHY_COLL)).toBeVisible();
      await expect(overview.failedBadge(HEALTHY_COLL)).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('clicking a missing collection reports the failure and opens no tab', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('failed-coll-click-missing');
    const { app, page } = await openBrokenWorkspaceOverview(launchElectronApp, workspacePath);
    const overview = buildCommonLocators(page).workspaceOverview;

    await test.step('Click the missing collection card', async () => {
      await expect(overview.card(MISSING_COLL)).toBeVisible({ timeout: 10000 });
      await overview.card(MISSING_COLL).click();
    });

    await test.step('An error toast reports the collection could not be opened', async () => {
      await expect(page.getByText(/Collection could not be opened:.*missing-coll/)).toBeVisible();
    });

    await test.step('No collection tab is opened and the card stays on the overview', async () => {
      await expect(page.locator('.request-tab').filter({ hasText: MISSING_COLL })).toHaveCount(0);
      await expect(overview.card(MISSING_COLL)).toBeVisible();
    });

    await closeElectronApp(app);
  });

  test('clicking a folder without a collection config reports the failure', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('failed-coll-click-empty');
    const { app, page } = await openBrokenWorkspaceOverview(launchElectronApp, workspacePath);
    const overview = buildCommonLocators(page).workspaceOverview;

    await test.step('Click the collection card whose folder has no bruno.json', async () => {
      await expect(overview.card(EMPTY_COLL)).toBeVisible({ timeout: 10000 });
      await overview.card(EMPTY_COLL).click();
    });

    await test.step('An error toast reports the collection could not be opened', async () => {
      await expect(page.getByText(/Collection could not be opened:.*empty-coll/)).toBeVisible();
      await expect(page.locator('.request-tab').filter({ hasText: EMPTY_COLL })).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('a git-backed entry with a missing folder is Not cloned rather than Missing', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('failed-coll-ghost');
    const { app, page } = await openBrokenWorkspaceOverview(launchElectronApp, workspacePath);
    const overview = buildCommonLocators(page).workspaceOverview;

    await test.step('The card shows the Git and Not cloned badges', async () => {
      await expect(overview.notClonedBadge(GHOST_COLL)).toHaveText('Not cloned', { timeout: 10000 });
      await expect(overview.gitBadge(GHOST_COLL)).toBeVisible();
    });

    await test.step('The failure badge is not rendered alongside Not cloned', async () => {
      await expect(overview.failedBadge(GHOST_COLL)).toHaveCount(0);
    });

    await closeElectronApp(app);
  });

  test('removing a failed collection prunes it from workspace.yml without a confirmation modal', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('failed-coll-remove');
    const { app, page } = await openBrokenWorkspaceOverview(launchElectronApp, workspacePath);
    const overview = buildCommonLocators(page).workspaceOverview;

    await test.step('Choose Remove from the failed collection card menu', async () => {
      await expect(overview.card(MISSING_COLL)).toBeVisible({ timeout: 10000 });
      await selectCollectionCardMenuItem(page, MISSING_COLL, 'Remove');
    });

    await test.step('The collection is removed straight away, with no confirmation modal', async () => {
      await expect(page.getByText('Collection removed from workspace')).toBeVisible();
      await expect(page.locator('.bruno-modal-card').filter({ hasText: 'Remove Collection' })).toHaveCount(0);
      await expect(overview.card(MISSING_COLL)).toHaveCount(0, { timeout: 5000 });
    });

    await test.step('workspace.yml no longer lists the entry, and the other entries survive', async () => {
      const config = readWorkspaceYml(workspacePath);
      const names = config.collections?.map((c) => c.name);
      expect(names).not.toContain(MISSING_COLL);
      expect(names).toEqual(expect.arrayContaining([HEALTHY_COLL, EMPTY_COLL, GHOST_COLL]));
    });

    await closeElectronApp(app);
  });
});
