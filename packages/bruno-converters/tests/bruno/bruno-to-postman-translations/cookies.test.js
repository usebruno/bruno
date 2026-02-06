import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Cookies Translation', () => {
  // Cookie jar translation
  it('should translate bru.cookies.jar to pm.cookies.jar', () => {
    const code = 'const jar = bru.cookies.jar();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const jar = pm.cookies.jar();');
  });

  // Cookie method translations with direct jar call chaining
  it('should translate getCookie to get (direct chaining)', () => {
    const code = 'const sessionId = bru.cookies.jar().getCookie("https://example.com", "sessionId");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const sessionId = pm.cookies.jar().get("https://example.com", "sessionId");');
  });

  it('should translate getCookies to getAll (direct chaining)', () => {
    const code = 'const allCookies = bru.cookies.jar().getCookies("https://example.com");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const allCookies = pm.cookies.jar().getAll("https://example.com");');
  });

  it('should translate setCookie to set (direct chaining)', () => {
    const code = 'bru.cookies.jar().setCookie("https://example.com", "token", "abc123");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.cookies.jar().set("https://example.com", "token", "abc123");');
  });

  it('should translate deleteCookie to unset (direct chaining)', () => {
    const code = 'bru.cookies.jar().deleteCookie("https://example.com", "sessionId");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.cookies.jar().unset("https://example.com", "sessionId");');
  });

  it('should translate deleteCookies to clear (direct chaining)', () => {
    const code = 'bru.cookies.jar().deleteCookies("https://example.com");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.cookies.jar().clear("https://example.com");');
  });

  // Cookie method translations with jar variable
  it('should translate getCookie to get (jar variable)', () => {
    const code = `
const jar = bru.cookies.jar();
const sessionId = jar.getCookie("https://example.com", "sessionId");
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const sessionId = jar.get("https://example.com", "sessionId");');
  });

  it('should translate getCookies to getAll (jar variable)', () => {
    const code = `
const jar = bru.cookies.jar();
const allCookies = jar.getCookies("https://example.com");
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const allCookies = jar.getAll("https://example.com");');
  });

  it('should translate setCookie to set (jar variable)', () => {
    const code = `
const jar = bru.cookies.jar();
jar.setCookie("https://example.com", "token", "abc123");
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.set("https://example.com", "token", "abc123");');
  });

  it('should translate deleteCookie to unset (jar variable)', () => {
    const code = `
const jar = bru.cookies.jar();
jar.deleteCookie("https://example.com", "sessionId");
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.unset("https://example.com", "sessionId");');
  });

  it('should translate deleteCookies to clear (jar variable)', () => {
    const code = `
const jar = bru.cookies.jar();
jar.deleteCookies("https://example.com");
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.clear("https://example.com");');
  });

  // Complex cookie scenarios
  it('should handle multiple cookie operations together', () => {
    const code = `
const jar = bru.cookies.jar();
const domain = "https://api.example.com";

// Check existing cookie
const existingToken = jar.getCookie(domain, "authToken");

if (!existingToken) {
    // Set new cookie
    jar.setCookie(domain, "authToken", bru.getEnvVar("token"));
}

// Get all cookies for logging
const allCookies = jar.getCookies(domain);
console.log("Current cookies:", allCookies);
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const existingToken = jar.get(domain, "authToken");');
    expect(translatedCode).toContain('jar.set(domain, "authToken", pm.environment.get("token"));');
    expect(translatedCode).toContain('const allCookies = jar.getAll(domain);');
  });

  it('should handle cookie cleanup scenario', () => {
    const code = `
const jar = bru.cookies.jar();
const domain = bru.getEnvVar("apiDomain");

// Clear specific cookies
jar.deleteCookie(domain, "session");
jar.deleteCookie(domain, "tempToken");

// Or clear all cookies
if (bru.getVar("clearAll") === "true") {
    jar.deleteCookies(domain);
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('const domain = pm.environment.get("apiDomain");');
    expect(translatedCode).toContain('jar.unset(domain, "session");');
    expect(translatedCode).toContain('jar.unset(domain, "tempToken");');
    expect(translatedCode).toContain('if (pm.variables.get("clearAll") === "true") {');
    expect(translatedCode).toContain('jar.clear(domain);');
  });

  // Direct cookie access API tests (bru.cookies.get/has/toObject)
  it('should translate bru.cookies.get to pm.cookies.get', () => {
    const code = 'const token = bru.cookies.get("authToken");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const token = pm.cookies.get("authToken");');
  });

  it('should translate bru.cookies.has to pm.cookies.has', () => {
    const code = 'const exists = bru.cookies.has("sessionId");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const exists = pm.cookies.has("sessionId");');
  });

  it('should translate bru.cookies.toObject to pm.cookies.toObject', () => {
    const code = 'const allCookies = bru.cookies.toObject();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const allCookies = pm.cookies.toObject();');
  });

  it('should translate bru.cookies.has in conditional', () => {
    const code = `if (bru.cookies.has("auth")) {
  console.log(bru.cookies.get("auth"));
}`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('if (pm.cookies.has("auth"))');
    expect(translatedCode).toContain('console.log(pm.cookies.get("auth"))');
  });

  it('should handle mixed direct cookie access and jar methods', () => {
    const code = `
const token = bru.cookies.get("authToken");
const jar = bru.cookies.jar();
jar.setCookie("https://example.com", "newCookie", "value");
const allCookies = bru.cookies.toObject();
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const token = pm.cookies.get("authToken");');
    expect(translatedCode).toContain('const jar = pm.cookies.jar();');
    expect(translatedCode).toContain('jar.set("https://example.com", "newCookie", "value");');
    expect(translatedCode).toContain('const allCookies = pm.cookies.toObject();');
  });
});
