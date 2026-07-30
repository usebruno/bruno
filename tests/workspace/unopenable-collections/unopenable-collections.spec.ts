import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import { switchWorkspace, waitForReadyPage, buildCommonLocators } from '../../utils/page';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixturePath = path.join(__dirname, 'fixtures', 'workspace-with-broken-collections');

const WORKSPACE_NAME = 'Broken WS';
const HEALTHY_COLL = 'Healthy Coll';

test.describe('Collections that cannot be opened', () => {
  test('switching into the workspace reports how many collections failed to open', async ({ launchElectronApp, createTmpDir }) => {
    const workspacePath = await createTmpDir('unopenable-coll-toast');
    await fs.promises.cp(fixturePath, workspacePath, { recursive: true });

    const app = await launchElectronApp({ initUserDataPath, templateVars: { workspacePath } });
    const page = await waitForReadyPage(app);
    const { toast, sidebar } = buildCommonLocators(page);

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
});
