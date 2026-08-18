import { test, expect } from '../../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment } from '../../../utils/page';
import { runCollection, validateRunnerResults } from '../../../utils/page/runner';

const PERSISTENCE_TIMEOUT = 10000;

test.describe('__dirname / __filename in node-vm scripts (developer mode)', () => {
  test('binds per-segment paths for collection, folder, and request scripts', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openCollection(page, 'dirname-filename-test');
    await selectEnvironment(page, 'Test');
    await runCollection(page, 'dirname-filename-test');

    await validateRunnerResults(page, {
      totalRequests: 1,
      passed: 5,
      failed: 0
    });

    await test.step('opencollection.yml persists a collection __filename ending in opencollection.yml', async () => {
      const collectionYmlPath = path.join(
        collectionFixturePath!,
        'dirname-filename-test',
        'opencollection.yml'
      );
      await expect
        .poll(
          () => {
            const content = fs.readFileSync(collectionYmlPath, 'utf8');
            return /name:\s*collectionFile[\s\S]+?value:.*opencollection\.yml/.test(content);
          },
          { timeout: PERSISTENCE_TIMEOUT }
        )
        .toBe(true);
    });

    await test.step('environments/Test.yml persists a request __filename ending in dirname-request.yml', async () => {
      const envFilePath = path.join(
        collectionFixturePath!,
        'dirname-filename-test',
        'environments',
        'Test.yml'
      );
      await expect
        .poll(
          () => {
            const content = fs.readFileSync(envFilePath, 'utf8');
            return /name:\s*requestFile[\s\S]+?value:.*dirname-request\.yml/.test(content);
          },
          { timeout: PERSISTENCE_TIMEOUT }
        )
        .toBe(true);
    });
  });
});
