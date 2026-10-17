import path from 'path';
import { test, expect } from '../../../playwright';
import { buildCommonLocators, closeAllCollections, importCollection } from '../../utils/page';

const collectionFile = path.join(__dirname, 'fixtures', 'postman-collection-vars-mixed-disabled.json');

test.describe('Postman collection variable import preserves disabled state', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('collection variables: honors disabled=true and defaults missing/false disabled to enabled', async ({
    page,
    createTmpDir
  }) => {
    const locators = buildCommonLocators(page);
    const tmpDir = await createTmpDir('postman-vars-mixed-disabled');

    await importCollection(page, collectionFile, tmpDir, {
      expectedCollectionName: 'Vars Mixed Disabled Collection'
    });

    await test.step('Open the Vars tab in collection settings', async () => {
      await locators.paneTabs.collectionSettingsTab('vars').click();
      await expect(locators.table('collection-vars-req').allRows().first()).toBeVisible();
    });

    await test.step('Enabled and explicitly-enabled rows are checked; disabled row is unchecked', async () => {
      const varsTable = locators.table('collection-vars-req');
      await expect(varsTable.rowCheckboxByName('enabledVar')).toBeChecked();
      await expect(varsTable.rowCheckboxByName('explicitlyEnabledVar')).toBeChecked();
      await expect(varsTable.rowCheckboxByName('disabledVar')).not.toBeChecked();
    });
  });
});
