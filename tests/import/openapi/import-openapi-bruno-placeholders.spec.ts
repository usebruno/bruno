import * as path from 'path';
import { expect, test } from '../../../playwright';
import { closeAllCollections, importCollection, openEnvironmentConfigTab, openEnvironmentInSettings } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe('Import OpenAPI spec exported by Bruno with placeholders', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('creates a secret for a request host and no variable for a process env placeholder', async ({ page, createTmpDir }) => {
    const { environment } = buildCommonLocators(page);
    const openApiFile = path.resolve(__dirname, 'fixtures', 'openapi-bruno-placeholders.yaml');

    await importCollection(page, openApiFile, await createTmpDir('openapi-bruno-placeholders'), {
      expectedCollectionName: 'Bruno Placeholders API'
    });

    await test.step('Open the imported Prod environment', async () => {
      await openEnvironmentConfigTab(page);
      await openEnvironmentInSettings(page, 'Prod');
    });

    await test.step('The base url keeps the process env placeholder, with no variable that would hide it', async () => {
      await environment.variablesTab().click();
      await expect(environment.varRow('baseUrl')).toBeVisible();
      await expect(environment.varRowValueLine('baseUrl')).toHaveText('https://{{process.env.HOST}}/v1');
      await expect(environment.varRow('process.env.HOST')).toHaveCount(0);
    });

    await test.step('The secret from the request host is an empty secret to fill in', async () => {
      await environment.secretsTab().click();
      await expect(environment.varRow('tenantSecret')).toBeVisible();
      await expect(environment.varRow('process.env.HOST')).toHaveCount(0);
    });
  });
});
