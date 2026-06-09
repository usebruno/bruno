import { expect, Page, test } from '../../../playwright';
import { openCollection, openRequestInFolder, sendRequest, setUrlEncoding } from '../../utils/page';

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
 * Tests against the local Bruno echo server (`/api/echo/anything/*`) — covers
 * the # encoding decision-tree scenarios from fixings/snippet-vs-sendrequest.md.
 *
 * The echo server returns the request shape (args/data/headers/method/url) in
 * the JSON body, mimicking httpbin.org/anything. Each test sends and asserts
 * the substring that proves the right URL reached the server. Both ON and OFF
 * return 200 (the route matches any path); the distinction is in *what URL*
 * the server saw.
 *
 * Fixtures used:
 *   - docs-fragment-external    → Scenario 1: page anchor (#authentication)
 *   - path-issues-fragment      → Scenario 4: issue tracker (/issues/#1234)
 *   - path-spa-route            → Scenario 5: SPA hash route (/#/dashboard)
 *   - oauth-callback-fragment   → Scenario 8: OAuth implicit-flow callback
 *
 * Switched from httpbin.org → local echo because the public httpbin was
 * returning 502/503 under load and making this suite flaky.
 */
const expectEchoReceived = async (page: Page, expectedUrlSubstring: string) => {
  const texts = await page
    .getByTestId('response-preview-container')
    .locator('.CodeMirror-scroll')
    .allInnerTexts();
  // /api/echo/anything/* returns `{ "url": "http://localhost:8081/api/echo/anything/..." }`.
  // We assert the expected URL substring appears in the response — that
  // confirms what the server actually received on the wire.
  expect(texts.some((t: string) => t.includes(expectedUrlSubstring))).toBe(true);
};

// Negative-case helper. Asserts the response body does NOT contain the
// forbidden substring — used to prove that the fragment was stripped on wire
// for OFF-mode tests (otherwise an `includes` on the path-only prefix would
// pass even if Bruno wrongly leaked the fragment through).
const expectEchoDidNotReceive = async (page: Page, forbiddenSubstring: string) => {
  const texts = await page
    .getByTestId('response-preview-container')
    .locator('.CodeMirror-scroll')
    .allInnerTexts();
  expect(texts.some((t: string) => t.includes(forbiddenSubstring))).toBe(false);
};

test.describe('Send Request — # encoding scenarios (local echo)', () => {
  test('Scenario 1: page anchor — OFF strips #authentication on wire', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'docs-fragment-external');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    await expectEchoReceived(page, 'http://localhost:8081/api/echo/anything/docs/api');
    await expectEchoDidNotReceive(page, '#authentication');
  });

  test('Scenario 1 (ON variant): page anchor — # encoded as data reaches server', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'docs-fragment-external');
    await setUrlEncoding(page, true);
    await sendRequest(page, 200);
    await expectEchoReceived(page, 'http://localhost:8081/api/echo/anything/docs/api#authentication');
  });

  test('Scenario 4a: issue tracker — OFF strips #1234 on wire', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'path-issues-fragment');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    // Fixture URL is /anything/issues#1234 (not /anything/issues/#1234 from
    // the docs table) — we use a non-trailing-slash shape that worked across
    // both the public httpbin (older runs) and the local echo (current).
    await expectEchoReceived(page, 'http://localhost:8081/api/echo/anything/issues');
    await expectEchoDidNotReceive(page, '#1234');
  });

  test('Scenario 4b: issue tracker — ON encodes #1234, server sees full path', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'path-issues-fragment');
    await setUrlEncoding(page, true);
    await sendRequest(page, 200);
    await expectEchoReceived(page, 'http://localhost:8081/api/echo/anything/issues#1234');
  });

  test('Scenario 5: SPA hash-route — OFF strips everything after #', async ({ pageWithUserData: page }) => {
    // Fixture URL is /anything/spa#/dashboard/settings (added the /spa segment
    // to keep the URL non-trailing-slash, same reason as Scenario 4a).
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'path-spa-route');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    await expectEchoReceived(page, 'http://localhost:8081/api/echo/anything/spa');
    await expectEchoDidNotReceive(page, 'dashboard');
  });

  test('Scenario 8: OAuth callback — OFF strips token payload on wire', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'oauth-callback-fragment');
    await setUrlEncoding(page, false);
    await sendRequest(page, 200);
    // OFF: fragment (incl. access_token) never reaches the server — that's the
    // OAuth implicit-flow security property.
    await expectEchoReceived(page, 'http://localhost:8081/api/echo/anything/callback');
    await expectEchoDidNotReceive(page, 'access_token');
  });
});
