import { test, expect } from '../../../playwright';
import {
  addPostResponseScript,
  addPreRequestScript,
  addTestScript,
  createCollection,
  createRequest,
  openRequest,
  saveRequest
} from '../../utils/page/actions';
import { getRunnerResultCounts, runCollection, setSandboxMode } from '../../utils/page/runner';

const skipReason = 'Feature unavailable in this environment';
const defaultSkipReason = 'Request skipped via pre-request script';
const unreachableUrl = 'http://127.0.0.1:1/request-must-not-be-sent';

const sandboxModes = ['developer', 'safe'] as const;

test.describe('Request skip scripting API', () => {
  test.describe.configure({
    mode: 'serial',
    timeout: 60_000
  });

  for (const sandbox of sandboxModes) {
    test(`req.skip(reason) cleanly skips a standalone request in ${sandbox} mode`, async ({ newPage: page, createTmpDir }) => {
      const collectionName = `standalone-request-skip-${sandbox}`;
      const requestName = 'optional-request';

      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await setSandboxMode(page, collectionName, sandbox);
      await createRequest(page, requestName, collectionName, { url: unreachableUrl });
      await openRequest(page, collectionName, requestName);

      await addPreRequestScript(page, `req.skip('${skipReason}');`);
      await addPostResponseScript(page, `throw new Error('post-response script must not execute');`);
      await addTestScript(page, `throw new Error('response tests must not execute');`);
      await saveRequest(page);

      await page.getByTestId('send-arrow-icon').click();

      const skippedResponse = page.getByTestId('skipped-request');

      await expect(skippedResponse).toBeVisible();
      await expect(skippedResponse.getByText('Request skipped', { exact: true })).toBeVisible();
      await expect(skippedResponse.getByText(skipReason, { exact: true })).toBeVisible();
      await expect(page.getByTestId('response-status-code')).toHaveCount(0);
      await expect(page.getByText(/Pre-Request Script Error/)).toHaveCount(0);
      await expect(page.getByText(/Post-Response Script Error/)).toHaveCount(0);
    });

    test(`runner continues after req.skip(reason) without recording a failure in ${sandbox} mode`, async ({ newPage: page, createTmpDir }) => {
      const collectionName = `runner-request-skip-${sandbox}`;
      const firstRequest = 'request-one';
      const skippedRequest = 'request-two';
      const finalRequest = 'request-three';

      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await setSandboxMode(page, collectionName, sandbox);
      await createRequest(page, firstRequest, collectionName, { url: 'http://localhost:8081/ping' });
      await createRequest(page, skippedRequest, collectionName, { url: unreachableUrl });
      await createRequest(page, finalRequest, collectionName, { url: 'http://localhost:8081/ping' });

      await openRequest(page, collectionName, skippedRequest);
      await addPreRequestScript(page, `req.skip('${skipReason}');`);
      await addPostResponseScript(page, `throw new Error('post-response script must not execute');`);
      await addTestScript(page, `throw new Error('response tests must not execute');`);
      await saveRequest(page);

      await runCollection(page, collectionName);

      await expect
        .poll(async () => getRunnerResultCounts(page), {
          message: 'runner result counts should settle after req.skip()',
          timeout: 15_000
        })
        .toEqual({
          totalRequests: 3,
          passed: 2,
          failed: 0,
          skipped: 1
        });

      const skippedResult = page.getByTestId('runner-result-item').filter({ hasText: skippedRequest });

      await skippedResult.locator('.link').first().click();

      const skippedResponse = page.getByTestId('skipped-request');

      await expect(skippedResponse).toBeVisible();
      await expect(skippedResponse.getByText('Request skipped', { exact: true })).toBeVisible();
      await expect(skippedResponse.getByText(skipReason, { exact: true })).toBeVisible();
      await expect(page.getByText(/Post-Response Script Error/)).toHaveCount(0);
    });
  }

  test('req.skip() uses the default reason in a standalone request', async ({ newPage: page, createTmpDir }) => {
    const collectionName = 'standalone-request-skip-without-reason';
    const requestName = 'optional-request';

    await createCollection(page, collectionName, await createTmpDir(collectionName));
    await setSandboxMode(page, collectionName, 'safe');
    await createRequest(page, requestName, collectionName, { url: unreachableUrl });
    await openRequest(page, collectionName, requestName);

    await addPreRequestScript(page, 'req.skip();');
    await saveRequest(page);

    await page.getByTestId('send-arrow-icon').click();

    const skippedResponse = page.getByTestId('skipped-request');

    await expect(skippedResponse).toBeVisible();
    await expect(skippedResponse.getByText('Request skipped', { exact: true })).toBeVisible();
    await expect(skippedResponse.getByText(defaultSkipReason, { exact: true })).toBeVisible();
    await expect(page.getByTestId('response-status-code')).toHaveCount(0);
  });
});
