import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Request Translation', () => {
  it('should translate req.getUrl() to pm.request.url (function to property)', () => {
    const code = 'const url = req.getUrl();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const url = pm.request.url;');
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

  it('should translate req.getHeader() to pm.request.headers.get()', () => {
    const code = 'const contentType = req.getHeader("Content-Type");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const contentType = pm.request.headers.get("Content-Type");');
  });

  it('should translate req.setHeader() to pm.request.headers.set()', () => {
    const code = 'req.setHeader("Authorization", "Bearer token123");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.request.headers.set("Authorization", "Bearer token123");');
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

    expect(translatedCode).toContain('const url = pm.request.url;');
    expect(translatedCode).toContain('const method = pm.request.method;');
    expect(translatedCode).toContain('const headers = pm.request.headers;');
    expect(translatedCode).toContain('const body = pm.request.body;');
    expect(translatedCode).toContain('const name = pm.info.requestName;');
  });

  it('should handle request properties in conditionals', () => {
    const code = `
if (req.getMethod() === 'POST' || req.getMethod() === 'PUT') {
    const body = req.getBody();
    console.log("Request body:", body);
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('if (pm.request.method === \'POST\' || pm.request.method === \'PUT\') {');
    expect(translatedCode).toContain('const body = pm.request.body;');
  });

  it('should handle request logging', () => {
    const code = `
console.log("Making request to:", req.getUrl());
console.log("Method:", req.getMethod());
console.log("Headers:", JSON.stringify(req.getHeaders()));
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('console.log("Making request to:", pm.request.url);');
    expect(translatedCode).toContain('console.log("Method:", pm.request.method);');
    expect(translatedCode).toContain('console.log("Headers:", JSON.stringify(pm.request.headers));');
  });
});
