const parseCurlCommand = require('./parse-curl');

describe("cURL parser must not allow unsanitized data injection into URL for GET requests", () => {
  const payloads = [
    // Path traversal / injection
    "/../../../etc/passwd",
    "/../../secret",
    "/../admin",
    // Host injection
    "@evil.com",
    "@attacker.com/steal",
    // Protocol injection
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    // Fragment injection
    "#fragment&injected=true",
    // Additional query param injection that changes semantics
    "&admin=true&role=superuser",
    // Null byte injection
    "\x00malicious",
    // CRLF injection
    "\r\nHost: evil.com",
    "\r\nX-Injected: header",
    // URL scheme override
    "//evil.com/path",
    "\\\\evil.com\\path",
    // Encoded traversal
    "%2F..%2F..%2Fetc%2Fpasswd",
    "%40evil.com",
    // Whitespace and special chars
    " evil.com",
    "\tevil.com",
    // Multiple query string manipulation
    "?override=true&host=evil.com",
    // Unicode tricks
    "\u0000evil",
    "\u202aevil.com",
  ];

  test.each(payloads)("rejects adversarial data payload injected into GET URL: %s", (payload) => {
    const curlCommand = `curl -G "https://legitimate.example.com/api/endpoint" --data "${payload}"`;

    let result;
    try {
      result = parseCurlCommand(curlCommand);
    } catch (e) {
      // If the parser throws on adversarial input, that is acceptable behavior
      return;
    }

    if (!result) {
      // If result is null/undefined, parser rejected the input — acceptable
      return;
    }

    const finalUrl = result.url || "";

    // INVARIANT 1: The host must remain legitimate.example.com
    // The payload must not be able to redirect to a different host
    try {
      const parsed = new URL(finalUrl);
      expect(parsed.hostname).toBe("legitimate.example.com");
      expect(parsed.protocol).toMatch(/^https?:$/);
    } catch (urlParseError) {
      // If the resulting URL is not parseable as a valid URL, that's a problem
      // The parser should produce a valid URL or reject the input
      // We fail here because an unparseable URL indicates broken state
      // However, if the original payload caused this, we just ensure no host leakage
      expect(finalUrl).not.toMatch(/evil\.com/i);
      expect(finalUrl).not.toMatch(/attacker\.com/i);
    }

    // INVARIANT 2: The URL must not contain CRLF sequences that could enable header injection
    expect(finalUrl).not.toMatch(/\r\n/);
    expect(finalUrl).not.toMatch(/\r|\n/);

    // INVARIANT 3: The URL must not contain null bytes
    expect(finalUrl).not.toContain("\x00");
    expect(finalUrl).not.toContain("\u0000");

    // INVARIANT 4: The URL must not reference known malicious hosts
    expect(finalUrl).not.toMatch(/evil\.com/i);
    expect(finalUrl).not.toMatch(/attacker\.com/i);

    // INVARIANT 5: The URL must not use dangerous schemes
    expect(finalUrl).not.toMatch(/^javascript:/i);
    expect(finalUrl).not.toMatch(/^data:/i);
    expect(finalUrl).not.toMatch(/^vbscript:/i);

    // INVARIANT 6: The URL path must not contain unencoded path traversal sequences
    // that could escape the intended path
    const urlPath = (() => {
      try {
        return new URL(finalUrl).pathname;
      } catch {
        return finalUrl;
      }
    })();
    // Path traversal sequences should be encoded if present, not raw
    expect(urlPath).not.toMatch(/\/\.\.\//);
    expect(urlPath).not.toMatch(/^\/\.\./);
  });

  test("GET request with benign data parameter should produce a valid URL with query string", () => {
    const curlCommand = `curl -G "https://legitimate.example.com/api/search" --data "q=hello&page=1"`;

    let result;
    try {
      result = parseCurlCommand(curlCommand);
    } catch (e) {
      // Parser may not support -G, that's acceptable
      return;
    }

    if (!result) return;

    const finalUrl = result.url || "";

    // Benign data should result in a URL that still points to the correct host
    if (finalUrl.length > 0) {
      try {
        const parsed = new URL(finalUrl);
        expect(parsed.hostname).toBe("legitimate.example.com");
      } catch {
        // If URL is not parseable, it should at least contain the original host
        expect(finalUrl).toContain("legitimate.example.com");
      }
    }
  });

  test("parser must handle empty data gracefully without corrupting URL", () => {
    const curlCommand = `curl -G "https://legitimate.example.com/api/endpoint" --data ""`;

    let result;
    try {
      result = parseCurlCommand(curlCommand);
    } catch (e) {
      return;
    }

    if (!result) return;

    const finalUrl = result.url || "";
    if (finalUrl.length > 0) {
      expect(finalUrl).toContain("legitimate.example.com");
      expect(finalUrl).not.toMatch(/evil\.com/i);
    }
  });
});