import { expect, test } from '../../../playwright';
import { closeGenerateCodeDialog, getGeneratedSnippet, openCollection, openRequestInFolder } from '../../utils/page';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

// Counts non-overlapping occurrences of `needle` in `haystack`.
const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

test.describe('Generate Code – cookie header (BRU-3783)', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeGenerateCodeDialog(page);
  });

  test('a `cookie` header is renamed to `Cookie` and renders once', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-single');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--header \'Cookie: cookie1=value1\'');
    expect(snippet).not.toContain('--cookie');
    expect(countOccurrences(snippet, 'cookie1=value1')).toBe(1);
  });

  test('multiple cookies in one header value stay combined in a single header, unsplit', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-multi');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--header \'Cookie: a=1; b=2\'');
    expect(snippet).not.toContain('--cookie');
  });

  test('a non-cookie header alongside a cookie header still renders as --header, unaffected', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-with-other-header');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--header \'Cookie: cookie1=value1\'');
    expect(snippet).toContain('--header \'X-Custom: keep-me\'');
    expect(countOccurrences(snippet, 'cookie1=value1')).toBe(1);
  });

  test('a cookie value with characters encodeURIComponent would escape is not corrupted', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-special-chars');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--header \'Cookie: session=abc+def/ghi==\'');
    expect(snippet).not.toContain('%2B');
    expect(snippet).not.toContain('%2F');
    expect(snippet).not.toContain('%3D');
  });

  test('cookie headers with different-case names (`Cookie`, `COOKIE`) are merged into one', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-mixed-case');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--header \'Cookie: cookie1=value1; cookie2=value2\'');
    expect(snippet).not.toContain('--cookie');
    expect(countOccurrences(snippet, '\'Cookie:')).toBe(1);
  });
});
