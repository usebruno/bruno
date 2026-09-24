import { test, expect } from '../../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment, sendRequest } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';

const PERSISTENCE_TIMEOUT = 10000;
const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

test.describe('Collection vars script persistence does not leak draft headers', () => {
  test('draft header edits are not persisted when script sets a collection variable', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);
    const collectionBruPath = path.join(collectionFixturePath!, 'draft-isolation-test', 'collection.bru');

    await openCollection(page, 'draft-isolation-test');
    await selectEnvironment(page, 'Test');

    // Read the original file to confirm the initial header value
    const originalContent = fs.readFileSync(collectionBruPath, 'utf8');
    expect(originalContent).toContain('X-Custom-Header: original-value');

    await test.step('Open collection settings and edit header (create draft)', async () => {
      await locators.sidebar.collection('draft-isolation-test').click();
      await locators.paneTabs.collectionSettingsTab('headers').click();

      const headerRow = page.locator('tbody tr').filter({
        hasText: 'X-Custom-Header'
      });
      await expect(headerRow).toBeVisible();

      const valueCellEditor = headerRow.locator('.CodeMirror').nth(1);
      await valueCellEditor.click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('draft-edited-value');

      await expect(locators.tabs.collectionSettingsTab().locator('.close-gradient'))
        .toHaveClass(/has-changes/);
    });

    await test.step('Open request and send it (script sets a collection var)', async () => {
      await locators.sidebar.request('set-collection-var').click();
      await expect(locators.tabs.requestTab('set-collection-var')).toBeVisible();
      await sendRequest(page, 200);
    });

    await test.step('Verify script collection var persisted to collection.bru', async () => {
      await expect.poll(() => {
        const content = fs.readFileSync(collectionBruPath, 'utf8');
        return content.includes('scriptVar') && content.includes('from-script');
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });

    await test.step('Verify draft header edit was NOT persisted to collection.bru', async () => {
      const content = fs.readFileSync(collectionBruPath, 'utf8');
      // The original header value should still be on disk
      expect(content).toContain('X-Custom-Header: original-value');
      // The draft edit should NOT be on disk
      expect(content).not.toContain('draft-edited-value');
    });
  });
});
