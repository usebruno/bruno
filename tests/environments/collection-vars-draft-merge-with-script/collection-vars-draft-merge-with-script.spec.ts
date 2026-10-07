import { test, expect } from '../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, sendRequest, selectEnvironment } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const selectAllShortcut = process.platform === 'darwin' ? 'Meta+a' : 'Control+a';

const PERSISTENCE_TIMEOUT = 10000;

test.describe('Collection variables draft merge with script-set variables', () => {
  test('preserves unsaved draft edits when script sets a new collection variable', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, 'collection-vars-draft-merge-test');
    await selectEnvironment(page, 'Test');

    await test.step('Open collection settings and edit existingCollVar (create draft)', async () => {
      await locators.sidebar.collection('collection-vars-draft-merge-test').click();
      await locators.paneTabs.collectionSettingsTab('vars').click();
      await expect(locators.environment.variableRowByName('existingCollVar')).toBeVisible();
      await locators.environment.variableValue('existingCollVar').click();
      await page.keyboard.press(selectAllShortcut);
      await page.keyboard.type('draft-edited-coll-value');

      // Wait for draft debounce
      await page.waitForTimeout(500);
    });

    await test.step('Open request and send it', async () => {
      await locators.sidebar.request('set-collection-var').click();
      await expect(locators.tabs.requestTab('set-collection-var')).toBeVisible();
      await sendRequest(page, 200);
    });

    await test.step('Verify draft edit and script var in collection settings UI', async () => {
      await locators.sidebar.collection('collection-vars-draft-merge-test').click();
      await locators.paneTabs.collectionSettingsTab('vars').click();

      await expect(locators.environment.variableRowByName('existingCollVar')).toBeVisible();
      await expect(locators.environment.variableValue('existingCollVar')).toContainText('draft-edited-coll-value');

      await expect(locators.environment.variableRowByName('scriptCollVar')).toBeVisible();
      await expect(locators.environment.variableValue('scriptCollVar')).toContainText('from-script-789');
    });

    await test.step('Verify script var persisted to collection.bru', async () => {
      const collectionBruPath = path.join(
        collectionFixturePath!,
        'collection-vars-draft-merge-test',
        'collection.bru'
      );
      await expect.poll(() => {
        const content = fs.readFileSync(collectionBruPath, 'utf8');
        return content.includes('scriptCollVar') && content.includes('from-script-789');
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });
  });
});
