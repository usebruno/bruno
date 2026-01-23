import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Response Translation', () => {
  // Basic response property tests
  it('should translate pm.response.json', () => {
    const code = 'const jsonData = pm.response.json();';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const jsonData = res.getBody();');
  });

  it('should translate pm.response.code', () => {
    const code = 'if (pm.response.code === 200) { console.log("Success"); }';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('if (res.getStatus() === 200) { console.log("Success"); }');
  });

  it('should translate pm.response.text', () => {
    const code = 'const responseText = pm.response.text();';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const responseText = JSON.stringify(res.getBody());');
  });

  it('should translate pm.response.responseTime', () => {
    const code = 'console.log("Response time:", pm.response.responseTime);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('console.log("Response time:", res.getResponseTime());');
  });

  it('should translate pm.response.statusText', () => {
    const code = 'console.log("Status text:", pm.response.statusText);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('console.log("Status text:", res.statusText);');
  });

  it('should translate pm.response.headers', () => {
    const code = 'console.log("Headers:", pm.response.headers);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('console.log("Headers:", res.getHeaders());');
  });

  // Complex response transformations
  it('should transform pm.response.to.have.status', () => {
    const code = 'pm.response.to.have.status(201);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('expect(res.getStatus()).to.equal(201);');
  });

  it('should transform pm.response.to.have.header with single argument', () => {
    const code = 'pm.response.to.have.header("Content-Type");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase());');
  });

  it('should transform multiple pm.response.to.have.header statements', () => {
    const code = `
        pm.response.to.have.header("Content-Type", "application/json");
        pm.response.to.have.header("Cache-Control", "no-cache");
        `;
    const translatedCode = translateCode(code);

    // Check for the existence of all four assertions (two pairs)
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase(), "application/json");');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("Cache-Control".toLowerCase(), "no-cache");');
  });

  it('should transform pm.response.to.have.header inside control structures', () => {
    const code = `
        if (pm.response.code === 200) {
            pm.response.to.have.header("Content-Type", "application/json");
        }
        `;
    const translatedCode = translateCode(code);

    // The assertions should be inside the if block
    expect(translatedCode).toContain('if (res.getStatus() === 200) {');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase(), "application/json");');
  });

  it('should transform pm.response.to.have.header with variable parameters', () => {
    const code = `
        const headerName = "Content-Type";
        const expectedValue = "application/json";
        pm.response.to.have.header(headerName, expectedValue);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const headerName = "Content-Type";');
    expect(translatedCode).toContain('const expectedValue = "application/json";');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property(headerName.toLowerCase(), expectedValue);');
  });

  // Response aliases tests
  it('should handle response aliases', () => {
    const code = `
        const response = pm.response;
        const status = response.status;
        const body = response.json();
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const status = res.statusText;
        const body = res.getBody();
        `);
  });

  // Response to.have.status with different formats
  it('should handle pm.response.to.have.status with different status codes', () => {
    const code = `
        // Test different status codes
        pm.response.to.have.status(200); // OK
        pm.response.to.have.status(201); // Created
        pm.response.to.have.status(400); // Bad Request
        pm.response.to.have.status(404); // Not Found
        pm.response.to.have.status(500); // Server Error
        
        // With variables
        const expectedStatus = 200;
        pm.response.to.have.status(expectedStatus);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(201);');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(400);');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(404);');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(500);');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(expectedStatus);');
  });

  // Alias for pm.response.to.have.status
  it('should handle pm.response.to.have.status alias', () => {
    const code = `
        const resp = pm.response;
        resp.to.have.status(200);
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        expect(res.getStatus()).to.equal(200);
        `);
  });

  it('should handle pm.response.to.have.header alias', () => {
    const code = `
        const resp = pm.response;
        resp.to.have.header("Content-Type");
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase());
        `);
  });

  it('should handle pm.response.to.have.header alias with value check', () => {
    const code = `
        const resp = pm.response;
        resp.to.have.header("Content-Type", "application/json");
        `;
    const translatedCode = translateCode(code);

    // Check for both assertions when using an alias
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase(), "application/json");');
  });

  it('should translate response.status', () => {
    const code = `
        const resp = pm.response;
        const statusCode = resp.status;
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const statusCode = res.statusText;
        `);
  });

  it('should translate response.body', () => {
    const code = `
        const resp = pm.response;
        const responseBody = resp.json();
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const responseBody = res.getBody();
        `);
  });

  it('should translate response.headers', () => {
    const code = `
        const resp = pm.response;
        const headers = resp.headers;
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const headers = res.getHeaders();
        `);
  });

  it('should translate pm.response.statusText', () => {
    const code = `
        const resp = pm.response;
        const statusText = resp.statusText;
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const statusText = res.statusText;
        `);
  });

  it('should translate multiple response methods in one block', () => {
    const code = `
        const resp = pm.response;
        const statusCode = resp.code;
        const statusText = resp.statusText;
        const jsonData = resp.json();
        const responseText = resp.text();
        const time = resp.responseTime;
        resp.to.have.status(200);
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const statusCode = res.getStatus();
        const statusText = res.statusText;
        const jsonData = res.getBody();
        const responseText = JSON.stringify(res.getBody());
        const time = res.getResponseTime();
        expect(res.getStatus()).to.equal(200);
        `);
  });

  it('should handle accessing nested properties on response objects', () => {
    const code = `
        const resp = pm.response;
        const data = resp.json();
        if (data && data.user && data.user.id) {
            pm.environment.set("userId", data.user.id);
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).not.toContain('const resp = pm.response;');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('bru.setEnvVar("userId", data.user.id);');
  });

  it('should handle all response property methods together', () => {
    const code = `
        // All response property methods
        const statusCode = pm.response.code;
        const responseBody = pm.response.json();
        const responseText = pm.response.text();
        const statusText = pm.response.statusText;
        const responseTime = pm.response.responseTime;
        
        pm.test("Response is valid", function() {
            pm.response.to.have.status(200);
            pm.expect(responseBody).to.be.an('object');
            pm.expect(responseTime).to.be.below(1000);
            pm.expect(statusText).to.equal('OK');
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const statusCode = res.getStatus();');
    expect(translatedCode).toContain('const responseBody = res.getBody();');
    expect(translatedCode).toContain('const responseText = JSON.stringify(res.getBody());');
    expect(translatedCode).toContain('const responseTime = res.getResponseTime();');
    expect(translatedCode).toContain('const statusText = res.statusText;');
    expect(translatedCode).toContain('test("Response is valid", function() {');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
    expect(translatedCode).toContain('expect(responseBody).to.be.an(\'object\');');
    expect(translatedCode).toContain('expect(responseTime).to.be.below(1000);');
    expect(translatedCode).toContain('expect(statusText).to.equal(\'OK\');');
  });

  it('should handle pm objects with array access on response', () => {
    const code = `
        const items = pm.response.json().items;
        for (let i = 0; i < items.length; i++) {
            pm.collectionVariables.set("item_" + i, items[i].id);
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const items = res.getBody().items;');
    expect(translatedCode).toContain('bru.setVar("item_" + i, items[i].id);');
  });

  it('should handle response JSON with optional chaining and nullish coalescing', () => {
    const code = `
        const userId = pm.response.json()?.user?.id ?? "anonymous";
        const items = pm.response.json()?.data?.items || [];
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const userId = res.getBody()?.user?.id ?? "anonymous";');
    expect(translatedCode).toContain('const items = res.getBody()?.data?.items || [];');
  });

  it('should handle response headers with different access patterns', () => {
    // will need to handle get, set methods, bruno does not support this yet
    const code = `
        const contentType = pm.response.headers.get('Content-Type');
        const contentLength = pm.response.headers.get('Content-Length');
        console.log("contentType", contentType);
        console.log("contentLength", contentLength);
        
        pm.test("Headers are correct", function() {
            pm.response.to.have.header('Content-Type');
            pm.response.to.have.header('Content-Length');
            pm.expect(contentType).to.include('application/json');
        });
        `;
    const translatedCode = translateCode(code);

    // Check how header access is translated
    expect(translatedCode).toContain('const contentType = res.getHeader(\'Content-Type\');');
    expect(translatedCode).toContain('const contentLength = res.getHeader(\'Content-Length\');');
    expect(translatedCode).toContain('console.log("contentType", contentType);');
    expect(translatedCode).toContain('console.log("contentLength", contentLength);');
    expect(translatedCode).not.toContain('pm.test');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property(\'Content-Type\'.toLowerCase())');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property(\'Content-Length\'.toLowerCase())');
    expect(translatedCode).toContain('expect(contentType).to.include(\'application/json\')');
  });

  it('should transform response data with array destructuring', () => {
    const code = `
        const { id, name, items } = pm.response.json();
        const [first, second] = items;
        pm.environment.set("userId", id);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const { id, name, items } = res.getBody();');
    expect(translatedCode).toContain('const [first, second] = items;');
    expect(translatedCode).toContain('bru.setEnvVar("userId", id);');
  });

  it('should handle response in complex conditionals', () => {
    const code = `
        if (pm.response.code >= 200 && pm.response.code < 300) {
            if (pm.response.headers.get('Content-Type').includes('application/json')) {
                const data = pm.response.json();
                
                if (data.success === true && data.token) {
                    pm.environment.set("authToken", data.token);
                } else if (data.error) {
                    console.error("API error:", data.error);
                }
            }
        } else if (pm.response.code === 404) {
            console.log("Resource not found");
        } else {
            console.error("Request failed with status:", pm.response.code);
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('if (res.getStatus() >= 200 && res.getStatus() < 300) {');
    expect(translatedCode).toContain('if (res.getHeader(\'Content-Type\').includes(\'application/json\')) {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('bru.setEnvVar("authToken", data.token);');
    expect(translatedCode).toContain('} else if (res.getStatus() === 404) {');
    expect(translatedCode).toContain('console.error("Request failed with status:", res.getStatus());');
  });

  it('should handle response processing with try-catch', () => {
    const code = `
        try {
            const data = pm.response.json();
            pm.environment.set("userData", JSON.stringify(data.user));
        } catch (error) {
            console.error("Failed to parse response:", error);
            const text = pm.response.text();
            pm.environment.set("rawResponse", text);
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('bru.setEnvVar("userData", JSON.stringify(data.user));');
    expect(translatedCode).toContain('const text = JSON.stringify(res.getBody());');
    expect(translatedCode).toContain('bru.setEnvVar("rawResponse", text);');
  });

  it('should handle JSON path style access to response data', () => {
    const code = `
        const data = pm.response.json();
        const userId = data.user.id;
        const userEmail = data.user.contact.email;
        const firstItem = data.items[0];
        
        pm.environment.set("userId", userId);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('const userId = data.user.id;');
    expect(translatedCode).toContain('const userEmail = data.user.contact.email;');
    expect(translatedCode).toContain('const firstItem = data.items[0];');
    expect(translatedCode).toContain('bru.setEnvVar("userId", userId);');
  });

  it('should handle template literals with response data', () => {
    const code = `
        const data = pm.response.json();
        const welcomeMessage = \`Hello, \${data.user.name}! Your ID is \${data.user.id}.\`;
        
        pm.environment.set("welcomeMessage", welcomeMessage);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('const welcomeMessage = `Hello, ${data.user.name}! Your ID is ${data.user.id}.`;');
    expect(translatedCode).toContain('bru.setEnvVar("welcomeMessage", welcomeMessage);');
  });

  it('should handle response processing in arrow functions', () => {
    const code = `
        const processItems = () => {
            const items = pm.response.json().items;
            return items.map(item => item.id);
        };
        
        const itemIds = processItems();
        pm.environment.set("itemIds", JSON.stringify(itemIds));
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const items = res.getBody().items;');
    expect(translatedCode).toContain('return items.map(item => item.id);');
    expect(translatedCode).toContain('const itemIds = processItems();');
    expect(translatedCode).toContain('bru.setEnvVar("itemIds", JSON.stringify(itemIds));');
  });

  it('should handle complex inline operations with response data', () => {
    const code = `
        const items = pm.response.json().items;
        const totalValue = items.reduce((sum, item) => sum + item.price, 0);
        const highValueItems = items.filter(item => item.price > 100);
        const itemNames = items.map(item => item.name);
        
        pm.environment.set("totalValue", totalValue);
        pm.environment.set("highValueItemCount", highValueItems.length);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const items = res.getBody().items;');
    expect(translatedCode).toContain('const totalValue = items.reduce((sum, item) => sum + item.price, 0);');
    expect(translatedCode).toContain('const highValueItems = items.filter(item => item.price > 100);');
    expect(translatedCode).toContain('const itemNames = items.map(item => item.name);');
    expect(translatedCode).toContain('bru.setEnvVar("totalValue", totalValue);');
    expect(translatedCode).toContain('bru.setEnvVar("highValueItemCount", highValueItems.length);');
  });

  it('should handle complex test structure with pm.response.to.have.header', () => {
    const code = `
        pm.test("Response headers validation", function() {
            pm.response.to.have.header("Content-Type", "application/json");
            pm.response.to.have.header("Cache-Control");
            
            const responseTime = pm.response.responseTime;
            pm.expect(responseTime).to.be.below(1000);
        });
        `;
    const translatedCode = translateCode(code);

    // Check for test function conversion
    expect(translatedCode).toContain('test("Response headers validation", function() {');

    // Check for header assertions inside the test callback
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("Content-Type".toLowerCase(), "application/json");');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("Cache-Control".toLowerCase())');

    // Check that other test assertions are preserved
    expect(translatedCode).toContain('const responseTime = res.getResponseTime();');
    expect(translatedCode).toContain('expect(responseTime).to.be.below(1000);');
  });

  it('should handle dynamic header names in pm.response.to.have.header', () => {
    const code = `
        function checkHeaderPresent(headerName) {
            pm.response.to.have.header(headerName);
        }
        
        function validateHeader(headerName, expectedValue) {
            pm.response.to.have.header(headerName, expectedValue);
        }
        
        checkHeaderPresent("Authorization");
        validateHeader("Content-Type", "application/json");
        `;
    const translatedCode = translateCode(code);

    // Check function transformations
    expect(translatedCode).toContain('function checkHeaderPresent(headerName) {');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property(headerName.toLowerCase())');

    expect(translatedCode).toContain('function validateHeader(headerName, expectedValue) {');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property(headerName.toLowerCase(), expectedValue);');

    // Check function calls
    expect(translatedCode).toContain('checkHeaderPresent("Authorization");');
    expect(translatedCode).toContain('validateHeader("Content-Type", "application/json");');
  });

  it('should transform pm.response.to.have.body with string literal', () => {
    const code = 'pm.response.to.have.body("Expected response body");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('expect(res.getBody()).to.equal("Expected response body");');
  });

  it('should transform pm.response.to.have.body with variable parameter', () => {
    const code = `
        const expectedBody = {"status": "success", "data": [1, 2, 3]};
        pm.response.to.have.body(expectedBody);
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const expectedBody = {"status": "success", "data": [1, 2, 3]};');
    expect(translatedCode).toContain('expect(res.getBody()).to.equal(expectedBody);');
  });

  it('should transform pm.response.to.have.body with JSON object', () => {
    const code = `pm.response.to.have.body({"status": "success", "message": "Operation completed"});`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('expect(res.getBody()).to.equal({"status": "success", "message": "Operation completed"});');
  });

  it('should transform pm.response.to.have.body inside test function', () => {
    const code = `
        pm.test("Response body validation", function() {
            const expectedResponse = {"result": true};
            pm.response.to.have.body(expectedResponse);
        });
        `;
    const translatedCode = translateCode(code);
    const expectedOutput = `
        test("Response body validation", function() {
            const expectedResponse = {"result": true};
            expect(res.getBody()).to.equal(expectedResponse);
        });
        `;
    expect(translatedCode).toBe(expectedOutput);
  });

  it('should transform pm.response.to.have.body with response alias', () => {
    const code = `
        const resp = pm.response;
        resp.to.have.body({"status": "ok"});
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        expect(res.getBody()).to.equal({"status": "ok"});
        `);
  });

  // --- getSize translations ---------------------------
  it('should translate pm.response.size()', () => {
    const code = 'const size = pm.response.size();';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const size = res.getSize();');
  });

  it('should translate pm.response.size().body', () => {
    const code = 'const bodySize = pm.response.size().body;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const bodySize = res.getSize().body;');
  });

  it('should translate pm.response.size().header', () => {
    const code = 'const headerSize = pm.response.size().header;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const headerSize = res.getSize().header;');
  });

  it('should translate pm.response.size().total', () => {
    const code = 'const totalSize = pm.response.size().total;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const totalSize = res.getSize().total;');
  });

  it('should translate pm.response.responseSize alias', () => {
    const code = 'const responseSize = pm.response.responseSize;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const responseSize = res.getSize().body;');
  });
});
