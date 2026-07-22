import path from 'path';
import fs from 'fs';
import { Page } from '@playwright/test';
import { test, expect } from '../../../playwright';
import {
  buildCommonLocators,
  createCollection,
  createEnvironment,
  openEnvironmentConfigTab,
  openPreferences,
  selectPreferencesTab,
  closeAllCollections
} from '../../utils/page';

// Enable autosave and pin the interval to its 500ms minimum, so a full autosave
// cycle completes between keystrokes typed with a 600ms delay (see the test).
const enableAutosave = async (page: Page, intervalMs = 500) => {
  await test.step(`Enable autosave (interval ${intervalMs}ms)`, async () => {
    await openPreferences(page);
    await selectPreferencesTab(page, 'General');
    await page.locator('#autoSaveEnabled').check();
    const interval = page.locator('#autoSaveInterval');
    await interval.fill(String(intervalMs));
    // The preferences form persists on a 500ms debounce.
    await page.waitForTimeout(800);
    const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
    await preferencesTab.hover();
    await preferencesTab.locator('.close-icon').click({ force: true });
  });
};

// The env .bru/.yml file, found without assuming the collection's on-disk nesting.
const readEnvFile = (collectionsDir: string, collectionName: string, envName: string): string => {
  const roots = [path.join(collectionsDir, collectionName), collectionsDir];
  for (const root of roots) {
    const envDir = path.join(root, 'environments');
    if (!fs.existsSync(envDir)) continue;
    const match = fs.readdirSync(envDir).find((name) => new RegExp(`^${envName}\\.(bru|ya?ml)$`, 'i').test(name));
    if (match) return fs.readFileSync(path.join(envDir, match), 'utf-8');
  }
  return '';
};

test.describe('Autosave does not clobber in-flight environment edits', () => {
  // Longer field values = more autosave cycles mid-edit; at 600ms/keystroke this
  // takes a while, so the extended timeout is intentional, not masking flake.
  test.setTimeout(150000);

  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  // Regression guard for the enableReinitialize clobber. Each keystroke is typed with
  // a 600ms delay while autosave runs at its 500ms minimum, so a full autosave cycle
  // (300ms draft debounce + 500ms interval + disk write) completes between keystrokes.
  // The old code reinitialized the form to the just-saved snapshot on every one of
  // those cycles, discarding the character typed since — so the typed text (and the
  // row's Name) must survive across Name, Value and Description.
  test('keeps typed Name/Value/Description intact while autosave keeps firing', async ({ page, createTmpDir }) => {
    const { environment } = buildCommonLocators(page);
    const collectionName = 'autosave-env-typing';
    const envName = 'local';
    const collectionsDir = await createTmpDir('autosave-env-typing');

    // Enable autosave first, on the home screen, so it survives across the fresh
    // collection context (toggling it after leaves an empty view without the env selector).
    await enableAutosave(page, 500);

    await createCollection(page, collectionName, collectionsDir);
    await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();

    await createEnvironment(page, envName, 'collection');
    await openEnvironmentConfigTab(page, 'collection');

    const nameInput = environment.variableNameInput(0);
    await expect(nameInput).toBeVisible();

    const SETTLE_MS = 1200;

    const NAME = 'apiKeyForServiceAuthentication';
    const VALUE = 'token-1234567890-abcdefghij-XYZ';
    const DESCRIPTION = 'API key used for the service authentication flow';

    await test.step('Type the Name while autosave keeps firing', async () => {
      await nameInput.click();
      await page.keyboard.type(NAME, { delay: 600 });
      await page.waitForTimeout(SETTLE_MS);
      await expect(nameInput).toHaveValue(NAME);
    });

    await test.step('Type the Value while autosave keeps firing', async () => {
      await environment.varRowValueEditor(NAME).click();
      await page.keyboard.type(VALUE, { delay: 600 });
      await page.waitForTimeout(SETTLE_MS);
      await expect(environment.varRowValueLine(NAME)).toContainText(VALUE);
      await expect(nameInput).toHaveValue(NAME);
    });

    await test.step('Type the Description while autosave keeps firing', async () => {
      await environment.varRowDescriptionEditor(NAME).click();
      await page.keyboard.type(DESCRIPTION, { delay: 600 });
      await page.waitForTimeout(SETTLE_MS);
      await expect(environment.varRowDescriptionEditor(NAME)).toContainText(DESCRIPTION);
      await expect(nameInput).toHaveValue(NAME);
    });

    await test.step('Verify the changes were autosaved to disk', async () => {
      await expect
        .poll(() => readEnvFile(collectionsDir, collectionName, envName), { timeout: 8000 })
        .toContain(NAME);
      const content = readEnvFile(collectionsDir, collectionName, envName);
      expect(content).toContain(NAME);
      expect(content).toContain(VALUE);
      expect(content).toContain(DESCRIPTION);
    });
  });
});
