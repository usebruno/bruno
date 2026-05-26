import { test, expect } from '../../../playwright';
import { openCollection, closeGenerateCodeDialog, getGeneratedSnippet, openRequestInFolder, setUrlEncoding } from '../../utils/page';

const COLLECTION = 'generate-code-encoding';
const FOLDER = 'requests';

test.describe('Generate Code – URL Encoding ON', () => {
  test.describe('Query encoding', () => {
    test('encodes spaces in query values once (John Doe → John%20Doe)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-spaces');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=John%20Doe&age=25');

      await closeGenerateCodeDialog(page);
    });

    test('double-encodes pre-encoded values per PR #5507 contract (%20 → %2520, %40 → %2540)', async ({ pageWithUserData: page }) => {
      // Canary that proves no decode-encode wrap was slipped into the encoder.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-preencoded');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=John%2520Doe&email=john%2540example.com');

      await closeGenerateCodeDialog(page);
    });

    test('encodes structural chars in redirect-style query values (: → %3A, / → %2F)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-redirect-url');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?path=%2Fusers%2F123&redirect=https%3A%2F%2Fother.com');

      await closeGenerateCodeDialog(page);
    });

    test('encodes pipe operator in query values (| → %7C)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-pipe');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?filter=status%7Cactive&sort=name%7Casc');

      await closeGenerateCodeDialog(page);
    });

    test('encodes unicode in query values (é → %C3%A9)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-unicode');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=Jos%C3%A9&city=M%C3%BCnchen');

      await closeGenerateCodeDialog(page);
    });

    test('encodes equals signs in query values (== → %3D%3D)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-equals');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?token=abc123%3D%3D&type=test');

      await closeGenerateCodeDialog(page);
    });

    test('encodes email with + alias and @ (+ → %2B, @ → %40)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-email-plus');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/invite?email=test%2Balias%40example.com');

      await closeGenerateCodeDialog(page);
    });

    test('encodes comma-separated values and colon (, → %2C, : → %3A)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-commas-colons');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/filter?tags=a%2Cb%2Cc&time=10%3A30');

      await closeGenerateCodeDialog(page);
    });

    test('double-encodes redirect URL with all special chars pre-encoded (canonical PR #5507 case)', async ({ pageWithUserData: page }) => {
      // Same fixture URL the OFF spec uses. ON mode walks each %XX up one
      // encoding level (%3A → %253A, %2F → %252F), and the already-double-
      // encoded %2520 goes to %252520 — proving the encoder is content-blind
      // and runs encodeURIComponent regardless of pre-encoding state. This
      // is the contract redirect URLs depend on: after one server-side
      // URL-decode the value comes back single-encoded.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-double-encode');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/login?redirect=https%253A%252F%252Fother.com%252Fcb&token=abc%252520xyz'
      );

      await closeGenerateCodeDialog(page);
    });

    test('encodes # in query value as %23 (Option C — # is data, not a fragment delimiter)', async ({ pageWithUserData: page }) => {
      // `?query=aaa#bbb` → `?query=aaa%23bbb`. The `#` flows through
      // encodeUrl as a regular data byte rather than being split off as the
      // RFC 3986 §3.5 fragment. To keep `#bbb` as a literal fragment, the
      // user must toggle OFF (OFF preserves the URL byte-for-byte).
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-hash');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?query=aaa%23bbb');

      await closeGenerateCodeDialog(page);
    });

    test('encodes JSON-shaped array query values (issue #7913 reproducer)', async ({ pageWithUserData: page }) => {
      // Every [ ] , " and space in the array literals must be encoded so the
      // HAR validator accepts the URL. Covers empty, primitive, string, and
      // nested array shapes against the same fixture.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'query-arrays');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/api?empty=%5B%5D&nums=%5B1%2C%202%2C%203%5D&strs=%5B%22string%22%2C%20%22string%22%5D&nested=%5B%5B1%2C%202%2C%203%5D%2C%20%5B%22string%22%2C%20%22string%22%5D%5D'
      );

      await closeGenerateCodeDialog(page);
    });
  });

  test.describe('Path encoding', () => {
    test('encodes spaces in path segments (path with spaces → path%20with%20spaces)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-spaces');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api/path%20with%20spaces/users');

      await closeGenerateCodeDialog(page);
    });

    test('encodes square brackets in path segments ([123] → %5B123%5D)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-brackets');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/list%5B123%5D');

      await closeGenerateCodeDialog(page);
    });

    test('encodes unicode in path segments (José → Jos%C3%A9)', async ({ pageWithUserData: page }) => {
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-unicode');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/users/Jos%C3%A9/profile');

      await closeGenerateCodeDialog(page);
    });

    test('path encoding is idempotent — pre-encoded %20 stays single-encoded, not %2520', async ({ pageWithUserData: page }) => {
      // Regression guard: encodePathSegments uses safeDecodeURIComponent before
      // re-encoding so the runtime's `new URL().pathname` auto-encoding doesn't
      // get double-encoded downstream. Single-encoded form below implicitly
      // proves no %2520 leaked through.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-idempotent');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api/path%20with%20spaces/users');

      await closeGenerateCodeDialog(page);
    });

    test('encodes OData-style path with $ filters ($ → %24, space → %20)', async ({ pageWithUserData: page }) => {
      // Mirror of the OFF preservation test. In ON mode every byte outside
      // RFC 3986's unreserved set (`A-Za-z0-9-_.~`) gets encoded by
      // `encodeURIComponent` — so the OData `$` reserved-char becomes %24
      // and the literal space in `Price gt 10` becomes %20. Parens stay
      // as-is (encodeURIComponent leaves `(` and `)` unencoded).
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'path-odata');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/odata/Products(123)/Categories(456)?%24expand=Items&%24filter=Price%20gt%2010'
      );

      await closeGenerateCodeDialog(page);
    });

    test('encodes # as data (%23) — fragment delimiter has no special meaning in ON mode', async ({ pageWithUserData: page }) => {
      // Option C: `#` is treated as a regular URL byte and encoded to %23.
      // Fragment semantics are lost in ON mode by design — to keep `#section`
      // as a real fragment, toggle OFF (OFF preserves the URL byte-for-byte).
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'fragment-preserved');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain('http://localhost:8081/api/echo/path/api?name=john%20doe%23section1');

      await closeGenerateCodeDialog(page);
    });
  });

  test.describe('Path-params table (params:path)', () => {
    test('OData-style path with literal Tags("tag test") encodes once', async ({ pageWithUserData: page }) => {
      // Canonical regression: `new URL().pathname` pre-encodes `"` → %22
      // and space → %20, then encodeUrl runs over the result. Without
      // idempotent encodePathSegments the wire URL would contain %2522 / %2520.
      // The single-encoded form below proves idempotency held.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'params-path-odata');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).toContain(
        'http://localhost:8081/api/echo/path/odata/Category(\'category123\')/Item(item456)/foobar/Tags(%22tag%20test%22)'
      );

      await closeGenerateCodeDialog(page);
    });

    test('does not throw for path-param value with literal space (regression: user-reported `aaa bbb`)', async ({ pageWithUserData: page }) => {
      // Mirror of the OFF regression test — ON mode encodes the literal space.
      await openCollection(page, COLLECTION);
      await openRequestInFolder(page, FOLDER, 'params-path-space');
      await setUrlEncoding(page, true);

      const snippet = await getGeneratedSnippet(page);
      expect(snippet).not.toBe('Error generating code snippet');
      expect(snippet).toContain('http://localhost:8081/api/echo/path/users/aaa%20bbb');

      await closeGenerateCodeDialog(page);
    });

    // Path-param substitution matrix. Each row binds `:id` to a single value
    // and asserts the complete substituted URL appears in the snippet.
    //
    // Caveats for the / # ? rows: GenerateCodeItem invokes
    // interpolateUrlPathParams without an `encodeUrl` option, so the value is
    // substituted *raw* (see packages/bruno-app/src/utils/url/index.js).
    // Once the literal `/` `?` `#` lands in the URL string it becomes a
    // path-separator / query-marker / fragment-marker respectively — the
    // "literal in value" semantic is lost. The expectations below capture
    // what the snippet *actually* contains today (a regression canary), not
    // what an ideal encoder would produce.
    const pathParamCases: Array<{ name: string; file: string; expected: string }> = [
      { name: '/ in value (slash splits into two segments)', file: 'path-param-slash', expected: 'http://localhost:8081/api/echo/path/users/aaa/bbb' },
      // # in value: encodeUrl now treats `#` as data, so the snippet should
      // contain `%23bbb`. Path-only URL means the substitution lands in the
      // path-encoding stream (encodePathSegments) which encodes `#` to %23.
      { name: '# in value (encoded as %23 — Option C)', file: 'path-param-hash', expected: 'http://localhost:8081/api/echo/path/users/aaa%23bbb' },
      { name: 'space in value (John Doe → John%20Doe)', file: 'path-param-space', expected: 'http://localhost:8081/api/echo/path/users/John%20Doe' },
      { name: '& in value (a&b → a%26b)', file: 'path-param-ampersand', expected: 'http://localhost:8081/api/echo/path/users/a%26b' },
      { name: '= in value (a=b → a%3Db)', file: 'path-param-equals', expected: 'http://localhost:8081/api/echo/path/users/a%3Db' },
      { name: '+ in value (a+b → a%2Bb)', file: 'path-param-plus', expected: 'http://localhost:8081/api/echo/path/users/a%2Bb' },
      { name: '? in value (becomes query separator — literal lost)', file: 'path-param-question', expected: 'http://localhost:8081/api/echo/path/users/a?b' },
      { name: '@ in value (user@host → user%40host)', file: 'path-param-at', expected: 'http://localhost:8081/api/echo/path/users/user%40host' },
      { name: ': in value (ISO timestamp → 10%3A30%3A00)', file: 'path-param-colon', expected: 'http://localhost:8081/api/echo/path/users/2026-01-15T10%3A30%3A00' },
      { name: ', in value (a,b,c → a%2Cb%2Cc)', file: 'path-param-comma', expected: 'http://localhost:8081/api/echo/path/users/a%2Cb%2Cc' },
      { name: 'unicode in value (José → Jos%C3%A9)', file: 'path-param-unicode', expected: 'http://localhost:8081/api/echo/path/users/Jos%C3%A9' },
      { name: '[ ] in value (list[1] → list%5B1%5D)', file: 'path-param-brackets', expected: 'http://localhost:8081/api/echo/path/users/list%5B1%5D' },
      { name: '{ } in value ({x} → %7Bx%7D)', file: 'path-param-braces', expected: 'http://localhost:8081/api/echo/path/users/%7Bx%7D' },
      { name: '| in value (a|b → a%7Cb)', file: 'path-param-pipe', expected: 'http://localhost:8081/api/echo/path/users/a%7Cb' }
    ];

    for (const c of pathParamCases) {
      test(c.name, async ({ pageWithUserData: page }) => {
        await openCollection(page, COLLECTION);
        await openRequestInFolder(page, FOLDER, c.file);
        await setUrlEncoding(page, true);

        const snippet = await getGeneratedSnippet(page);
        expect(snippet).not.toBe('Error generating code snippet');
        expect(snippet).toContain(c.expected);

        await closeGenerateCodeDialog(page);
      });
    }
  });
});
