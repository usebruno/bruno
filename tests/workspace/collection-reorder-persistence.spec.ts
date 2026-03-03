import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { test, expect } from '../../playwright';
import { createCollection } from '../utils/page';

type WorkspaceConfig = { collections?: { name: string }[] };

test.describe('Collection reorder persistence', () => {
  test('reordered collection order persists after app restart', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('collection-reorder-persistence');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create two collections', async () => {
      await createCollection(page, 'ColA', colAPath);
      await createCollection(page, 'ColB', colBPath);
    });

    await test.step('Verify initial order is ColA then ColB', async () => {
      const rows = page.getByTestId('sidebar-collection-row');
      await expect(rows.nth(0)).toContainText('ColA');
      await expect(rows.nth(1)).toContainText('ColB');
    });

    await test.step('Drag ColB above ColA', async () => {
      const rows = page.getByTestId('sidebar-collection-row');
      await rows.nth(1).dragTo(rows.nth(0), { targetPosition: { x: 5, y: 5 } });
    });

    await test.step('Verify order is ColB then ColA', async () => {
      const rows = page.getByTestId('sidebar-collection-row');
      await expect(rows.nth(0)).toContainText('ColB');
      await expect(rows.nth(1)).toContainText('ColA');
    });

    await test.step('Close app', async () => {
      await app.context().close();
      await app.close();
    });

    await test.step('Restart app and verify order persisted', async () => {
      const app2 = await launchElectronApp({ userDataPath });
      const page2 = await app2.firstWindow();
      await page2.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

      const rows2 = page2.getByTestId('sidebar-collection-row');
      await expect(rows2.nth(0)).toContainText('ColB');
      await expect(rows2.nth(1)).toContainText('ColA');

      await app2.context().close();
      await app2.close();
    });
  });

  test('workspace.yml reflects reordered collection order', async ({ launchElectronApp, createTmpDir }) => {
    const userDataPath = await createTmpDir('collection-reorder-yml');
    const colAPath = await createTmpDir('col-a');
    const colBPath = await createTmpDir('col-b');

    const app = await launchElectronApp({ userDataPath });
    const page = await app.firstWindow();
    await page.locator('[data-app-state="loaded"]').waitFor({ timeout: 30000 });

    await test.step('Create two collections', async () => {
      await createCollection(page, 'ColA', colAPath);
      await createCollection(page, 'ColB', colBPath);
    });

    await test.step('Drag ColB above ColA', async () => {
      const rows = page.getByTestId('sidebar-collection-row');
      await rows.nth(1).dragTo(rows.nth(0), { targetPosition: { x: 5, y: 5 } });
    });

    await test.step('Close app', async () => {
      await app.context().close();
      await app.close();
    });

    await test.step('Verify workspace.yml has ColB before ColA', async () => {
      const workspacePath = path.join(userDataPath, 'default-workspace');
      const ymlPath = path.join(workspacePath, 'workspace.yml');
      expect(fs.existsSync(ymlPath)).toBe(true);
      const config = yaml.load(fs.readFileSync(ymlPath, 'utf8')) as WorkspaceConfig | undefined;
      const names = (config?.collections ?? []).map((c) => c.name);
      expect(names).toEqual(['ColB', 'ColA']);
    });
  });
});
