import { test, expect } from '../../../../playwright';
import fs from 'fs';
import path from 'path';
import { openCollection, selectEnvironment } from '../../../utils/page';
import { runCollection, validateRunnerResults } from '../../../utils/page/runner';

const PERSISTENCE_TIMEOUT = 10000;

test.describe('Script variable persistence across requests (baseline-clear between requests)', () => {
  test('request 2 observes request 1\'s write; final disk state reflects last write', async ({
    pageWithUserData: page,
    collectionFixturePath
  }) => {
    await openCollection(page, 'variable-persistence-multi-request-test');
    await selectEnvironment(page, 'Test');
    await runCollection(page, 'variable-persistence-multi-request-test');

    // Both requests should pass: req-1 sets counter=1, req-2 reads counter (must see "1"),
    // then sets counter=2. If the baseline didn't clear between requests, req-2's read
    // would see undefined / wrong value and one of its tests would fail.
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });

    await test.step('final disk state reflects the last write (counter=2)', async () => {
      const envFilePath = path.join(
        collectionFixturePath!,
        'variable-persistence-multi-request-test',
        'environments',
        'Test.bru'
      );
      await expect.poll(() => {
        const content = fs.readFileSync(envFilePath, 'utf8');
        // Must contain counter=2 (the last write wins) and seenInReq2=1 (request 2 observed request 1).
        return content.includes('counter:') && content.includes('2')
          && content.includes('seenInReq2:') && content.includes('1');
      }, { timeout: PERSISTENCE_TIMEOUT }).toBe(true);
    });
  });
});
