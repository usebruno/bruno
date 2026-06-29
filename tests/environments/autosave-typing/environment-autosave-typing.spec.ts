import path from 'path';
import fs from 'fs';
import { test, expect } from '../../../playwright';
import { createCollection, createEnvironment, closeAllCollections } from '../../utils/page';

test.describe('Autosave typing in environment variables', () => {
  test.setTimeout(90000);

  test.afterEach(async ({ page }) => {
    if (!page.isClosed()) {
      await closeAllCollections(page);
    }
  });

  test('keeps typed Name/Value intact while autosave keeps firing', async ({ page, createTmpDir }) => {
    const collectionName = 'autosave-env-typing';
    const collectionsDir = await createTmpDir('autosave-env-typing');

    await test.step('Create collection and environment', async () => {
      await createCollection(page, collectionName, collectionsDir);
      await expect(page.locator('#sidebar-collection-name').filter({ hasText: collectionName })).toBeVisible();
      await createEnvironment(page, 'local', 'collection');
    });

    await test.step('Enable autosave at the minimum 500ms delay', async () => {
      await page.locator('.status-bar button[data-trigger="preferences"]').click();
      await page.waitForTimeout(500);
      await page.getByRole('tab', { name: 'General' }).click();

      await page.locator('#autoSaveEnabled').check();
      const interval = page.locator('#autoSaveInterval');
      await interval.fill('500');

      await page.waitForTimeout(1000);

      const preferencesTab = page.locator('.request-tab').filter({ hasText: 'Preferences' });
      await preferencesTab.hover();
      await preferencesTab.locator('.close-icon').click({ force: true });
    });

    await page.locator('.request-tab').filter({ hasText: 'Environments' }).click();
    const nameInput = page.locator('input[name="0.name"]');
    await expect(nameInput).toBeVisible();

    await test.step('Type the Name while autosave keeps firing', async () => {
      await nameInput.click();
      await page.keyboard.type('apiKey', { delay: 600 });
      await page.waitForTimeout(1200);

      await expect(nameInput).toHaveValue('apiKey');
    });

    await test.step('Type the Value (CodeMirror) while autosave keeps firing', async () => {
      const variableRow = page.locator('tr').filter({ has: page.locator('input[name="0.name"]') });
      const codeMirror = variableRow.locator('.CodeMirror');
      await codeMirror.click();
      await page.keyboard.type('token12345', { delay: 600 });
      await page.waitForTimeout(1200);

      const valueText = await codeMirror.locator('.CodeMirror-line').first().textContent();
      expect(valueText).toContain('token12345');

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
    });
  });
});
