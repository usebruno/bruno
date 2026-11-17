import * as path from 'path';
import { test, expect } from '../../../playwright';
import { runCollection, validateRunnerResults } from '../../utils/page';
import { cliOutput, runCLIAsync } from '../../utils/cli';

const COLLECTION = path.resolve(__dirname, 'fixtures/collections/crlf-line-comment');

test.describe('request scripts with // comments run when the collection script has CRLF line endings', () => {
  test('app runner passes every request', async ({ pageWithUserData: page }) => {
    await test.step('every request passes its pre-request and test scripts', async () => {
      await runCollection(page, 'crlf-line-comment');
      await validateRunnerResults(page, { totalRequests: 2, passed: 2, failed: 0, skipped: 0 });
    });
  });

  test('bru run passes every request', async () => {
    const run = await runCLIAsync(COLLECTION, 'run . --noproxy');

    await test.step('both requests passed their tests', async () => {
      expect(run.code, cliOutput(run)).toBe(0);
      expect(run.stdout).toContain('2 (2 Passed)');
    });
  });
});
