import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect, closeElectronApp } from '../../playwright';
import { waitForReadyPage } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

const buildWorkspaceYml = () => [
  'opencollection: 1.0.0',
  'info:',
  '  name: Docs Save Workspace',
  '  type: workspace',
  'collections:',
  'specs: []',
  'docs: \'\'',
  ''
].join('\n');

const readSavedDocs = (workspacePath: string): string => {
  const content = fs.readFileSync(path.join(workspacePath, 'workspace.yml'), 'utf-8');
  return (yaml.load(content) as { docs?: string })?.docs || '';
};

// Regression test for a stale-closure bug in DocsEditor: useEditor only re-syncs its options
// (including the Ctrl+S handler) when its [collectionPath] dep changes, so a plain re-render
// driven by new props (like WorkspaceDocs handing down a fresh onSave after every edit) left
// Ctrl+S calling the very first render's onSave, silently saving pre-edit content. Reproduced
// via Workspace docs specifically because WorkspaceDocs' onSave closes over its local `docs`
// state directly, unlike request/folder docs (which dispatch a uid-keyed thunk that always
// reads the latest Redux state regardless of which onSave closure fired) — those two paths
// are unaffected by this bug and can't reproduce it.
test.describe('Workspace Docs - Ctrl+S save freshness', () => {
  test('Ctrl+S after multiple edits persists the latest content, not an earlier render\'s', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('docs-save-userdata');
    const workspacePath = await createTmpDir('docs-save-ws');
    fs.writeFileSync(path.join(workspacePath, 'workspace.yml'), buildWorkspaceYml());
    fs.writeFileSync(
      path.join(userDataPath, 'preferences.json'),
      JSON.stringify({ preferences: { onboarding: { hasLaunchedBefore: true, hasSeenWelcomeModal: true } }, workspaces: { lastOpenedWorkspaces: [workspacePath] } }, null, 2)
    );
    fs.writeFileSync(
      path.join(userDataPath, 'ui-state-snapshot.json'),
      JSON.stringify({ version: '0.0.1', activeWorkspacePath: workspacePath, extras: { devTools: { open: false } }, workspaces: [], collections: [] }, null, 2)
    );

    const app = await launchElectronApp({ userDataPath });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    await test.step('Open the workspace Overview tab and enter edit mode', async () => {
      await page.getByText('Overview', { exact: true }).click();
      await expect(locators.docs.workspaceDocsAddBtn()).toBeVisible();
      await locators.docs.workspaceDocsAddBtn().click();
      await expect(locators.docs.proseMirror()).toBeVisible();
    });

    await test.step('Type in two separate bursts', async () => {
      const prosemirror = locators.docs.proseMirror();
      await prosemirror.click();
      await page.keyboard.type('First part.');
      await expect(prosemirror).toContainText('First part.');

      // A second, separate burst of typing forces additional re-renders of WorkspaceDocs
      // (and therefore DocsEditor) between the first edit and the Ctrl+S below.
      await page.keyboard.type(' Second part.');
      await expect(prosemirror).toContainText('First part. Second part.');
    });

    await test.step('Ctrl+S persists the fully edited content to disk', async () => {
      await page.keyboard.press('ControlOrMeta+s');
      await expect(locators.toast.byMessage('Documentation saved successfully')).toBeVisible();

      await expect(async () => {
        expect(readSavedDocs(workspacePath)).toContain('First part. Second part.');
      }).toPass({ timeout: 5000 });
    });

    await closeElectronApp(app);
  });
});
