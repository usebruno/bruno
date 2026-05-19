import { test, expect } from '../../../playwright';
import { openCollection } from '../../utils/page';
import { closeGenerateCodeDialog, getGeneratedSnippet, openRequestInFolder, setUrlEncoding } from './helpers';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

/**
 * Generate-Code with URL Encoding toggle OFF.
 *
 * All fixtures live in the single shared `collection/requests/` folder with
 * `encodeUrl: false` baked in — same files the ON spec uses. Each test
 * explicitly calls `setUrlEncoding(page, false)` to be defensive about state
 * that might be carried over within the same Electron worker.
 *
 * Contract: the snippet must preserve the user-typed URL byte-for-byte
 * (modulo HTTP-spec exceptions for the path on http-target). The
 * pre-encode-then-replace-back path in snippet-generator ensures chars
 * HTTPSnippet's HAR validator would reject (literal space / `[` / `<` /
 * unicode) still round-trip without "Error generating code snippet".
 *
 * Each test asserts the complete expected URL as a single contiguous
 * substring of the snippet — every char position is checked, not just
 * scattered per-param fragments.
 */
test.describe.serial('Generate Code – URL Encoding OFF', () => {
  test.describe('Query preservation', () => {
    test('preserves literal spaces in query values (no %20)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-spaces');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=John Doe&age=25');

      await closeGenerateCodeDialog(page);
    });

    test('preserves pre-encoded %20 / %40 without double-encoding', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-preencoded');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=John%20Doe&email=john%40example.com');

      await closeGenerateCodeDialog(page);
    });

    test('preserves equals signs in query values (token=abc123==)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-equals');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?token=abc123==&type=test');

      await closeGenerateCodeDialog(page);
    });

    test('preserves redirect URL with colons and slashes', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-redirect-url');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?path=/users/123&redirect=https://other.com');

      await closeGenerateCodeDialog(page);
    });

    test('preserves email with + alias and @ (test+alias@example.com)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-email-plus');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/invite?email=test+alias@example.com');

      await closeGenerateCodeDialog(page);
    });

    test('preserves comma-separated values and colon (tags=a,b,c&time=10:30)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-commas-colons');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/filter?tags=a,b,c&time=10:30');

      await closeGenerateCodeDialog(page);
    });

    test('preserves pipe operator in query values (no %7C)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-pipe');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?filter=status|active&sort=name|asc');

      await closeGenerateCodeDialog(page);
    });

    test('preserves unicode in query values (no %C3%A9 / %C3%BC)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-unicode');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=José&city=München');

      await closeGenerateCodeDialog(page);
    });

    test('preserves already-double-encoded values verbatim (mirror of ON canonical case)', async ({ pageWithUserData: page }) => {
      // Same fixture URL the ON spec uses — but here the toggle is OFF, so
      // the user-typed bytes round-trip unchanged. This is the contract a
      // user expects when they've already encoded their redirect URL
      // themselves and don't want Bruno to touch it.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-double-encode');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/login?redirect=https%3A%2F%2Fother.com%2Fcb&token=abc%2520xyz'
      );

      await closeGenerateCodeDialog(page);
    });

    test('preserves # literal in query value (no encoding)', async ({ pageWithUserData: page }) => {
      // `?query=aaa#bbb` stays as `?query=aaa#bbb`. OFF mode is the only mode
      // that retains fragment semantics — the `#` survives as a literal byte
      // in the displayed snippet (curl/fetch will treat it as a fragment on
      // the wire and drop it, but that's outside the snippet's concern).
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-hash');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?query=aaa#bbb');

      await closeGenerateCodeDialog(page);
    });

    test('preserves JSON-shaped array query values verbatim (no encoding, no validator error)', async ({ pageWithUserData: page }) => {
      // Literal `[` `]` `"` `,` and space would be rejected by HTTPSnippet's
      // HAR validator without the pre-encode-then-replace-back path. The
      // snippet still ends up containing the raw form.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-arrays');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).not.toBe('Error generating code snippet');
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/api?empty=[]&nums=[1, 2, 3]&strs=["string", "string"]&nested=[[1, 2, 3], ["string", "string"]]'
      );

      await closeGenerateCodeDialog(page);
    });
  });

  test.describe('Path preservation', () => {
    test('preserves literal spaces in path segments', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-spaces');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api/path with spaces/users');

      await closeGenerateCodeDialog(page);
    });

    test('preserves square brackets in path segments (no Error generating code snippet)', async ({ pageWithUserData: page }) => {
      // HTTPSnippet's HAR validator rejects literal `[` `]` — without the
      // pre-encode step in snippet-generator this returns the error string.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-brackets');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).not.toBe('Error generating code snippet');
      expect(snippet).toContain('http://localhost:8081/api/echo/path/list[123]');

      await closeGenerateCodeDialog(page);
    });

    test('preserves unicode in path segments (no %C3%A9)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-unicode');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/users/José/profile');

      await closeGenerateCodeDialog(page);
    });

    test('preserves pre-encoded %20 in path verbatim (no decode, no re-encode)', async ({ pageWithUserData: page }) => {
      // Mirror of the idempotency check ON does — OFF should leave the
      // already-encoded `%20` exactly as the user typed it.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-idempotent');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api/path%20with%20spaces/users');

      await closeGenerateCodeDialog(page);
    });

    test('preserves OData-style parenthesized path params and $ filters', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-odata');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/odata/Products(123)/Categories(456)?$expand=Items&$filter=Price gt 10'
      );

      await closeGenerateCodeDialog(page);
    });

    test('preserves URL fragment in snippet (intentional asymmetry vs ON)', async ({ pageWithUserData: page }) => {
      // Raw mode honors user intent — fragment is kept verbatim. ON mode
      // encodes `#` to %23 as data. See snippet-generator.spec.js for the
      // designed-behavior comment.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'fragment-preserved');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=john doe#section1');

      await closeGenerateCodeDialog(page);
    });
  });

  test.describe('Path-params table (params:path)', () => {
    test('does not throw for path-param value with literal space (regression: user-reported `aaa bbb`)', async ({ pageWithUserData: page }) => {
      // Repro: URL `http://localhost:8081/api/echo/path/users/:id` with `id = aaa bbb`.
      // After interpolateUrlPathParams (raw mode) the URL has a literal space:
      // `http://localhost:8081/api/echo/path/users/aaa bbb`. HTTPSnippet's HAR validator
      // rejects it → "Error generating code snippet". The pre-encode-then-
      // replace-back path in snippet-generator preserves the raw form.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'params-path-space');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).not.toBe('Error generating code snippet');
      expect(snippet).toContain('http://localhost:8081/api/echo/path/users/aaa bbb');

      await closeGenerateCodeDialog(page);
    });

    test('OData-style path with literal Tags("tag test") is preserved verbatim', async ({ pageWithUserData: page }) => {
      // Mirror of the ON canonical regression. In OFF mode all the literal
      // `"`, space, and quoted `:CategoryID` characters survive in the
      // displayed snippet exactly as the path-param substitution emits them.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'params-path-odata');
      await setUrlEncoding(page, false);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).not.toBe('Error generating code snippet');
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/odata/Category(\'category123\')/Item(item456)/foobar/Tags("tag test")'
      );

      await closeGenerateCodeDialog(page);
    });

    // Path-param substitution matrix — OFF mirror of url-encoding-on.spec.ts.
    // In raw mode the snippet preserves the user-typed value byte-for-byte
    // (the pre-encode-then-replace-back path in snippet-generator restores
    // the form after HAR validation). Caveats on the / # ? rows are the same
    // as in the ON spec — the literal-in-value semantic is lost as soon as
    // the char lands in the URL string, but OFF mode at least keeps those
    // bytes visible (including the `#bbb` fragment, intentional per the
    // designed-behavior comment in snippet-generator).
    const pathParamCases: Array<{ name: string; file: string; expected: string }> = [
      { name: '/ in value preserved (looks like two segments)', file: 'path-param-slash', expected: 'http://localhost:8081/api/echo/path/users/aaa/bbb' },
      { name: '# in value preserved as fragment marker (intentional asymmetry vs ON)', file: 'path-param-hash', expected: 'http://localhost:8081/api/echo/path/users/aaa#bbb' },
      { name: 'space in value preserved (John Doe stays literal)', file: 'path-param-space', expected: 'http://localhost:8081/api/echo/path/users/John Doe' },
      { name: '& in value preserved (a&b stays literal)', file: 'path-param-ampersand', expected: 'http://localhost:8081/api/echo/path/users/a&b' },
      { name: '= in value preserved (a=b stays literal)', file: 'path-param-equals', expected: 'http://localhost:8081/api/echo/path/users/a=b' },
      { name: '+ in value preserved (a+b stays literal)', file: 'path-param-plus', expected: 'http://localhost:8081/api/echo/path/users/a+b' },
      { name: '? in value preserved (becomes query separator — literal lost)', file: 'path-param-question', expected: 'http://localhost:8081/api/echo/path/users/a?b' },
      { name: '@ in value preserved (user@host stays literal)', file: 'path-param-at', expected: 'http://localhost:8081/api/echo/path/users/user@host' },
      { name: ': in value preserved (ISO timestamp stays literal)', file: 'path-param-colon', expected: 'http://localhost:8081/api/echo/path/users/2026-01-15T10:30:00' },
      { name: ', in value preserved (a,b,c stays literal)', file: 'path-param-comma', expected: 'http://localhost:8081/api/echo/path/users/a,b,c' },
      { name: 'unicode in value preserved (José stays literal)', file: 'path-param-unicode', expected: 'http://localhost:8081/api/echo/path/users/José' },
      { name: '[ ] in value preserved (list[1] stays literal, no validator error)', file: 'path-param-brackets', expected: 'http://localhost:8081/api/echo/path/users/list[1]' },
      { name: '{ } in value preserved ({x} stays literal)', file: 'path-param-braces', expected: 'http://localhost:8081/api/echo/path/users/{x}' },
      { name: '| in value preserved (a|b stays literal)', file: 'path-param-pipe', expected: 'http://localhost:8081/api/echo/path/users/a|b' }
    ];

    for (const c of pathParamCases) {
      test(c.name, async ({ pageWithUserData: page }) => {
        await openCollection(page, COLLECTION);
        await openRequestInFolder(page, FOLDER, c.file);
        await setUrlEncoding(page, false);

        const snippet = await getGeneratedSnippet(page);
        expect(snippet).not.toBe('Error generating code snippet');
        expect(snippet).toContain(c.expected);

        await closeGenerateCodeDialog(page);
      });
    }
  });
});
