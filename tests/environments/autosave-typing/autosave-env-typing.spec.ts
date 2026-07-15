import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, createCollection, createEnvironment, setAutoSave, closeAllCollections } from '../../utils/page';

test.describe('Autosave typing in environment variables', () => {
  // Typing is done with a deliberate 600ms per-keystroke delay across three fields so
  // autosave (500ms) fires repeatedly mid-edit — that's the behaviour under test, and it
  // genuinely takes a while, so the extended timeout is justified rather than masking flake.
  test.setTimeout(60000);

  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('keeps typed Name/Value/Description intact while autosave keeps firing', async ({ page, createTmpDir }) => {
    const { sidebar, environment } = buildCommonLocators(page);
    const collectionName = 'autosave-env-typing';
    const collectionsDir = await createTmpDir('autosave-env-typing');

    // Arrange: collection + environment, with autosave at its 500ms minimum.
    await createCollection(page, collectionName, collectionsDir);
    await expect(sidebar.collection(collectionName)).toBeVisible();
    await createEnvironment(page, 'local', 'collection');
    await setAutoSave(page, { enabled: true, intervalMs: 500 });

    await environment.settingsTab().click();
    const nameInput = environment.variableNameInput(0);
    await expect(nameInput).toBeVisible();

    // The reset-on-autosave regression clobbers input, so after each field we let a couple
    // of autosave cycles elapse, then assert the typed text survived (and Name stays intact).
    const AUTOSAVE_SETTLE_MS = 1200;

    await test.step('Type the Name while autosave keeps firing', async () => {
      await nameInput.click();
      await page.keyboard.type('apiKey', { delay: 600 });
      await page.waitForTimeout(AUTOSAVE_SETTLE_MS);
      await expect(nameInput).toHaveValue('apiKey');
    });

    await test.step('Type the Value while autosave keeps firing', async () => {
      await environment.varRowValueEditor('apiKey').click();
      await page.keyboard.type('token12345', { delay: 600 });
      await page.waitForTimeout(AUTOSAVE_SETTLE_MS);
      await expect(environment.varRowValueLine('apiKey')).toContainText('token12345');
      await expect(nameInput).toHaveValue('apiKey');
    });

    await test.step('Type the Description while autosave keeps firing', async () => {
      await environment.varRowDescriptionEditor('apiKey').click();
      await page.keyboard.type('my api key', { delay: 600 });
      await page.waitForTimeout(AUTOSAVE_SETTLE_MS);
      await expect(environment.varRowDescriptionLine('apiKey')).toContainText('my api key');
      await expect(nameInput).toHaveValue('apiKey');
    });

    await test.step('Verify the changes were autosaved to disk', async () => {
      const readEnvFile = () => {
        const roots = [path.join(collectionsDir, collectionName), collectionsDir];
        for (const root of roots) {
          const envDir = path.join(root, 'environments');
          if (!fs.existsSync(envDir)) continue;
          const match = fs.readdirSync(envDir).find((name) => /^local\.(bru|ya?ml)$/i.test(name));
          if (match) return fs.readFileSync(path.join(envDir, match), 'utf-8');
        }
        return '';
      };

      await expect.poll(readEnvFile, { timeout: 8000 }).toContain('apiKey');
      const content = readEnvFile();
      expect(content).toContain('apiKey');
      expect(content).toContain('token12345');
      expect(content).toContain('my api key');
    });
  });
});
