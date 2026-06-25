import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { sendRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

// Backward-compat: v3 `bru.setEnvVar(key, value, { persist: true })` must keep
// working in v4 (always-persist semantics). The third arg is silently ignored;
// the var should still land on disk without error. Underlying behavior is unit-
// tested in packages/bruno-js/tests/runtime.spec.js — this guards the integration
// path (script → IPC → reducer → disk).
test.describe('bru.setEnvVar(name, value, { persist: true }) - legacy arg', () => {
  test('legacy persist flag is silently ignored and the var persists', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const stageBruPath = path.join(collectionFixturePath!, 'environments', 'Stage.bru');
    const locators = buildCommonLocators(page);

    await locators.sidebar.collection('collection').click();
    await locators.sidebar.collectionsContainer()
      .getByText('api-setEnvVar-with-persist', { exact: true })
      .click();

    await locators.environment.selector().click();
    await expect(locators.environment.listOption('Stage')).toBeVisible();
    await locators.environment.listOption('Stage').click();
    await expect(locators.environment.currentEnvironment()).toContainText('Stage');

    // 200 confirms the pre-request script did not throw on the legacy 3rd arg.
    await sendRequest(page, 200);

    await expect
      .poll(() => fs.readFileSync(stageBruPath, 'utf8'), { timeout: 5000 })
      .toMatch(/legacy_persist_var:\s*from-legacy-flag/);
  });
});
