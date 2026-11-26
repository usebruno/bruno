import fs from 'fs';
import path from 'path';
import jsyaml from 'js-yaml';
import { test, expect } from '../../../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  confirmMigration,
  openCollection,
  openMigrateToYmlModalFromOverview,
  openRequest,
  selectResponsePaneTab,
  sendRequest
} from '../../../../pages';

const COLLECTION_NAME = 'migrate-scripts';
const REQUEST_NAME = 'ping-with-scripts';

type MigratedRequest = { runtime?: { scripts?: { type: string; code: string }[] } };

test.describe('Migrate to YML — scripts and tests after migration', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('TC-5981: Verify pre-request, post-response scripts and tests still run after migrating to YML', { tag: '@sanity' }, async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    const { sidebar, response, toast } = buildCommonLocators(page);
    const collectionPath = collectionFixturePath!;

    await test.step('Migrate the bru collection to YML', async () => {
      await openCollection(page, COLLECTION_NAME);
      await openMigrateToYmlModalFromOverview(page, COLLECTION_NAME);
      await confirmMigration(page);
      await toast.byMessage('Collection migrated to YML format successfully').waitFor({ state: 'visible' });
    });

    await test.step('Verify that the request is stored as YML with its scripts and tests', async () => {
      await expect(sidebar.request(REQUEST_NAME)).toBeVisible();
      expect(fs.existsSync(path.join(collectionPath, `${REQUEST_NAME}.bru`))).toBe(false);

      const migrated = jsyaml.load(fs.readFileSync(path.join(collectionPath, `${REQUEST_NAME}.yml`), 'utf8')) as MigratedRequest;
      const scriptOfType = (type: string) => migrated.runtime?.scripts?.find((script) => script.type === type)?.code;
      expect(scriptOfType('before-request')).toContain('pre-request script runs');
      expect(scriptOfType('after-response')).toContain('post-response script runs');
      expect(scriptOfType('tests')).toContain('tests run');
    });

    await test.step('Open the migrated request and send it', async () => {
      await openRequest(page, COLLECTION_NAME, REQUEST_NAME);
      await sendRequest(page);
      await selectResponsePaneTab(page, 'Tests');
    });

    await test.step('Verify that the pre-request script, post-response script and tests all ran and passed', async () => {
      await expect(response.statusCode()).toContainText('200');
      await expect(response.testSummary('preRequest')).toContainText('Pre-Request Tests (1), Passed: 1, Failed: 0');
      await expect(response.testSummary('postResponse')).toContainText('Post-Response Tests (1), Passed: 1, Failed: 0');
      await expect(response.testSummary('tests')).toContainText('Tests (1), Passed: 1, Failed: 0');
      await expect(response.assertionResults.rows()).toContainText([
        'pre-request script runs',
        'post-response script runs',
        'tests run'
      ]);
      await expect(response.testFailures()).toHaveCount(0);
    });
  });
});
