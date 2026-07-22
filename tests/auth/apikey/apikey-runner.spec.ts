import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

const COLLECTION_NAME = 'apikey-auth-mode-test';

test.describe.serial('API Key Auth Mode Runner', () => {
  for (const mode of ['safe', 'developer'] as const) {
    test(`detects API key auth in ${mode} mode`, async ({ pageWithUserData: page }) => {
      await setSandboxMode(page, COLLECTION_NAME, mode);
      await runCollection(page, COLLECTION_NAME);

      await validateRunnerResults(page, {
        totalRequests: 2,
        passed: 2,
        failed: 0,
        skipped: 0
      });
    });
  }
});
