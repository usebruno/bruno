import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  openCollection,
  openRequest,
  sendRequest,
  selectEnvironment,
  waitForReadyPage
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { waitForCollectionMount } from '../../utils/page/mounting';

const initUserDataPath = path.join(__dirname, 'init-user-data');
const workspaceFixturePath = path.join(__dirname, 'fixtures', 'workspace');

test.describe('bru.setGlobalEnvVar(name, value) - typed value persistence (workspace mode)', () => {
  test('persists number/boolean/object/string global vars with correct dataType across restart', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('userdata');
    const workspacePath = await createTmpDir('workspace');
    await fs.promises.cp(workspaceFixturePath, workspacePath, { recursive: true });

    const envFilePath = path.join(workspacePath, 'environments', 'Local.yml');

    const firstApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    try {
      const page = await waitForReadyPage(firstApp);

      await test.step('First launch: run set-typed-global-vars; Local.yml gains typed entries with `type` annotations', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await openRequest(page, 'Test Collection', 'set-typed-global-vars', { persist: true });
        await selectEnvironment(page, 'Local', 'global');
        await sendRequest(page, 200);

        // The YAML serializer emits typed values as { value: { type, data } } objects —
        // see packages/bruno-filestore/src/formats/yml/common/datatype.ts:34.
        await expect.poll(() => fs.readFileSync(envFilePath, 'utf8'), { timeout: 5000 })
          .toMatch(/name:\s*global_num[\s\S]*?type:\s*number[\s\S]*?data:\s*['"]?42/);
        const content = fs.readFileSync(envFilePath, 'utf8');

        expect(content).toMatch(/name:\s*global_bool[\s\S]*?type:\s*boolean[\s\S]*?data:\s*['"]?true/);
        expect(content).toMatch(/name:\s*global_obj[\s\S]*?type:\s*object[\s\S]*?data:[\s\S]*?scope/);
        // 'string' is the implicit default — the serializer emits a raw string value, no `type:` block.
        expect(content).toMatch(/name:\s*global_str[\s\S]*?value:\s*hello/);
        expect(content).not.toMatch(/name:\s*global_str[\s\S]*?type:\s*string/);
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

      await test.step('Second launch: Local.yml on disk is byte-identical to pre-restart', () => {
        expect(fs.readFileSync(envFilePath, 'utf8')).toBe(contentBeforeRestart);
      });

      await test.step('Second launch: the global env editor reflects the persisted dataTypes', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await selectEnvironment(page, 'Local', 'global');

        // Open the Global Environments config tab via the env selector → configure button.
        const locators = buildCommonLocators(page);
        await locators.environment.selector().click();
        await locators.environment.globalTab().click();
        await locators.environment.configureButton().waitFor({ state: 'visible' });
        await locators.environment.configureButton().dispatchEvent('click');
        await expect(locators.environment.globalEnvTab()).toBeVisible();

        const numRow = locators.environment.variableRowByName('global_num');
        const boolRow = locators.environment.variableRowByName('global_bool');
        const objRow = locators.environment.variableRowByName('global_obj');
        const strRow = locators.environment.variableRowByName('global_str');

        await expect(numRow).toBeVisible();
        await expect(locators.dataTypeSelector.typeLabel(numRow)).toHaveText('number', { timeout: 5000 });
        await expect(locators.dataTypeSelector.typeLabel(boolRow)).toHaveText('boolean');
        await expect(locators.dataTypeSelector.typeLabel(objRow)).toHaveText('object');
        await expect(locators.dataTypeSelector.typeLabel(strRow)).toHaveText('string');
      });
    } finally {
      await closeElectronApp(secondApp);
    }
  });
});
