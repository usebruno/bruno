import { expect, Page, test } from '../../playwright';
import {
  buildCommonLocators,
  closeAllCollections,
  createCollection,
  createRequest,
  expectLinkOpensRequest,
  expectTransientRequestOpened,
  openRequest,
  selectRequestBodyMode,
  sendRequestAndWaitForResponse,
  setCodeMirrorValue as setCmValue,
  switchResponseFormat,
  switchToPreviewTab
} from '../utils/page';

const ECHO_URL = 'http://localhost:8081/api/echo/json';
const responsePane = (page: Page) => buildCommonLocators(page).response.pane();
const requestPane = (page: Page) => buildCommonLocators(page).request.pane();
// HttpMethodSelector lives in the query-url-wrapper, a sibling of [data-testid="request-pane"], not inside it.
const queryUrlWrapper = (page: Page) => page.locator('.query-url-wrapper');

test.describe('CodeMirror link-aware - Response pane (HTTP/GraphQL, pre-existing PR #8189)', () => {
  test.afterEach(async ({ page }) => {
    await closeAllCollections(page);
  });

  test('Body - JSON preview tree: clicking a URL value opens it as a transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-json-preview', await createTmpDir('response-json-preview'));
    await createRequest(page, 'echo', 'response-json-preview', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-json-preview', 'echo');

    await selectRequestBodyMode(page, 'JSON');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), '{ "link": "http://link-aware.test/http-body" }');
    await sendRequestAndWaitForResponse(page);

    await switchResponseFormat(page, 'JSON');
    await switchToPreviewTab(page);

    const value = responsePane(page).locator('.variable-value').filter({ hasText: 'link-aware.test/http-body' });
    await expect(value).toBeVisible();
    await value.click();
    await expectTransientRequestOpened(page, { type: 'http', url: 'http://link-aware.test/http-body' });
  });

  test('presigned "PutObject" URL defaults the new request to PUT and opens on the Body tab', async ({ page, createTmpDir }) => {
    const presignedUrl = 'https://bucket.s3.amazonaws.com/key?x-id=PutObject';
    await createCollection(page, 'response-presigned', await createTmpDir('response-presigned'));
    await createRequest(page, 'echo', 'response-presigned', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-presigned', 'echo');

    await selectRequestBodyMode(page, 'JSON');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), `{ "link": "${presignedUrl}" }`);
    await sendRequestAndWaitForResponse(page);

    await expectLinkOpensRequest(page, buildCommonLocators(page).codeMirror.within(responsePane(page)), { type: 'http', url: presignedUrl });

    await expect(queryUrlWrapper(page).getByTestId('method-selector')).toHaveText('PUT');
    await expect(requestPane(page).locator('.tabs').getByRole('tab', { name: 'Body' })).toContainClass('active');
  });
});
