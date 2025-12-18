import { test, expect } from '../../../playwright';
import path from 'path';
import {
  importCollection,
  createEnvironment,
  addEnvironmentVariables,
  saveEnvironment,
  sendRequest,
  expectResponseContains,
  closeAllCollections
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Global Environment Create Tests', () => {
  test.setTimeout(60000);

  test('should import collection and create global environment for request usage', async ({
    page,
    createTmpDir
  }) => {
    const collectionFile = path.join(__dirname, 'fixtures', 'bruno-collection.json');
    const locators = buildCommonLocators(page);

    await test.step('Import collection', async () => {
      await importCollection(page, collectionFile, await createTmpDir('global-env-test'), {
        expectedCollectionName: 'test_collection',
        openWithSandboxMode: 'safe'
      });
    });

    await test.step('Create global environment with variables', async () => {
      await createEnvironment(page, 'Test Global Environment', 'global');

      await addEnvironmentVariables(page, [
        { name: 'host', value: 'https://echo.usebruno.com' },
        { name: 'userId', value: '1' },
        { name: 'postTitle', value: 'Global Test Post from Environment' },
        { name: 'postBody', value: 'This is a global test post body with environment variables' },
        { name: 'secretApiToken', value: 'global-secret-token-12345', isSecret: true }
      ]);

      await saveEnvironment(page);
      await expect(locators.environment.currentEnvironment()).toContainText('Test Global Environment');
    });

    await test.step('Test GET request with environment variables', async () => {
      await page.locator('.collection-item-name').first().click();
      await expect(locators.request.urlLine()).toContainText('{{host}}');
      await sendRequest(page, 200);
    });

    await test.step('Verify response contains environment variables', async () => {
      await expectResponseContains(page, [
        '"userId": 1',
        '"title": "Global Test Post from Environment"',
        '"body": "This is a global test post body with environment variables"',
        '"apiToken": "global-secret-token-12345"'
      ]);
    });

    await test.step('Cleanup', async () => {
      await closeAllCollections(page);
    });
  });
});
