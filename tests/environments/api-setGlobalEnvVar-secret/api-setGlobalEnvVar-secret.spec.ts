import path from 'path';
import fs from 'fs';
import { test, expect, closeElectronApp } from '../../../playwright';
import {
  openCollection,
  openRequest,
  sendRequest,
  selectEnvironment,
  expectResponseContains,
  waitForReadyPage,
  openEnvironmentConfigTab,
  closeEnvironmentPanel
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';
import { waitForCollectionMount } from '../../utils/page/mounting';

const NEW_VALUE = 'NEW_VALUE_global_env_e2e_42';
const INITIAL_VALUE = 'INITIAL_VALUE_global_env_e2e_001';
const initUserDataPath = path.join(__dirname, 'init-user-data');
const workspaceFixturePath = path.join(__dirname, 'fixtures', 'workspace');

const findApiTokenSecret = (secretsJson: any, workspaceDir: string) => {
  const collection = secretsJson.collections?.find((c: any) =>
    path.normalize(c.path) === path.normalize(workspaceDir)
  );
  const env = collection?.environments?.find((e: any) => e.name === 'Local');
  return env?.secrets?.find((s: any) => s.name === 'apiToken');
};

test.describe('bru.setGlobalEnvVar(name, value) - secret variable persistence (workspace mode)', () => {
  test('script-set global secret encrypts to the secrets store and reaches a subsequent request via interpolation', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('userdata');
    const workspacePath = await createTmpDir('workspace');
    await fs.promises.cp(workspaceFixturePath, workspacePath, { recursive: true });

    const envFilePath = path.join(workspacePath, 'environments', 'Local.yml');
    const secretsPath = path.join(userDataPath, 'secrets.json');

    await test.step('Fixture sanity: global env yml declares apiToken as secret; no secrets store yet', () => {
      const initial = fs.readFileSync(envFilePath, 'utf8');
      expect(initial).toMatch(/name:\s*apiToken/);
      expect(initial).toMatch(/secret:\s*true/);
      expect(initial).not.toContain(NEW_VALUE);
      expect(fs.existsSync(secretsPath)).toBe(false);
    });

    const app = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    try {
      await test.step('Open the setter request and select the "Local" global environment', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        // `persist: true` (double-click) pins the tab — otherwise opening the env config
        // tab below replaces this preview tab, and the subsequent sendRequest has no target.
        await openRequest(page, 'Test Collection', 'set-global-secret', { persist: true });
        await selectEnvironment(page, 'Local', 'global');
      });

      await test.step('Global env panel BEFORE script: eye toggle reveals an empty initial value', async () => {
        await openEnvironmentConfigTab(page, 'global');
        const envTab = locators.environment.globalEnvTab();
        await locators.environment.secretsTab().click();
        await expect(locators.environment.varRow('apiToken')).toBeVisible();

        await locators.environment.varRowEyeToggle('apiToken').click();
        await expect(locators.environment.varRow('apiToken').locator('.CodeMirror').first())
          .toHaveClass(/CodeMirror-empty/);
        await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
          .not.toContainText(NEW_VALUE);

        await closeEnvironmentPanel(page, 'global');
      });

      await test.step('Run the request whose post-response script sets apiToken', async () => {
        await sendRequest(page, 200);
      });

      await test.step('On-disk global env .yml: never contains plaintext', async () => {
        await expect.poll(() => fs.readFileSync(envFilePath, 'utf8'), { timeout: 5000 })
          .toMatch(/name:\s*apiToken/);
        const content = fs.readFileSync(envFilePath, 'utf8');
        expect(content).not.toContain(NEW_VALUE);
        expect(content).toMatch(/secret:\s*true/);
      });

      await test.step('Secrets store: encrypted apiToken entry is persisted under this workspace', async () => {
        await expect.poll(() => fs.existsSync(secretsPath), { timeout: 5000 }).toBe(true);
        await expect.poll(() => {
          const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), workspacePath);
          return secret?.value ?? '';
        }, { timeout: 5000 }).not.toBe('');

        const secretsJson = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        const secret = findApiTokenSecret(secretsJson, workspacePath);
        expect(secret).toBeDefined();
        expect(typeof secret!.value).toBe('string');
        expect(secret!.value.length).toBeGreaterThan(0);
        expect(secret!.value).not.toContain(NEW_VALUE);
        expect(JSON.stringify(secretsJson)).not.toContain(NEW_VALUE);
        expect(fs.readFileSync(envFilePath, 'utf8')).not.toContain(secret!.value);
      });

      await test.step('Global env panel AFTER script: eye toggle reveals NEW_VALUE, no draft icon', async () => {
        await openEnvironmentConfigTab(page, 'global');
        const envTab = locators.environment.globalEnvTab();
        await locators.environment.secretsTab().click();
        await expect(locators.environment.varRow('apiToken')).toBeVisible();
        await expect(envTab.locator('.close-gradient')).not.toHaveClass(/has-changes/);

        await locators.environment.varRowEyeToggle('apiToken').click();
        await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
          .toContainText(NEW_VALUE);

        await closeEnvironmentPanel(page, 'global');
      });

      await test.step('Interpolation: a subsequent request resolves {{apiToken}} to the new value', async () => {
        await openRequest(page, 'Test Collection', 'read-global-secret', { persist: true });
        await sendRequest(page, 200);
        await expectResponseContains(page, [NEW_VALUE]);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('script overwrites a previously-set global secret, encrypted store entry changes', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('userdata');
    const workspacePath = await createTmpDir('workspace');
    await fs.promises.cp(workspaceFixturePath, workspacePath, { recursive: true });

    const envFilePath = path.join(workspacePath, 'environments', 'Local.yml');
    const secretsPath = path.join(userDataPath, 'secrets.json');

    const app = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    const page = await waitForReadyPage(app);
    const locators = buildCommonLocators(page);

    try {
      await test.step('Open seed-global-secret and select the "Local" global environment', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await openRequest(page, 'Test Collection', 'seed-global-secret', { persist: true });
        await selectEnvironment(page, 'Local', 'global');
      });

      await test.step('Seed: post-response script sets apiToken to INITIAL_VALUE', async () => {
        await sendRequest(page, 200);
      });

      let initialEncryptedValue = '';
      await test.step('After seed: global env panel shows INITIAL_VALUE; encrypted entry persisted', async () => {
        await openEnvironmentConfigTab(page, 'global');
        const envTab = locators.environment.globalEnvTab();
        await locators.environment.secretsTab().click();
        await expect(locators.environment.varRow('apiToken')).toBeVisible();
        await locators.environment.varRowEyeToggle('apiToken').click();
        await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
          .toContainText(INITIAL_VALUE);
        await closeEnvironmentPanel(page, 'global');

        await expect.poll(() => fs.existsSync(secretsPath), { timeout: 5000 }).toBe(true);
        await expect.poll(() => {
          const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), workspacePath);
          return secret?.value ?? '';
        }, { timeout: 5000 }).not.toBe('');

        const secretsJson = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        const secret = findApiTokenSecret(secretsJson, workspacePath);
        expect(secret!.value).not.toContain(INITIAL_VALUE);
        expect(JSON.stringify(secretsJson)).not.toContain(INITIAL_VALUE);
        expect(fs.readFileSync(envFilePath, 'utf8')).not.toContain(secret!.value);
        initialEncryptedValue = secret!.value;
      });

      await test.step('Overwrite: open set-global-secret and run it (NEW_VALUE replaces INITIAL_VALUE)', async () => {
        await openRequest(page, 'Test Collection', 'set-global-secret', { persist: true });
        await sendRequest(page, 200);
      });

      await test.step('After overwrite: panel shows NEW_VALUE (not INITIAL_VALUE); encrypted entry changed; .yml still clean', async () => {
        await openEnvironmentConfigTab(page, 'global');
        const envTab = locators.environment.globalEnvTab();
        await locators.environment.secretsTab().click();
        await expect(locators.environment.varRow('apiToken')).toBeVisible();
        await expect(envTab.locator('.close-gradient')).not.toHaveClass(/has-changes/);

        await locators.environment.varRowEyeToggle('apiToken').click();
        await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
          .toContainText(NEW_VALUE);
        await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
          .not.toContainText(INITIAL_VALUE);
        await closeEnvironmentPanel(page, 'global');

        // Encrypted blob on disk changed — proves the secrets store was rewritten, not stale-cached.
        await expect.poll(() => {
          const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), workspacePath);
          return secret?.value;
        }, { timeout: 5000 }).not.toBe(initialEncryptedValue);

        const secretsJson = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
        const secret = findApiTokenSecret(secretsJson, workspacePath);
        expect(secret!.value).not.toContain(NEW_VALUE);
        expect(secret!.value.length).toBeGreaterThan(0);
        expect(JSON.stringify(secretsJson)).not.toContain(NEW_VALUE);
        expect(JSON.stringify(secretsJson)).not.toContain(INITIAL_VALUE);

        const content = fs.readFileSync(envFilePath, 'utf8');
        expect(content).not.toContain(NEW_VALUE);
        expect(content).not.toContain(INITIAL_VALUE);
        expect(content).not.toContain(secret!.value);
        expect(content).toMatch(/secret:\s*true/);
      });

      await test.step('Interpolation: a subsequent request resolves {{apiToken}} to NEW_VALUE', async () => {
        await openRequest(page, 'Test Collection', 'read-global-secret', { persist: true });
        await sendRequest(page, 200);
        await expectResponseContains(page, [NEW_VALUE]);
      });
    } finally {
      await closeElectronApp(app);
    }
  });

  test('persisted global secret survives app restart and decrypts on the next launch', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    const userDataPath = await createTmpDir('userdata');
    const workspacePath = await createTmpDir('workspace');
    await fs.promises.cp(workspaceFixturePath, workspacePath, { recursive: true });

    const secretsPath = path.join(userDataPath, 'secrets.json');

    let blobBeforeRestart = '';
    const firstApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    try {
      const page = await waitForReadyPage(firstApp);

      await test.step('First launch: run set-global-secret and confirm the encrypted blob is on disk', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await openRequest(page, 'Test Collection', 'set-global-secret', { persist: true });
        await selectEnvironment(page, 'Local', 'global');
        await sendRequest(page, 200);

        await expect.poll(() => fs.existsSync(secretsPath), { timeout: 5000 }).toBe(true);
        await expect.poll(() => {
          const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), workspacePath);
          return secret?.value ?? '';
        }, { timeout: 5000 }).not.toBe('');

        const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), workspacePath);
        blobBeforeRestart = secret!.value;
      });
    } finally {
      await closeElectronApp(firstApp);
    }

    const secondApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { workspacePath }
    });
    try {
      const page = await waitForReadyPage(secondApp);

      await test.step('Second launch: encrypted blob unchanged on disk', async () => {
        const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), workspacePath);
        expect(secret!.value).toBe(blobBeforeRestart);
      });

      await test.step('Decryption round-trip: read-global-secret interpolates {{apiToken}} to the original plaintext', async () => {
        await waitForCollectionMount(page, 'Test Collection');
        await openCollection(page, 'Test Collection');
        await selectEnvironment(page, 'Local', 'global');
        await openRequest(page, 'Test Collection', 'read-global-secret', { persist: true });
        await sendRequest(page, 200);
        await expectResponseContains(page, [NEW_VALUE]);
      });
    } finally {
      await closeElectronApp(secondApp);
    }
  });
});
