import { test, expect } from '../../../playwright';
import path from 'path';
import {
  importCollection,
  createEnvironment,
  addEnvironmentVariables,
  saveEnvironment,
  sendRequest,
  expectResponseContains,
  removeCollection
} from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Collection Environment Create Tests', () => {
  test('should import collection and create environment for request usage', async ({
    page,
    createTmpDir
  }) => {
    const collectionFile = path.join(__dirname, 'fixtures', 'bruno-collection.json');
    const locators = buildCommonLocators(page);

    await test.step('Import collection', async () => {
      await importCollection(page, collectionFile, await createTmpDir('env-test'), {
        expectedCollectionName: 'test_collection'
      });
    });

    await test.step('Create environment with variables', async () => {
      await createEnvironment(page, 'Test Environment', 'collection');

      await addEnvironmentVariables(page, [
        { name: 'host', value: 'https://echo.usebruno.com' },
        { name: 'userId', value: '1' },
        { name: 'postTitle', value: 'Test Post from Environment' },
        { name: 'postBody', value: 'This is a test post body with environment variables' },
        { name: 'secretApiToken', value: 'super-secret-token-12345', isSecret: true }
      ]);

      await saveEnvironment(page);
      await expect(locators.environment.currentEnvironment()).toContainText('Test Environment');
    });

    await test.step('Test GET request with environment variables', async () => {
      await page.locator('.collection-item-name').first().click();
      await expect(locators.request.urlLine()).toContainText('{{host}}');
      await sendRequest(page, 200);
    });

    await test.step('Verify response contains environment variables', async () => {
      await expectResponseContains(page, [
        '"userId": 1',
        '"title": "Test Post from Environment"',
        '"body": "This is a test post body with environment variables"',
        '"apiToken": "super-secret-token-12345"'
      ]);
    });

    await test.step('Cleanup', async () => {
      await removeCollection(page, 'test_collection');
    });
  });
});
