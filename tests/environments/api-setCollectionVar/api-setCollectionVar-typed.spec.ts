import fs from 'fs';
import path from 'path';
import { test, expect, closeElectronApp } from '../../../playwright';
import { sendRequest, waitForReadyPage } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

const COLLECTION_FILE_ORIGINAL = `meta {
  name: collection
}

vars:pre-request {
  host: https://testbench-sanity.usebruno.com
  existingCollVar: original-coll-value
}
`;

const restoreCollectionFixture = (collectionFixturePath: string) => {
  const collectionBru = path.join(collectionFixturePath, 'collection.bru');
  fs.writeFileSync(collectionBru, COLLECTION_FILE_ORIGINAL, 'utf8');
};

test.describe.serial('bru.setCollectionVar(name, value) — typed value persistence', () => {
  test.afterEach(async ({ collectionFixturePath }) => {
    if (collectionFixturePath) {
      restoreCollectionFixture(collectionFixturePath);
    }
  });

  test('persists number/boolean/object/string values with the correct dataType annotation', async ({
    pageWithUserData: page,
    collectionFixturePath,
    restartApp
  }) => {
    const collectionBruPath = path.join(collectionFixturePath!, 'collection.bru');
    const locators = buildCommonLocators(page);

    await test.step('Run the typed-persist request', async () => {
      await locators.sidebar.collection('collection').click();
      await page.getByText('api-setCollectionVar-typed', { exact: true }).click();
      await sendRequest(page, 200);
    });

    await test.step('collection.bru on disk carries the right dataType annotations', async () => {
      await expect.poll(() => fs.readFileSync(collectionBruPath, 'utf8'), { timeout: 5000 })
        .toMatch(/@number\s+coll_num:\s*42/);
      const content = fs.readFileSync(collectionBruPath, 'utf8');

      expect(content).toMatch(/@boolean\s+coll_bool:\s*true/);
      // @object values are pretty-printed in a '''…''' block.
      expect(content).toMatch(/@object\s+coll_obj:\s*'''[\s\S]*"k":\s*1[\s\S]*'''/);
      // 'string' is the implicit default — not materialized.
      expect(content).not.toMatch(/@string\s+coll_str:/);
      expect(content).toMatch(/coll_str:\s*hello/);
    });

    await test.step('Restart and verify the collection vars tab reflects the persisted datatypes', async () => {
      const newApp = await restartApp();
      const newPage = await waitForReadyPage(newApp);
      const newLocators = buildCommonLocators(newPage);

      await newLocators.sidebar.collection('collection').click();
      await newLocators.paneTabs.collectionSettingsTab('vars').click();

      const numRow = newLocators.environment.variableRowByName('coll_num');
      const boolRow = newLocators.environment.variableRowByName('coll_bool');
      const objRow = newLocators.environment.variableRowByName('coll_obj');
      const strRow = newLocators.environment.variableRowByName('coll_str');

      await expect(numRow).toBeVisible();
      await expect(newLocators.dataTypeSelector.typeLabel(numRow)).toHaveText('number', { timeout: 5000 });
      await expect(newLocators.dataTypeSelector.typeLabel(boolRow)).toHaveText('boolean');
      await expect(newLocators.dataTypeSelector.typeLabel(objRow)).toHaveText('object');
      await expect(newLocators.dataTypeSelector.typeLabel(strRow)).toHaveText('string');

      await closeElectronApp(newApp);
    });
  });
});
