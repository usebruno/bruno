import { test } from '../../../../playwright';
import { openCollection, selectEnvironment } from '../../../utils/page';
import { runCollection, validateRunnerResults } from '../../../utils/page/runner';

test.describe('Script collection-variable propagation across requests in one runner invocation', () => {
  test('request 2 observes request 1\'s setCollectionVar write', async ({
    pageWithUserData: page
  }) => {
    await openCollection(page, 'collection-var-multi-request-test');
    await selectEnvironment(page, 'Test');
    await runCollection(page, 'collection-var-multi-request-test');

    // Both requests should pass: req-1 sets counter="1"; req-2 reads counter
    // (must see "1"), records it in seenInReq2, then sets counter="2".
    // If applyCollectionVarsToCollectionRoot didn't propagate the change to
    // collection.root.request.vars.req, req-2's mergeVars would rebuild
    // collectionVariables from the pre-run "0" and req-2's first test would fail.
    await validateRunnerResults(page, {
      totalRequests: 2,
      passed: 2,
      failed: 0
    });
  });
});
