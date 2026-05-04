import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp } from '../../../playwright';
import { switchWorkspace, createCollection } from '../../utils/page';

type CollectionEntry = { name?: string; path?: string; remote?: string };
type WorkspaceConfig = { collections?: CollectionEntry[] };

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixturesPath = path.join(__dirname, 'fixtures');

const REMOTE_URL = 'https://github.com/usebruno/sample-collection.git';

const FIXTURE_WS_NAME = 'Fixture WS';
const GHOST_WS_NAME = 'Ghost WS';
const SAMPLE_COLL_GITIGNORE_LINE = 'collections/sample-coll/';

async function copyFixture(fixtureName: string, destDir: string): Promise<string> {
  const src = path.join(fixturesPath, fixtureName);
  await fs.promises.cp(src, destDir, { recursive: true });
  return destDir;
}

function readWorkspaceYml(workspacePath: string): WorkspaceConfig {
  const raw = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf8');
  return yaml.load(raw) as WorkspaceConfig;
}

function readGitignoreLines(workspacePath: string): string[] {
  const gitignorePath = path.join(workspacePath, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];
  return fs.readFileSync(gitignorePath, 'utf8').split('\n');
}

test.describe('Git-backed collections', () => {
  test.describe('Workspace overview', () => {
    test('connect to Git updates workspace.yml, shows badge + remote URL, and adds .gitignore entry', async ({ launchElectronApp, createTmpDir }) => {
      const workspacePath = await createTmpDir('git-ws-connect');
      await copyFixture('workspace-with-collection', workspacePath);

      const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await switchWorkspace(page, FIXTURE_WS_NAME);

      await test.step('Navigate to workspace overview', async () => {
        await page.locator('.titlebar-left .home-button').click();
      });

      const card = page.locator('.collection-card').filter({ hasText: 'SampleColl' });

      await test.step('Open Connect to Git modal from collection menu', async () => {
        await card.waitFor({ state: 'visible', timeout: 5000 });
        await card.locator('.collection-menu').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Connect to Git' }).click();
      });

      await test.step('Submit the modal with a Git URL', async () => {
        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Connect to Git' });
        await modal.waitFor({ state: 'visible', timeout: 5000 });
        await modal.locator('#remoteUrl').fill(REMOTE_URL);
        await modal.getByRole('button', { name: 'Connect', exact: true }).click();
        await expect(page.getByText('Git remote connected')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Verify Git badge and remote URL render on the card', async () => {
        await expect(card.locator('.collection-remote')).toContainText(REMOTE_URL, { timeout: 5000 });
        await expect(card.getByText('Git', { exact: true })).toBeVisible();
      });

      await test.step('Verify workspace.yml records the remote on the matching entry', async () => {
        const config = readWorkspaceYml(workspacePath);
        const entry = config.collections?.find((c) => c.name === 'SampleColl');
        expect(entry?.remote).toBe(REMOTE_URL);
      });

      await test.step('Verify .gitignore contains the collection path', async () => {
        expect(readGitignoreLines(workspacePath)).toContain(SAMPLE_COLL_GITIGNORE_LINE);
      });

      await closeElectronApp(app);
    });

    test('remove Git remote clears the badge, the workspace.yml field, and the .gitignore line', async ({ launchElectronApp, createTmpDir }) => {
      const workspacePath = await createTmpDir('git-ws-disconnect');
      await copyFixture('workspace-with-collection', workspacePath);

      const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await switchWorkspace(page, FIXTURE_WS_NAME);

      const card = page.locator('.collection-card').filter({ hasText: 'SampleColl' });

      await test.step('Connect the collection to Git first', async () => {
        await page.locator('.titlebar-left .home-button').click();
        await card.locator('.collection-menu').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Connect to Git' }).click();

        const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Connect to Git' });
        await modal.locator('#remoteUrl').fill(REMOTE_URL);
        await modal.getByRole('button', { name: 'Connect', exact: true }).click();
        await expect(page.getByText('Git remote connected')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Open Remove Git Remote modal', async () => {
        await card.locator('.collection-menu').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Remove Git Remote' }).click();

        const removeModal = page.locator('.bruno-modal-card').filter({ hasText: 'Remove Git Remote' });
        await removeModal.waitFor({ state: 'visible', timeout: 5000 });
        await removeModal.getByRole('button', { name: 'Remove', exact: true }).click();
        await expect(page.getByText('Git remote removed')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Verify badge and remote URL line are gone from the card', async () => {
        await expect(card.locator('.collection-remote')).toHaveCount(0, { timeout: 5000 });
        await expect(card.getByText('Git', { exact: true })).toHaveCount(0);
      });

      await test.step('Verify workspace.yml no longer carries the remote field', async () => {
        const config = readWorkspaceYml(workspacePath);
        const entry = config.collections?.find((c) => c.name === 'SampleColl');
        expect(entry).toBeDefined();
        expect(entry?.remote).toBeUndefined();
      });

      await test.step('Verify .gitignore no longer contains the collection path', async () => {
        expect(readGitignoreLines(workspacePath)).not.toContain(SAMPLE_COLL_GITIGNORE_LINE);
      });

      await closeElectronApp(app);
    });

    test('Connect to Git modal rejects empty and invalid URLs', async ({ launchElectronApp, createTmpDir }) => {
      const workspacePath = await createTmpDir('git-ws-validation');
      await copyFixture('workspace-with-collection', workspacePath);

      const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await switchWorkspace(page, FIXTURE_WS_NAME);

      await test.step('Open Connect to Git modal', async () => {
        await page.locator('.titlebar-left .home-button').click();
        const card = page.locator('.collection-card').filter({ hasText: 'SampleColl' });
        await card.locator('.collection-menu').click();
        await page.locator('.dropdown-item').filter({ hasText: 'Connect to Git' }).click();
      });

      const modal = page.locator('.bruno-modal-card').filter({ hasText: 'Connect to Git' });

      await test.step('Empty URL should show validation error and keep modal open', async () => {
        await modal.waitFor({ state: 'visible', timeout: 5000 });
        await modal.locator('#remoteUrl').fill('');
        await modal.getByRole('button', { name: 'Connect', exact: true }).click();

        await expect(modal.locator('.text-red-500').first()).toBeVisible({ timeout: 2000 });
        await expect(modal).toBeVisible();
      });

      await test.step('Malformed URL should also be rejected', async () => {
        await modal.locator('#remoteUrl').fill('not-a-url');
        await modal.getByRole('button', { name: 'Connect', exact: true }).click();

        await expect(modal.locator('.text-red-500').first()).toBeVisible({ timeout: 2000 });
        await expect(modal).toBeVisible();
      });

      await test.step('Valid URL submits successfully', async () => {
        await modal.locator('#remoteUrl').fill(REMOTE_URL);
        await modal.getByRole('button', { name: 'Connect', exact: true }).click();
        await expect(page.getByText('Git remote connected')).toBeVisible({ timeout: 10000 });
        await expect(modal).not.toBeVisible({ timeout: 5000 });
      });

      await closeElectronApp(app);
    });

    test('default workspace does not expose Git options on the collection card', async ({ launchElectronApp, createTmpDir }) => {
      // No fixture: the playwright fixture default-seeds preferences to skip onboarding,
      // and Bruno auto-creates the default workspace under the userData path.
      const collectionDir = await createTmpDir('git-default-coll');

      const app = await launchElectronApp();
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await test.step('Verify we are on the default workspace', async () => {
        await expect(page.getByTestId('workspace-name')).toHaveText('My Workspace', { timeout: 5000 });
      });

      await test.step('Create a collection in the default workspace', async () => {
        await createCollection(page, 'DefaultColl', collectionDir);
      });

      await test.step('Open the collection menu in the workspace overview', async () => {
        await page.locator('.titlebar-left .home-button').click();
        const card = page.locator('.collection-card').filter({ hasText: 'DefaultColl' });
        await card.waitFor({ state: 'visible', timeout: 5000 });
        await card.locator('.collection-menu').click();
      });

      await test.step('No Git-related menu items should be visible', async () => {
        await expect(page.locator('.dropdown-item').filter({ hasText: 'Connect to Git' })).toHaveCount(0);
        await expect(page.locator('.dropdown-item').filter({ hasText: 'Copy Git URL' })).toHaveCount(0);
        await expect(page.locator('.dropdown-item').filter({ hasText: 'Remove Git Remote' })).toHaveCount(0);
      });

      await closeElectronApp(app);
    });
  });

  test.describe('Sidebar ghost row', () => {
    test('git-backed entry whose folder is missing renders as a clickable ghost row', async ({ launchElectronApp, createTmpDir }) => {
      const workspacePath = await createTmpDir('git-ws-ghost');
      await copyFixture('workspace-with-ghost', workspacePath);

      const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await switchWorkspace(page, GHOST_WS_NAME);

      const ghostRow = page.getByTestId('sidebar-git-collection-row').filter({ hasText: 'Missing Coll' });

      await test.step('Ghost row appears in the sidebar', async () => {
        await expect(ghostRow).toBeVisible({ timeout: 10000 });
      });

      await test.step('Ghost row is not also rendered as a normal sidebar collection row', async () => {
        await expect(
          page.getByTestId('sidebar-collection-row').filter({ hasText: 'Missing Coll' })
        ).toHaveCount(0);
      });

      await test.step('Clicking the ghost row opens the Clone Git Repository modal pre-filled with the remote URL', async () => {
        await ghostRow.click();
        const cloneModal = page.locator('.bruno-modal-card').filter({ hasText: 'Clone' });
        await cloneModal.waitFor({ state: 'visible', timeout: 5000 });
        await expect(cloneModal).toContainText(REMOTE_URL);
      });

      await closeElectronApp(app);
    });

    test('right-clicking a ghost row exposes Remove Git Remote, which prunes both the entry and the row', async ({ launchElectronApp, createTmpDir }) => {
      const workspacePath = await createTmpDir('git-ws-ghost-remove');
      await copyFixture('workspace-with-ghost', workspacePath);

      const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
      const page = await app.firstWindow();
      await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      await switchWorkspace(page, GHOST_WS_NAME);

      const ghostRow = page.getByTestId('sidebar-git-collection-row').filter({ hasText: 'Missing Coll' });

      await test.step('Wait for the ghost row to appear', async () => {
        await expect(ghostRow).toBeVisible({ timeout: 10000 });
      });

      await test.step('Right-click the ghost row and choose Remove Git Remote', async () => {
        await ghostRow.click({ button: 'right' });
        await page.locator('.dropdown-item').filter({ hasText: 'Remove Git Remote' }).click();

        const removeModal = page.locator('.bruno-modal-card').filter({ hasText: 'Remove Git Remote' });
        await removeModal.waitFor({ state: 'visible', timeout: 5000 });
        await removeModal.getByRole('button', { name: 'Remove', exact: true }).click();
        await expect(page.getByText('Git remote removed')).toBeVisible({ timeout: 10000 });
      });

      await test.step('Ghost row disappears once the remote field is removed', async () => {
        await expect(ghostRow).toHaveCount(0, { timeout: 5000 });
      });

      await test.step('workspace.yml entry persists but no longer has the remote field', async () => {
        const config = readWorkspaceYml(workspacePath);
        const entry = config.collections?.find((c) => c.name === 'Missing Coll');
        expect(entry).toBeDefined();
        expect(entry?.remote).toBeUndefined();
      });

      await closeElectronApp(app);
    });
  });
});
