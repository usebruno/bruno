import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  openCollection,
  openRequest,
  sendRequest,
  selectEnvironment,
  expectResponseContains,
  waitForReadyPage
} from '../../utils/page';
import { waitForCollectionMount } from '../../utils/page/mounting';

const NEW_VALUE = 'VALUE_global_nonsecret_e2e_42';
const initUserDataPath = path.join(__dirname, 'init-user-data');
const workspaceFixturePath = path.join(__dirname, 'fixtures', 'workspace');

test.describe('bru.setGlobalEnvVar(name, value) - non-secret variable persistence (workspace mode)', () => {
  test('persisted non-secret global var survives app restart and interpolates on the next launch', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('userdata');
    const workspacePath = await createTmpDir('workspace');
    await fs.promises.cp(workspaceFixturePath, workspacePath, { recursive: true });

    const envFilePath = path.join(workspacePath, 'environments', 'Local.yml');

    await test.step('Fixture sanity: global env yml declares globalToken (non-secret) with empty value', () => {
      const initial = fs.readFileSync(envFilePath, 'utf8');
      expect(initial).toMatch(/name:\s*globalToken/);
      expect(initial).toMatch(/secret:\s*false/);
      expect(initial).not.toContain(NEW_VALUE);
    });

    const firstApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    try {
      const page = await waitForReadyPage(firstApp);

      await test.step('First launch: run set-global-var; non-secret value is written into the env yml on disk', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await openRequest(page, 'Test Collection', 'set-global-var', { persist: true });
        await selectEnvironment(page, 'Local', 'global');
        await sendRequest(page, 200);

        await expect.poll(() => fs.readFileSync(envFilePath, 'utf8'), { timeout: 5000 })
          .toContain(NEW_VALUE);
        const content = fs.readFileSync(envFilePath, 'utf8');
        expect(content).toMatch(/name:\s*globalToken/);
      });
    } finally {
      await closeElectronApp(firstApp);
    }

    const contentBeforeRestart = fs.readFileSync(envFilePath, 'utf8');

    const secondApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    try {
      const page = await waitForReadyPage(secondApp);

      await test.step('Second launch: env yml on disk is byte-identical to pre-restart', () => {
        expect(fs.readFileSync(envFilePath, 'utf8')).toBe(contentBeforeRestart);
      });

      await test.step('Interpolation after restart: read-global-var resolves {{globalToken}} to the persisted value', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await selectEnvironment(page, 'Local', 'global');
        await openRequest(page, 'Test Collection', 'read-global-var', { persist: true });
        await sendRequest(page, 200);
        await expectResponseContains(page, [NEW_VALUE]);
      });
    } finally {
      await closeElectronApp(secondApp);
    }
  });
});
