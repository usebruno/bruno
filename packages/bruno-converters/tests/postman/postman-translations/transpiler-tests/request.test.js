import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Request Translation', () => {
  it('should translate pm.request.url', () => {
    const code = 'const requestUrl = pm.request.url;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const requestUrl = req.getUrl();');
  });

  it('should translate pm.request.method', () => {
    const code = 'const method = pm.request.method;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const method = req.getMethod();');
  });

  it('should translate pm.request.headers', () => {
    const code = 'const headers = pm.request.headers;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const headers = req.getHeaders();');
  });

  it('should translate pm.request.body', () => {
    const code = 'const body = pm.request.body;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const body = req.getBody();');
  });

  it('should translate pm.response.statusText', () => {
    const code = 'const statusText = pm.response.statusText;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const statusText = res.statusText;');
  });

  it('should translate multiple request methods in one block', () => {
    const code = `
        const url = pm.request.url;
        const method = pm.request.method;
        const headers = pm.request.headers;
        const body = pm.request.body;
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const url = req.getUrl();
        const method = req.getMethod();
        const headers = req.getHeaders();
        const body = req.getBody();
        `);
  });

  it('should handle request and response properties together', () => {
    const code = `
        // Get request data
        const url = pm.request.url;
        const method = pm.request.method;
        
        // Get response data
        const statusCode = pm.response.code;
        const statusText = pm.response.statusText;
        
        // Verify expectations
        pm.test("Request was made correctly", function() {
            pm.expect(method).to.equal("POST");
            pm.expect(url).to.include("/api/items");
        });
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const url = req.getUrl();');
    expect(translatedCode).toContain('const method = req.getMethod();');
    expect(translatedCode).toContain('const statusCode = res.getStatus();');
    expect(translatedCode).toContain('const statusText = res.statusText;');
    expect(translatedCode).toContain('test("Request was made correctly", function() {');
    expect(translatedCode).toContain('expect(method).to.equal("POST");');
    expect(translatedCode).toContain('expect(url).to.include("/api/items");');
  });

  it('should handle request properties in conditional blocks', () => {
    const code = `
        if (pm.request.method === "POST") {
            console.log("This is a POST request to " + pm.request.url);
            pm.test("Request has correct content-type", function() {
                pm.expect(pm.request.headers.has("Content-Type")).to.be.true;
            });
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('if (req.getMethod() === "POST") {');
    expect(translatedCode).toContain('console.log("This is a POST request to " + req.getUrl());');
    expect(translatedCode).toContain('test("Request has correct content-type", function() {');
    // Note: The expectation for headers.has might be transformed differently
    // depending on how complex transformations are handled
  });

  it('should handle request data extraction and variable setting', () => {
    const code = `
        // Extract request data
        const requestData = pm.request.body;
        const contentType = pm.request.headers.get("Content-Type");
        
        // Save for later use
        pm.variables.set("lastRequestBody", JSON.stringify(requestData));
        pm.environment.set("lastContentType", contentType);
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const requestData = req.getBody();');
    expect(translatedCode).toContain('bru.setVar("lastRequestBody", JSON.stringify(requestData));');
    expect(translatedCode).toContain('bru.setEnvVar("lastContentType", contentType);');
  });

  it('should translate legacy request.* properties', () => {
    const code = `
        const url = request.url;
        const method = request.method;
        const body = request.body;
        const name = request.name;
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const url = req.getUrl();
        const method = req.getMethod();
        const body = req.getBody();
        const name = req.getName();
        `);
  });
});
