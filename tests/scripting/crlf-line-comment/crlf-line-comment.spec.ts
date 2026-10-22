import { test } from '../../../playwright';
import { runCollection, validateRunnerResults } from '../../utils/page';

// The collection-level pre-request script is stored as a double-quoted YAML scalar with
// \r\n escapes, the shape a Windows-authored import produces. Both requests use a `//`
// line comment in their own script and must still run.
test('request scripts with // comments run when the collection script has CRLF line endings', async ({
  pageWithUserData: page
}) => {
  await test.step('every request passes its pre-request and test scripts', async () => {
    await runCollection(page, 'crlf-line-comment');
    await validateRunnerResults(page, { totalRequests: 2, passed: 2, failed: 0, skipped: 0 });
  });
});
