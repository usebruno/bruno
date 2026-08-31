import { test } from '../../../../playwright';
import { openCollection, selectEnvironment } from '../../../utils/page';
import { runCollection, setSandboxMode, validateRunnerResults } from '../../../utils/page/runner';

const COLLECTION = 'dirname-filename-test';

test.describe('__dirname / __filename in scripts', () => {
  for (const mode of ['developer', 'safe'] as const) {
    test(`${mode} mode: binds per-segment paths for collection, folder, and request scripts`, async ({
      pageWithUserData: page
    }) => {
      await openCollection(page, COLLECTION);
      await setSandboxMode(page, COLLECTION, mode);
      await selectEnvironment(page, 'Test');
      await runCollection(page, COLLECTION);

      await validateRunnerResults(page, {
        totalRequests: 1,
        passed: 1,
        failed: 0
      });
    });
  }
});
