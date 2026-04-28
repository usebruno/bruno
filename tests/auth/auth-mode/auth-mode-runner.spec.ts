import { test } from '../../../playwright';
import { setSandboxMode, runCollection, validateRunnerResults } from '../../utils/page';

const COLLECTION_NAME = 'auth-mode-test';
const AUTH_MODE_REQUESTS = [
  'aws-sigv4',
  'basic-auth',
  'ntlm',
  'bearer',
  'digest',
  'wsse',
  'oauth1',
  'oauth2',
  'api-key-header',
  'api-key-query'
];

const EXTRA_REQUESTS = [
  'no-auth',
  'inherited-aws-sigv4',
  'inherited-basic-auth',
  'inherited-ntlm'
];
const EXPECTED_REQUESTS = [...AUTH_MODE_REQUESTS, ...EXTRA_REQUESTS];

test.describe.serial('Auth Mode Runner', () => {
  for (const mode of ['safe', 'developer'] as const) {
    test(`detects auth modes in ${mode} mode`, async ({ pageWithUserData: page }) => {
      await setSandboxMode(page, COLLECTION_NAME, mode);
      await runCollection(page, COLLECTION_NAME);

      await validateRunnerResults(page, {
        totalRequests: EXPECTED_REQUESTS.length,
        passed: EXPECTED_REQUESTS.length,
        failed: 0,
        skipped: 0
      });
    });
  }
});
