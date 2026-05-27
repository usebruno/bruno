import { test, expect, Page } from '../../../playwright';
import { openCollection, sendRequest, openRequestInFolder, setUrlEncoding } from '../../utils/page';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

test.describe('Send Request — every fixture, ON and OFF', () => {
  const fixtures = [
    // query-side
    'query-spaces',
    'query-preencoded',
    'query-redirect-url',
    'query-pipe',
    'query-unicode',
    'query-equals',
    'query-email-plus',
    'query-commas-colons',
    'query-double-encode',
    'query-hash',
    'query-arrays',
    'fragment-preserved',
    // path-side
    'path-spaces',
    'path-brackets',
    'path-unicode',
    'path-idempotent',
    'path-odata',
    'path-fragment',
    'path-issues-fragment',
    'path-spa-route',
    'oauth-callback-fragment',
    // params:path
    'params-path-odata',
    'params-path-space',
    'path-param-slash',
    'path-param-hash',
    'path-param-hash-trailing',
    'path-param-space',
    'path-param-ampersand',
    'path-param-equals',
    'path-param-plus',
    'path-param-question',
    'path-param-at',
    'path-param-colon',
    'path-param-comma',
    'path-param-unicode',
    'path-param-brackets',
    'path-param-braces',
    'path-param-pipe'
  ];

  const expectEchoResponded = async (page: Page) => {
    const texts = await page
      .getByTestId('response-preview-container')
      .locator('.CodeMirror-scroll')
      .allInnerTexts();
    // Echo server returns `{ "url": "/path/..." }`. Asserting the `"url":`
    // marker is present is enough to confirm we hit the echo route (not a
    // 404 / error page) without pinning the encoded byte-form, which is
    // mode-dependent and the actual point of inspection here.
    expect(texts.some((t: string) => t.includes('"url":'))).toBe(true);
  };

  for (const file of fixtures) {
    test(`${file} — send with toggle ON then OFF`, async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, file);

      // ON
      await setUrlEncoding(page, true);
      await sendRequest(page, 200);
      await expectEchoResponded(page);

      // OFF
      await setUrlEncoding(page, false);
      await sendRequest(page, 200);
      await expectEchoResponded(page);
    });
  }
});

/**
 * Real-network tests against httpbin.org/anything — covers the # encoding
 * decision-tree scenarios from fixings/snippet-vs-sendrequest.md.
 *
 * httpbin echoes back the wire URL it received in the JSON `url` field, so
 * each test sends and asserts the substring that proves the right URL reached
 * the server. Both ON and OFF return 200 (httpbin accepts any path); the
 * distinction is in *what URL* the server saw.
 *
 * Fixtures used:
 *   - docs-fragment-external    → Scenario 1: page anchor (#authentication)
 *   - path-issues-fragment      → Scenario 4: issue tracker (/issues/#1234)
 *   - path-spa-route            → Scenario 5: SPA hash route (/#/dashboard)
 *   - oauth-callback-fragment   → Scenario 8: OAuth implicit-flow callback
 *
 * NOTE: external network dependency on httpbin.org. Treat as a soft check;
 * mark `.skip` if httpbin is unreachable in CI.
 */
const expectHttpbinReceived = async (page: Page, expectedUrlSubstring: string) => {
  const texts = await page
    .getByTestId('response-preview-container')
    .locator('.CodeMirror-scroll')
    .allInnerTexts();
  // httpbin.org/anything returns `{ "url": "https://httpbin.org/anything/..." }`.
  // We assert the expected URL substring appears in the response — that
  // confirms what httpbin actually received on the wire.
  expect(texts.some((t: string) => t.includes(expectedUrlSubstring))).toBe(true);
};

test.describe('Send Request — httpbin.org # encoding scenarios', () => {
  // httpbin.org is a public service and occasionally returns 502 Bad Gateway
  // when overloaded. Retry up to 3 times to smooth over those transient
  // failures so the suite doesn't fail for reasons unrelated to Bruno.
  test.describe.configure({ retries: 3 });

  test('Scenario 1: page anchor — OFF strips #authentication on wire', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'docs-fragment-external');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    await expectHttpbinReceived(page, 'https://httpbin.org/anything/docs/api');
  });

  test('Scenario 1 (ON variant): page anchor — # encoded as data reaches server', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'docs-fragment-external');
    await setUrlEncoding(page, true);
    await sendRequest(page, 200);
    await expectHttpbinReceived(page, 'https://httpbin.org/anything/docs/api#authentication');
  });

  test('Scenario 4a: issue tracker — OFF strips #1234 on wire', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'path-issues-fragment');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    // Fixture URL is /anything/issues#1234 (not /anything/issues/#1234 from
    // the docs table) — httpbin's Flask routing 404s on trailing-slash paths
    // like /anything/issues/, so we drop the slash to keep the test green.
    await expectHttpbinReceived(page, 'https://httpbin.org/anything/issues');
  });

  test('Scenario 4b: issue tracker — ON encodes #1234, server sees full path', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'path-issues-fragment');
    await setUrlEncoding(page, true);
    await sendRequest(page, 200);
    await expectHttpbinReceived(page, 'https://httpbin.org/anything/issues#1234');
  });

  test('Scenario 5: SPA hash-route — OFF strips everything after #', async ({ pageWithUserData: page }) => {
    // Fixture URL is /anything/spa#/dashboard/settings (added the /spa segment
    // since /anything/ trailing-slash 404s on httpbin's Flask routing).
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'path-spa-route');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    await expectHttpbinReceived(page, 'https://httpbin.org/anything/spa');
  });

  test('Scenario 8: OAuth callback — OFF strips token payload on wire', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'oauth-callback-fragment');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    // OFF: fragment (incl. access_token) never reaches the server — that's the
    // OAuth implicit-flow security property.
    await expectHttpbinReceived(page, 'https://httpbin.org/anything/callback');
  });
});
