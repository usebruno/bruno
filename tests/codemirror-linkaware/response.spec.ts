import { expect, Locator, Page, test } from '../../playwright';
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
const CUSTOM_ECHO_URL = 'http://localhost:8081/api/echo/custom';
const TEXT_ECHO_URL = 'http://localhost:8081/api/echo/text';
const responsePane = (page: Page) => buildCommonLocators(page).response.pane();
const requestPane = (page: Page) => buildCommonLocators(page).request.pane();
// HttpMethodSelector lives in the query-url-wrapper, a sibling of [data-testid="request-pane"], not inside it.
const queryUrlWrapper = (page: Page) => page.locator('.query-url-wrapper');

const reopenAndPreview = async (page: Page, collectionName: string, requestName: string, format: string) => {
  await openRequest(page, collectionName, requestName);
  await switchResponseFormat(page, format);
  /*
   * switchResponseFormat's dropdown can still be open when switchToPreviewTab runs right
   * after it, and reopens a new dropdown - so wait for the first one to close.
   */
  await page.getByTestId('format-response-tab-dropdown').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await switchToPreviewTab(page);
};

/*
 * A wide XML array only renders CHUNK_SIZE children at a time (see useChunkedReveal in
 * XmlPreview). Scroll its trailing sentinel into view to reveal the next chunk, repeating
 * until the target link shows up.
 */
const revealXmlLinkAndClick = async (page: Page, container: Locator, target: Locator, expectedUrl: string) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await target.isVisible().catch(() => false)) break;
    const sentinel = container.getByTestId('xml-reveal-sentinel').first();
    if (!(await sentinel.count())) break;
    await sentinel.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
  }

  await expect(target).toBeVisible();
  await target.click();
  await expectTransientRequestOpened(page, { type: 'http', url: expectedUrl });
};

/*
 * TextPreview caps how many segments render at once (see CHUNK_SIZE in TextPreview.js) and
 * exposes a "Show more" button instead of auto-revealing on scroll - click it until the
 * target link appears.
 */
const revealTextLinkAndClick = async (page: Page, container: Locator, target: Locator, expectedUrl: string) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await target.isVisible().catch(() => false)) break;
    const showMore = container.getByTestId('text-preview-show-more');
    if (!(await showMore.count())) break;
    await showMore.click();
  }

  await expect(target).toBeVisible();
  await target.click();
  await expectTransientRequestOpened(page, { type: 'http', url: expectedUrl });
};

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

  test('Body - XML preview tree: clicking a URL value opens it as a transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-xml-preview', await createTmpDir('response-xml-preview'));
    await createRequest(page, 'echo', 'response-xml-preview', { url: CUSTOM_ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-xml-preview', 'echo');

    await selectRequestBodyMode(page, 'JSON');
    await setCmValue(
      buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')),
      '{ "headers": { "content-type": "application/xml" }, "content": "<root><link>http://link-aware.test/xml-body</link></root>" }'
    );
    await sendRequestAndWaitForResponse(page);

    await switchResponseFormat(page, 'XML');
    await switchToPreviewTab(page);

    const value = responsePane(page).locator('.xml-value').filter({ hasText: 'link-aware.test/xml-body' });
    await expect(value).toBeVisible();
    await value.click();
    await expectTransientRequestOpened(page, { type: 'http', url: 'http://link-aware.test/xml-body' });
  });

  test('Body - Text preview: clicking a URL value opens it as a transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-text-preview', await createTmpDir('response-text-preview'));
    await createRequest(page, 'echo', 'response-text-preview', { url: TEXT_ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-text-preview', 'echo');

    await selectRequestBodyMode(page, 'TEXT');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), 'See http://link-aware.test/text-body for details');
    await sendRequestAndWaitForResponse(page);

    await switchResponseFormat(page, 'Raw');
    await switchToPreviewTab(page);

    const value = responsePane(page).getByTestId('text-preview-link');
    await expect(value).toBeVisible();
    await value.click();
    await expectTransientRequestOpened(page, { type: 'http', url: 'http://link-aware.test/text-body' });
  });

  test('Body - JSON preview: 1MB response - multiple links each open the correct transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-json-preview-multi', await createTmpDir('response-json-preview-multi'));
    await createRequest(page, 'echo', 'response-json-preview-multi', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-json-preview-multi', 'echo');

    test.setTimeout(90_000);

    /*
     * Spread across 500 depth-1 keys (~2080 chars each) rather than one giant string -
     * react-json-view renders a string value uncollapsed and un-truncated, so one huge
     * string is an expensive single text node to lay out, while many smaller ones aren't.
     */
    const FILLER_SENTENCE = 'Nightly reconciliation job completed for merchant ledger, cross-checking settlement totals against the processor feed. ';
    const filler = FILLER_SENTENCE.repeat(Math.ceil(2080 / FILLER_SENTENCE.length)).slice(0, 2080);
    const fillerFields = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`filler${i}`, filler]));
    const bigJsonBody = JSON.stringify({
      requestId: 'req-001',
      linkStart: 'http://link-aware.test/json-start',
      metadata: {
        retries: 3,
        tags: ['a', 'b', 'c']
      },
      linkMiddle: 'http://link-aware.test/json-middle',
      records: Array.from({ length: 25 }, (_, i) => ({ id: i, value: `row-${i}` })),
      ...fillerFields,
      linkEnd: 'http://link-aware.test/json-end'
    });

    await selectRequestBodyMode(page, 'JSON');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), bigJsonBody);
    await sendRequestAndWaitForResponse(page);
    await reopenAndPreview(page, 'response-json-preview-multi', 'echo', 'JSON');
    /*
     * Sanity check on a depth-1 value that isn't one of the loop's targets. If this itself
     * isn't visible, the tree never rendered at all - not a problem with any specific link.
     */
    await expect(responsePane(page).locator('.variable-value').filter({ hasText: 'http://link-aware.test/json-start' })).toBeVisible();

    for (const suffix of ['json-start', 'json-middle', 'json-end']) {
      await reopenAndPreview(page, 'response-json-preview-multi', 'echo', 'JSON');

      const value = responsePane(page).locator('.variable-value').filter({ hasText: `http://link-aware.test/${suffix}` });
      await expect(value).toBeVisible();
      await value.click();
      await expectTransientRequestOpened(page, { type: 'http', url: `http://link-aware.test/${suffix}` });
    }
  });

  test('Body - XML preview: 1MB response reveals links as you scroll, each opens the correct transient request', async ({ page, createTmpDir }) => {
    /*
     * Reopening a 1200-node/1MB response 5 times (once per target, plus the initial link)
     * is real work the default 30s test timeout wasn't sized for.
     */
    test.setTimeout(90_000);

    await createCollection(page, 'response-xml-preview-huge', await createTmpDir('response-xml-preview-huge'));
    await createRequest(page, 'echo', 'response-xml-preview-huge', { url: CUSTOM_ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-xml-preview-huge', 'echo');

    const ITEM_COUNT = 1200;
    // Repeated/trimmed to ~860 chars - at 1200 items that lands the body at ~1MB.
    const FILLER_SENTENCE = 'Order processed successfully for customer account 48210, warehouse zone north-east, carrier standard-ground. ';
    const filler = FILLER_SENTENCE.repeat(Math.ceil(870 / FILLER_SENTENCE.length)).slice(0, 860);
    /*
     * 50 sits inside the first rendered chunk (no scroll needed); 350/750/1150 each need
     * one or more sentinel-triggered reveals to become visible (chunk size is 200).
     */
    const targetRows = [50, 350, 750, 1150];
    const items = Array.from({ length: ITEM_COUNT }, (_, i) =>
      `<item>${targetRows.includes(i) ? `http://link-aware.test/xml-row-${i}` : filler}</item>`
    ).join('');
    const bigXmlBody = `<response><linkA>http://link-aware.test/xml-a</linkA>${items}<linkC>http://link-aware.test/xml-c</linkC></response>`;

    await selectRequestBodyMode(page, 'JSON');
    await setCmValue(
      buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')),
      JSON.stringify({ headers: { 'content-type': 'application/xml' }, content: bigXmlBody })
    );
    await sendRequestAndWaitForResponse(page);

    await switchResponseFormat(page, 'XML');
    await switchToPreviewTab(page);

    const container = responsePane(page).getByTestId('xml-preview-container');
    const linkA = container.locator('.xml-value').filter({ hasText: 'http://link-aware.test/xml-a' });
    await expect(linkA).toBeVisible();
    await linkA.click();
    await expectTransientRequestOpened(page, { type: 'http', url: 'http://link-aware.test/xml-a' });

    for (const row of targetRows) {
      await reopenAndPreview(page, 'response-xml-preview-huge', 'echo', 'XML');
      const rowContainer = responsePane(page).getByTestId('xml-preview-container');
      const target = rowContainer.locator('.xml-value').filter({ hasText: `http://link-aware.test/xml-row-${row}` });
      await revealXmlLinkAndClick(page, rowContainer, target, `http://link-aware.test/xml-row-${row}`);
    }
  });

  test('Body - Text preview: 1MB response reveals links via "Show more", each opens the correct transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-text-preview-huge', await createTmpDir('response-text-preview-huge'));
    await createRequest(page, 'echo', 'response-text-preview-huge', { url: TEXT_ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-text-preview-huge', 'echo');

    const ROW_COUNT = 500;
    // Repeated/trimmed to ~2050 chars - at 500 rows that lands the body at ~1MB.
    const FILLER_SENTENCE = 'Processing incoming webhook payload for merchant account, validating signature and replaying idempotency checks. ';
    const filler = FILLER_SENTENCE.repeat(Math.ceil(2050 / FILLER_SENTENCE.length)).slice(0, 2050);
    /*
     * 0 sits inside the first rendered chunk (no "Show more" needed); 150/300/450 each need
     * one or more clicks on "Show more" to become visible (chunk size is 300 segments).
     */
    const targetRows = [0, 150, 300, 450];
    const bigTextBody = Array.from({ length: ROW_COUNT }, (_, i) => `${filler} http://link-aware.test/text-row-${i}`).join('\n');

    await selectRequestBodyMode(page, 'TEXT');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), bigTextBody);
    await sendRequestAndWaitForResponse(page);

    for (const row of targetRows) {
      await reopenAndPreview(page, 'response-text-preview-huge', 'echo', 'Raw');
      const container = responsePane(page).getByTestId('text-preview-container');
      const target = container.getByTestId('text-preview-link').filter({ hasText: new RegExp(`text-row-${row}$`) });
      await revealTextLinkAndClick(page, container, target, `http://link-aware.test/text-row-${row}`);
    }
  });

  test('Body - JSON preview: 1MB response - many depth-1 links each open the correct transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-json-preview-huge', await createTmpDir('response-json-preview-huge'));
    await createRequest(page, 'echo', 'response-json-preview-huge', { url: ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-json-preview-huge', 'echo');

    const FIELD_COUNT = 500;
    /*
     * Repeated/trimmed to ~2100 chars - at 500 fields that lands the body at ~1MB. Every
     * target stays a depth-1 key so it's visible under collapsed={1} without expanding
     * anything, since react-json-view's own internals aren't something selectors can rely on.
     */
    const FILLER_SENTENCE = 'Batch export completed for tenant workspace, verifying checksum and archiving output artifact. ';
    const filler = FILLER_SENTENCE.repeat(Math.ceil(2100 / FILLER_SENTENCE.length)).slice(0, 2100);
    const targetFields = [0, 150, 300, 450];
    const bigJsonBody = JSON.stringify(
      Object.fromEntries(
        Array.from({ length: FIELD_COUNT }, (_, i) => [
          `field${i}`,
          targetFields.includes(i) ? `http://link-aware.test/json-row-${i}` : filler
        ])
      )
    );

    await selectRequestBodyMode(page, 'JSON');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), bigJsonBody);
    await sendRequestAndWaitForResponse(page);

    for (const field of targetFields) {
      await reopenAndPreview(page, 'response-json-preview-huge', 'echo', 'JSON');
      const value = responsePane(page).locator('.variable-value').filter({ hasText: `http://link-aware.test/json-row-${field}` });
      await expect(value).toBeVisible();
      await value.click();
      await expectTransientRequestOpened(page, { type: 'http', url: `http://link-aware.test/json-row-${field}` });
    }
  });

  test('Body - Text preview: multiple links across a large response each open the correct transient request', async ({ page, createTmpDir }) => {
    await createCollection(page, 'response-text-preview-multi', await createTmpDir('response-text-preview-multi'));
    await createRequest(page, 'echo', 'response-text-preview-multi', { url: TEXT_ECHO_URL, method: 'POST' });
    await openRequest(page, 'response-text-preview-multi', 'echo');

    const bigTextBody = [
      'Request started at 2024-01-01T00:00:00Z.',
      'Processing batch job with id 48210.',
      'Primary reference: http://link-aware.test/text-a',
      'No further action required for this segment.',
      'Continuing to process additional records in the queue.',
      'Secondary reference: http://link-aware.test/text-b',
      'All checks passed successfully for this run.',
      'Final reference: http://link-aware.test/text-c',
      'End of log output.'
    ].join('\n');

    await selectRequestBodyMode(page, 'TEXT');
    await setCmValue(buildCommonLocators(page).codeMirror.within(page.locator('.request-pane')), bigTextBody);
    await sendRequestAndWaitForResponse(page);

    for (const suffix of ['text-a', 'text-b', 'text-c']) {
      await reopenAndPreview(page, 'response-text-preview-multi', 'echo', 'Raw');

      const value = responsePane(page).getByTestId('text-preview-link').filter({ hasText: new RegExp(`${suffix}$`) });
      await expect(value).toBeVisible();
      await value.click();
      await expectTransientRequestOpened(page, { type: 'http', url: `http://link-aware.test/${suffix}` });
    }
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
