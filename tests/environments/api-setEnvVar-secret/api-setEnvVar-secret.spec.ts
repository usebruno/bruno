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

const NEW_VALUE = 'NEW_VALUE_collection_env_e2e_42';
const INITIAL_VALUE = 'INITIAL_VALUE_collection_env_e2e_001';
const initUserDataPath = path.join(__dirname, 'init-user-data');
const fixturesPath = path.join(__dirname, 'fixtures', 'collections');

type Format = {
  label: 'bru' | 'yml';
  subdir: string;
  collectionName: string;
  envFile: string;
  expectInitial: (content: string) => void;
  expectAfterScript: (content: string) => void;
  envSettlePattern: RegExp;
};

const FORMATS: Format[] = [
  {
    label: 'bru',
    subdir: 'bru',
    collectionName: 'api-setEnvVar-secret-bru',
    envFile: 'Local.bru',
    envSettlePattern: /vars:secret\s*\[[^\]]*apiToken/,
    expectInitial: (content) => {
      expect(content).toMatch(/vars:secret\s*\[[^\]]*apiToken/);
      expect(content).not.toContain(NEW_VALUE);
    },
    expectAfterScript: (content) => {
      expect(content).toMatch(/vars:secret\s*\[[^\]]*apiToken/);
      expect(content).not.toContain(NEW_VALUE);
      expect(content).not.toMatch(/^\s*apiToken\s*:/m);
    }
  },
  {
    label: 'yml',
    subdir: 'yml',
    collectionName: 'api-setEnvVar-secret-yml',
    envFile: 'Local.yml',
    envSettlePattern: /name:\s*apiToken/,
    expectInitial: (content) => {
      expect(content).toMatch(/name:\s*apiToken/);
      expect(content).toMatch(/secret:\s*true/);
      expect(content).not.toContain(NEW_VALUE);
    },
    expectAfterScript: (content) => {
      expect(content).toMatch(/name:\s*apiToken/);
      expect(content).toMatch(/secret:\s*true/);
      expect(content).not.toContain(NEW_VALUE);
    }
  }
];

const findApiTokenSecret = (secretsJson: any, collectionDir: string) => {
  const collection = secretsJson.collections?.find((c: any) =>
    path.normalize(c.path) === path.normalize(collectionDir)
  );
  const env = collection?.environments?.find((e: any) => e.name === 'Local');
  return env?.secrets?.find((s: any) => s.name === 'apiToken');
};

test.describe('bru.setEnvVar(name, value) - secret variable persistence', () => {
  for (const fmt of FORMATS) {
    test(`(${fmt.label}) script-set secret encrypts to the secrets store and reaches a subsequent request via interpolation`, async ({
      launchElectronApp,
      createTmpDir
    }) => {
      const userDataPath = await createTmpDir('userdata');
      const collectionPath = await createTmpDir('collections');
      await fs.promises.cp(fixturesPath, collectionPath, { recursive: true });

      const envFilePath = path.join(collectionPath, fmt.subdir, 'environments', fmt.envFile);
      const secretsPath = path.join(userDataPath, 'secrets.json');
      const collectionDir = path.join(collectionPath, fmt.subdir);

      await test.step('Fixture sanity: env file declares apiToken as secret with no value; no secrets store yet', () => {
        fmt.expectInitial(fs.readFileSync(envFilePath, 'utf8'));
        expect(fs.existsSync(secretsPath)).toBe(false);
      });

      const app = await launchElectronApp({
        initUserDataPath,
        userDataPath,
        templateVars: { collectionPath }
      });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      try {
        await test.step('Open the setter request and select the "Local" environment', async () => {
          await waitForCollectionMount(page, fmt.collectionName);
          await openCollection(page, fmt.collectionName);
          await openRequest(page, fmt.collectionName, 'set-secret', { persist: true });
          await selectEnvironment(page, 'Local', 'collection');
        });

        await test.step('Env panel BEFORE script: eye toggle reveals an empty initial value', async () => {
          await openEnvironmentConfigTab(page, 'collection');
          const envTab = locators.environment.collectionEnvTab();
          await locators.environment.secretsTab().click();
          await expect(locators.environment.varRow('apiToken')).toBeVisible();

          await locators.environment.varRowEyeToggle('apiToken').click();
          await expect(locators.environment.varRow('apiToken').locator('.CodeMirror').first())
            .toHaveClass(/CodeMirror-empty/);
          await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
            .not.toContainText(NEW_VALUE);

          await closeEnvironmentPanel(page, 'collection');
        });

        await test.step('Run the request whose post-response script sets apiToken', async () => {
          await sendRequest(page, 200);
        });

        await test.step('On-disk env file: secret value is never written; secret marker preserved', async () => {
          await expect.poll(() => fs.readFileSync(envFilePath, 'utf8'), { timeout: 5000 })
            .toMatch(fmt.envSettlePattern);
          fmt.expectAfterScript(fs.readFileSync(envFilePath, 'utf8'));
        });

        await test.step('Secrets store: encrypted apiToken entry is persisted under this collection', async () => {
          await expect.poll(() => fs.existsSync(secretsPath), { timeout: 5000 }).toBe(true);
          await expect.poll(() => {
            const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), collectionDir);
            return secret?.value ?? '';
          }, { timeout: 5000 }).not.toBe('');

          const secretsJson = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
          const secret = findApiTokenSecret(secretsJson, collectionDir);
          expect(secret).toBeDefined();
          expect(typeof secret!.value).toBe('string');
          expect(secret!.value.length).toBeGreaterThan(0);
          expect(secret!.value).not.toContain(NEW_VALUE);
          expect(JSON.stringify(secretsJson)).not.toContain(NEW_VALUE);
          expect(fs.readFileSync(envFilePath, 'utf8')).not.toContain(secret!.value);
        });

        await test.step('Env panel AFTER script: eye toggle reveals NEW_VALUE, no draft icon', async () => {
          await openEnvironmentConfigTab(page, 'collection');
          const envTab = locators.environment.collectionEnvTab();
          await locators.environment.secretsTab().click();
          await expect(locators.environment.varRow('apiToken')).toBeVisible();
          await expect(envTab.locator('.close-gradient')).not.toHaveClass(/has-changes/);

          await locators.environment.varRowEyeToggle('apiToken').click();
          await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
            .toContainText(NEW_VALUE);

          await closeEnvironmentPanel(page, 'collection');
        });

        await test.step('Interpolation: a subsequent request resolves {{apiToken}} to the new value', async () => {
          await openRequest(page, fmt.collectionName, 'read-secret', { persist: true });
          await sendRequest(page, 200);
          await expectResponseContains(page, [NEW_VALUE]);
        });
      } finally {
        await closeElectronApp(app);
      }
    });

    test(`(${fmt.label}) script overwrites a previously-set secret, encrypted store entry changes`, async ({
      launchElectronApp,
      createTmpDir
    }) => {
      const userDataPath = await createTmpDir('userdata');
      const collectionPath = await createTmpDir('collections');
      await fs.promises.cp(fixturesPath, collectionPath, { recursive: true });

      const envFilePath = path.join(collectionPath, fmt.subdir, 'environments', fmt.envFile);
      const secretsPath = path.join(userDataPath, 'secrets.json');
      const collectionDir = path.join(collectionPath, fmt.subdir);

      const app = await launchElectronApp({
        initUserDataPath,
        userDataPath,
        templateVars: { collectionPath }
      });
      const page = await waitForReadyPage(app);
      const locators = buildCommonLocators(page);

      try {
        await test.step('Open the seed-secret request and select the "Local" environment', async () => {
          await waitForCollectionMount(page, fmt.collectionName);
          await openCollection(page, fmt.collectionName);
          await openRequest(page, fmt.collectionName, 'seed-secret', { persist: true });
          await selectEnvironment(page, 'Local', 'collection');
        });

        await test.step('Seed the secret: post-response script sets apiToken to INITIAL_VALUE', async () => {
          await sendRequest(page, 200);
        });

        let initialEncryptedValue = '';
        await test.step('After seed: env panel shows INITIAL_VALUE; encrypted entry persisted', async () => {
          await openEnvironmentConfigTab(page, 'collection');
          const envTab = locators.environment.collectionEnvTab();
          await locators.environment.secretsTab().click();
          await expect(locators.environment.varRow('apiToken')).toBeVisible();
          await locators.environment.varRowEyeToggle('apiToken').click();
          await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
            .toContainText(INITIAL_VALUE);
          await closeEnvironmentPanel(page, 'collection');

          await expect.poll(() => fs.existsSync(secretsPath), { timeout: 5000 }).toBe(true);
          await expect.poll(() => {
            const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), collectionDir);
            return secret?.value ?? '';
          }, { timeout: 5000 }).not.toBe('');

          const secretsJson = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
          const secret = findApiTokenSecret(secretsJson, collectionDir);
          expect(secret!.value).not.toContain(INITIAL_VALUE);
          expect(JSON.stringify(secretsJson)).not.toContain(INITIAL_VALUE);
          expect(fs.readFileSync(envFilePath, 'utf8')).not.toContain(secret!.value);
          initialEncryptedValue = secret!.value;
        });

        await test.step('Overwrite: open set-secret and run it (script writes NEW_VALUE over INITIAL_VALUE)', async () => {
          await openRequest(page, fmt.collectionName, 'set-secret', { persist: true });
          await sendRequest(page, 200);
        });

        await test.step('After overwrite: env panel shows NEW_VALUE (not INITIAL_VALUE); encrypted entry changed; .bru/.yml still clean', async () => {
          await openEnvironmentConfigTab(page, 'collection');
          const envTab = locators.environment.collectionEnvTab();
          await locators.environment.secretsTab().click();
          await expect(locators.environment.varRow('apiToken')).toBeVisible();
          await expect(envTab.locator('.close-gradient')).not.toHaveClass(/has-changes/);

          await locators.environment.varRowEyeToggle('apiToken').click();
          await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
            .toContainText(NEW_VALUE);
          await expect(locators.environment.varRow('apiToken').locator('.CodeMirror'))
            .not.toContainText(INITIAL_VALUE);
          await closeEnvironmentPanel(page, 'collection');

          // Encrypted blob on disk changed — proves the secrets store was rewritten, not stale-cached.
          await expect.poll(() => {
            const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), collectionDir);
            return secret?.value;
          }, { timeout: 5000 }).not.toBe(initialEncryptedValue);

          const secretsJson = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
          const secret = findApiTokenSecret(secretsJson, collectionDir);
          expect(secret!.value).not.toContain(NEW_VALUE);
          expect(secret!.value.length).toBeGreaterThan(0);
          expect(JSON.stringify(secretsJson)).not.toContain(NEW_VALUE);
          expect(JSON.stringify(secretsJson)).not.toContain(INITIAL_VALUE);

          const content = fs.readFileSync(envFilePath, 'utf8');
          expect(content).not.toContain(NEW_VALUE);
          expect(content).not.toContain(INITIAL_VALUE);
          expect(content).not.toContain(secret!.value);
          fmt.expectAfterScript(content);
        });

        await test.step('Interpolation: a subsequent request resolves {{apiToken}} to NEW_VALUE', async () => {
          await openRequest(page, fmt.collectionName, 'read-secret', { persist: true });
          await sendRequest(page, 200);
          await expectResponseContains(page, [NEW_VALUE]);
        });
      } finally {
        await closeElectronApp(app);
      }
    });
  }

  test('persisted secret survives app restart and decrypts on the next launch', async ({
    launchElectronApp,
    createTmpDir
  }) => {
    // Encryption pathway is format-agnostic; one format is enough to prove the round-trip.
    const fmt = FORMATS[0];
    const userDataPath = await createTmpDir('userdata');
    const collectionPath = await createTmpDir('collections');
    await fs.promises.cp(fixturesPath, collectionPath, { recursive: true });

    const secretsPath = path.join(userDataPath, 'secrets.json');
    const collectionDir = path.join(collectionPath, fmt.subdir);

    let blobBeforeRestart = '';
    const firstApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { collectionPath }
    });
    try {
      const page = await waitForReadyPage(firstApp);

      await test.step('First launch: run set-secret and confirm the encrypted blob is on disk', async () => {
        await waitForCollectionMount(page, fmt.collectionName);
        await openCollection(page, fmt.collectionName);
        await openRequest(page, fmt.collectionName, 'set-secret', { persist: true });
        await selectEnvironment(page, 'Local', 'collection');
        await sendRequest(page, 200);

        await expect.poll(() => fs.existsSync(secretsPath), { timeout: 5000 }).toBe(true);
        await expect.poll(() => {
          const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), collectionDir);
          return secret?.value ?? '';
        }, { timeout: 5000 }).not.toBe('');

        const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), collectionDir);
        blobBeforeRestart = secret!.value;
      });
    } finally {
      await closeElectronApp(firstApp);
    }

    const secondApp = await launchElectronApp({
      initUserDataPath,
      userDataPath,
      templateVars: { collectionPath }
    });
    try {
      const page = await waitForReadyPage(secondApp);

      await test.step('Second launch: encrypted blob unchanged on disk', async () => {
        const secret = findApiTokenSecret(JSON.parse(fs.readFileSync(secretsPath, 'utf8')), collectionDir);
        expect(secret!.value).toBe(blobBeforeRestart);
      });

      await test.step('Decryption round-trip: read-secret interpolates {{apiToken}} to the original plaintext', async () => {
        await waitForCollectionMount(page, fmt.collectionName);
        await openCollection(page, fmt.collectionName);
        await selectEnvironment(page, 'Local', 'collection');
        await openRequest(page, fmt.collectionName, 'read-secret', { persist: true });
        await sendRequest(page, 200);
        await expectResponseContains(page, [NEW_VALUE]);
      });
    } finally {
      await closeElectronApp(secondApp);
    }
  });
});
