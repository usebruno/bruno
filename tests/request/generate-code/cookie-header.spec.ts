import { expect, test } from '../../../playwright';
import { closeGenerateCodeDialog, getGeneratedSnippet, openCollection, openRequestInFolder } from '../../utils/page';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

// Counts non-overlapping occurrences of `needle` in `haystack`.
const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

test.describe('Generate Code – cookie header (BRU-3783)', () => {
  test('a `cookie` header renders once, as --cookie, not duplicated as --header', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-single');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--cookie cookie1=value1');
    expect(snippet).not.toContain('--header \'cookie: cookie1=value1\'');
    expect(countOccurrences(snippet, 'cookie1=value1')).toBe(1);

    await closeGenerateCodeDialog(page);
  });

  test('multiple cookies in one header value are combined into a single --cookie flag', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-multi');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--cookie \'a=1; b=2\'');
    expect(snippet).not.toContain('--header');

    await closeGenerateCodeDialog(page);
  });

  test('a non-cookie header alongside a cookie header still renders as --header, unaffected', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-with-other-header');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--cookie cookie1=value1');
    expect(snippet).toContain('--header \'X-Custom: keep-me\'');
    expect(countOccurrences(snippet, 'cookie1=value1')).toBe(1);

    await closeGenerateCodeDialog(page);
  });

  test('a cookie value with characters encodeURIComponent would escape is not corrupted', async ({ pageWithUserData: page }) => {
    await openCollection(page, COLLECTION);
    await openRequestInFolder(page, FOLDER, 'cookie-header-special-chars');

    const snippet = await getGeneratedSnippet(page);

    expect(snippet).toContain('--cookie session=abc+def/ghi==');
    expect(snippet).not.toContain('%2B');
    expect(snippet).not.toContain('%2F');
    expect(snippet).not.toContain('%3D');

    await closeGenerateCodeDialog(page);
  });
});
