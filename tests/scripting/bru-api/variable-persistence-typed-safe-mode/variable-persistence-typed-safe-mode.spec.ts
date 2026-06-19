import { test, expect } from '../../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment, openEnvironmentSelector, closeEnvironmentPanel } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';
import { runCollection, validateRunnerResults } from '../../../utils/page/runner';

const PERSISTENCE_TIMEOUT = 10000;

test.describe('Script-driven typed variable persistence to disk (safe mode / QuickJS)', () => {
  test('QuickJS shim preserves number/boolean/object across the host boundary and to disk', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const locators = buildCommonLocators(page);
    const COLLECTION_NAME = 'variable-persistence-typed-safe-test';

    await openCollection(page, COLLECTION_NAME);
    await selectEnvironment(page, 'Test');
    await runCollection(page, COLLECTION_NAME);

    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });

    const envFilePath = path.join(collectionFixturePath!, COLLECTION_NAME, 'environments', 'Test.bru');
    const collectionBruPath = path.join(collectionFixturePath!, COLLECTION_NAME, 'collection.bru');

    await test.step('environments/Test.bru contains @number/@boolean/@object annotations for env vars', async () => {
      await expect.poll(() => {
        const content = fs.readFileSync(envFilePath, 'utf8');
        return (
          /@number\s+envNum:\s*42/.test(content)
          && /@boolean\s+envBool:\s*true/.test(content)
          && /@object\s+envObj:/.test(content)
          && content.includes('"port"')
          && content.includes('3000')
        );
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });

    await test.step('collection.bru contains @number/@boolean/@object annotations for collection vars', async () => {
      await expect.poll(() => {
        const content = fs.readFileSync(collectionBruPath, 'utf8');
        return (
          /@number\s+collNum:\s*7/.test(content)
          && /@boolean\s+collBool:\s*false/.test(content)
          && /@object\s+collObj:/.test(content)
          && content.includes('"region"')
          && content.includes('"eu"')
        );
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });

    await test.step('env editor shows the correct type label per row', async () => {
      await openEnvironmentSelector(page, 'collection');
      await locators.environment.configureButton().click();
      await expect(locators.environment.collectionEnvTab()).toBeVisible();

      const numRow = locators.environment.variableRowByName('envNum');
      const boolRow = locators.environment.variableRowByName('envBool');
      const objRow = locators.environment.variableRowByName('envObj');

      await expect(numRow).toBeVisible();
      await expect(locators.dataTypeSelector.typeLabel(numRow)).toHaveText('number');
      await expect(locators.dataTypeSelector.typeLabel(boolRow)).toHaveText('boolean');
      await expect(locators.dataTypeSelector.typeLabel(objRow)).toHaveText('object');

      await closeEnvironmentPanel(page, 'collection');
      await expect(locators.environment.collectionEnvTab()).not.toBeVisible();
    });
  });
});
