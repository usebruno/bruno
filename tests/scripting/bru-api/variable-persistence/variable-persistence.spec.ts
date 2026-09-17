import { test, expect } from '../../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment, openEnvironmentSelector } from '../../../utils/page';
import { buildCommonLocators } from '../../../utils/page/locators';
import { runCollection, validateRunnerResults } from '../../../utils/page/runner';

const PERSISTENCE_TIMEOUT = 10000;

test.describe('Script variable persistence to disk (developer mode)', () => {
  test('persists env var and collection var', async ({ pageWithUserData: page, collectionFixturePath }) => {
    const locators = buildCommonLocators(page);

    await openCollection(page, 'variable-persistence-test');
    await selectEnvironment(page, 'Test');
    await runCollection(page, 'variable-persistence-test');

    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });

    await test.step('Verify env var visible in environment UI', async () => {
      await openEnvironmentSelector(page, 'collection');
      await locators.environment.configureButton().click();
      await expect(locators.environment.collectionEnvTab()).toBeVisible();

      await expect(locators.environment.variableRowByName('persistedToken')).toBeVisible();
      await expect(locators.environment.variableValue('persistedToken')).toContainText('test-value-123');

      await locators.environment.collectionEnvTab().hover();
      await locators.environment.collectionEnvTab().getByTestId('request-tab-close-icon').click({ force: true });
    });

    await test.step('Verify env var persisted to environments/Test.bru', async () => {
      const envFilePath = path.join(collectionFixturePath!, 'variable-persistence-test', 'environments', 'Test.bru');
      await expect.poll(() => {
        const content = fs.readFileSync(envFilePath, 'utf8');
        return content.includes('persistedToken') && content.includes('test-value-123');
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });

    await test.step('Verify collection var persisted to collection.bru', async () => {
      const collectionBruPath = path.join(collectionFixturePath!, 'variable-persistence-test', 'collection.bru');
      await expect.poll(() => {
        const content = fs.readFileSync(collectionBruPath, 'utf8');
        return content.includes('persistedCollectionToken') && content.includes('collection-value-456');
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });
  });
});
