import { test, expect, Page } from '../../../playwright';
import { openCollection, sendRequest } from '../../utils/page';
import { openRequestInFolder, setUrlEncoding } from './helpers';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

/**
 * For every fixture in `collection/requests/`, send the request twice —
 * once with URL Encoding toggle ON, once with it OFF — and confirm both
 * sends succeed (HTTP 200 + the echo server returns its `"url": …` field).
 *
 * Purpose: see what Bruno's runtime actually puts on the wire for each
 * fixture, in both encoding modes. A failure here means Bruno couldn't
 * send the URL at all (validator rejected, axios threw, etc.) — that's a
 * regression worth catching independently of any snippet comparison.
 *
 * The exact wire URL is visible in the response preview pane; this spec
 * intentionally doesn't pin specific encoded forms (the bytes axios puts
 * on the wire can differ from what the snippet displays — that's by
 * design for OFF mode).
 */
test.describe.serial('Send Request — every fixture, ON and OFF', () => {
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
    // params:path
    'params-path-odata',
    'params-path-space',
    'path-param-slash',
    'path-param-hash',
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
