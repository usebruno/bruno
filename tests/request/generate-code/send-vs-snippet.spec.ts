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
