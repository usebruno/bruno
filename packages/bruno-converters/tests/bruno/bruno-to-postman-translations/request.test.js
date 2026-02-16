import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Request Translation', () => {
  it('should translate req.getUrl() to pm.request.url (function to property)', () => {
    const code = 'const url = req.getUrl();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const url = pm.request.url;');
  });

  it('should translate req.url to pm.request.url (property to property)', () => {
    const code = 'const url = req.url;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const url = pm.request.url;');
  });

  it('should translate req.method to pm.request.method (property to property)', () => {
    const code = 'const method = req.method;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const method = pm.request.method;');
  });

  it('should translate req.headers to pm.request.headers (property to property)', () => {
    const code = 'const headers = req.headers;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const headers = pm.request.headers;');
  });

  it('should translate req.body to pm.request.body (property to property)', () => {
    const code = 'const body = req.body;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const body = pm.request.body;');
  });

  it('should translate req.getMethod() to pm.request.method (function to property)', () => {
    const code = 'const method = req.getMethod();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const method = pm.request.method;');
  });

  it('should translate req.getHeaders() to pm.request.headers (function to property)', () => {
    const code = 'const headers = req.getHeaders();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const headers = pm.request.headers;');
  });

  it('should translate req.getBody() to pm.request.body (function to property)', () => {
    const code = 'const body = req.getBody();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const body = pm.request.body;');
  });

  it('should translate req.getName() to pm.info.requestName (function to property)', () => {
    const code = 'const name = req.getName();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const name = pm.info.requestName;');
  });

  it('should translate req.getAuthMode() to pm.request.auth.type (function to property)', () => {
    const code = 'const authMode = req.getAuthMode();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const authMode = pm.request.auth.type;');
  });

  it('should handle req.getAuthMode() in conditionals', () => {
    const code = 'if (req.getAuthMode() === "oauth2") { console.log("OAuth2 auth"); }';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('if (pm.request.auth.type === "oauth2") { console.log("OAuth2 auth"); }');
  });

  it('should translate req.getHeader() to pm.request.headers.get()', () => {
    const code = 'const contentType = req.getHeader("Content-Type");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const contentType = pm.request.headers.get("Content-Type");');
  });

  it('should translate req.setHeader() to pm.request.headers.add() with object arg', () => {
    const code = 'req.setHeader("Authorization", "Bearer token123");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('pm.request.headers.add({\n  key: "Authorization",\n  value: "Bearer token123"\n})');
  });

  it('should translate req.deleteHeader() to pm.request.headers.remove()', () => {
    const code = 'req.deleteHeader("Authorization");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.request.headers.remove("Authorization");');
  });

  it('should handle req.deleteHeader() with a variable argument', () => {
    const code = 'const headerName = "X-Custom"; req.deleteHeader(headerName);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const headerName = "X-Custom"; pm.request.headers.remove(headerName);');
  });

  it('should handle all request properties together', () => {
    const code = `
// All request properties
const url = req.getUrl();
const method = req.getMethod();
const headers = req.getHeaders();
const body = req.getBody();
const name = req.getName();

console.log(\`Request: \${method} \${url} - \${name}\`);
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
// All request properties
const url = pm.request.url;
const method = pm.request.method;
const headers = pm.request.headers;
const body = pm.request.body;
const name = pm.info.requestName;

console.log(\`Request: \${method} \${url} - \${name}\`);
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle request properties in conditionals', () => {
    const code = `
if (req.getMethod() === 'POST' || req.getMethod() === 'PUT') {
    const body = req.getBody();
    console.log("Request body:", body);
}
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
if (pm.request.method === 'POST' || pm.request.method === 'PUT') {
    const body = pm.request.body;
    console.log("Request body:", body);
}
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should handle request logging', () => {
    const code = `
console.log("Making request to:", req.getUrl());
console.log("Method:", req.getMethod());
console.log("Headers:", JSON.stringify(req.getHeaders()));
`;
    const translatedCode = translateBruToPostman(code);
    const expected = `
console.log("Making request to:", pm.request.url);
console.log("Method:", pm.request.method);
console.log("Headers:", JSON.stringify(pm.request.headers));
`;
    expect(translatedCode.trim()).toBe(expected.trim());
  });

  it('should translate req.setUrl() to pm.request.url assignment', () => {
    const code = 'req.setUrl("https://api.example.com/users");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.request.url = "https://api.example.com/users";');
  });

  it('should translate req.setMethod() to pm.request.method assignment', () => {
    const code = 'req.setMethod("POST");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.request.method = "POST";');
  });

  it('should translate req.setBody() to pm.request.body.update()', () => {
    const code = 'req.setBody({name: "John", age: 30});';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.request.body.update({\n  mode: "raw",\n  raw: JSON.stringify({name: "John", age: 30})\n});');
  });

  it('should translate req.setHeaders() to pm.request.headers.upsert() calls', () => {
    const code = 'req.setHeaders({"Content-Type": "application/json", "Authorization": "Bearer token"});';
    const translatedCode = translateBruToPostman(code);
    // Should generate an IIFE with a for...in loop that calls upsert for each header
    expect(translatedCode).toBe('(function() {\n  const _headers = {"Content-Type": "application/json", "Authorization": "Bearer token"};\n\n  for (const key in _headers) {\n    pm.request.headers.upsert({\n      key: key,\n      value: _headers[key]\n    });\n  }\n})();');
  });

  it('should handle req.setUrl() with variable', () => {
    const code = 'const newUrl = "https://api.example.com"; req.setUrl(newUrl);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const newUrl = "https://api.example.com"; pm.request.url = newUrl;');
  });

  it('should handle req.setMethod() with variable', () => {
    const code = 'const method = "PUT"; req.setMethod(method);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const method = "PUT"; pm.request.method = method;');
  });

  it('should handle req.setBody() with variable', () => {
    const code = 'const body = {id: 1}; req.setBody(body);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const body = {id: 1}; pm.request.body.update({\n  mode: "raw",\n  raw: JSON.stringify(body)\n});');
  });

  // URL helper methods tests
  it('should translate req.getHost() to pm.request.url.getHost()', () => {
    const code = 'const host = req.getHost();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const host = pm.request.url.getHost();');
  });

  it('should translate req.getPath() to pm.request.url.getPath()', () => {
    const code = 'const path = req.getPath();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const path = pm.request.url.getPath();');
  });

  it('should translate req.getQueryString() to pm.request.url.getQueryString()', () => {
    const code = 'const queryString = req.getQueryString();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const queryString = pm.request.url.getQueryString();');
  });

  it('should translate req.getPathParams() to pm.request.url.variables (function to property)', () => {
    const code = 'const pathParams = req.getPathParams();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const pathParams = pm.request.url.variables;');
  });

  it('should handle URL methods in complex expressions', () => {
    const code = 'const fullUrl = req.getHost() + req.getPath() + "?" + req.getQueryString();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('pm.request.url.getHost()');
    expect(translatedCode).toContain('pm.request.url.getPath()');
    expect(translatedCode).toContain('pm.request.url.getQueryString()');
  });

  it('should handle req.getPathParams() in conditional', () => {
    const code = 'if (req.getPathParams().id) { console.log("Has ID"); }';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('pm.request.url.variables.id');
  });
});
