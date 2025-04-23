import translateCode from '../jscode-shift-translator';

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

    // Complex response transformations
    it('should transform pm.response.to.have.status', () => {
        const code = 'pm.response.to.have.status(201);';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('expect(res.getStatus()).to.equal(201);');
    });

    it('should transform pm.response.to.have.header', () => {
        const code = 'pm.response.to.have.header("Content-Type");';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe('expect(Object.keys(res.getHeaders())).to.include("Content-Type");');
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
        expect(Object.keys(res.getHeaders())).to.include("Content-Type");
        `);
    })

    
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
        expect(translatedCode).toContain('const contentType = res.getHeaders().get(\'Content-Type\');');
        expect(translatedCode).toContain('const contentLength = res.getHeaders().get(\'Content-Length\');');
        expect(translatedCode).toContain('console.log("contentType", contentType);');
        expect(translatedCode).toContain('console.log("contentLength", contentLength);');
        expect(translatedCode).not.toContain('pm.test')
        expect(translatedCode).toContain('expect(Object.keys(res.getHeaders())).to.include(\'Content-Type\')');
        expect(translatedCode).toContain('expect(Object.keys(res.getHeaders())).to.include(\'Content-Length\')');
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
        expect(translatedCode).toContain('if (res.getHeaders().get(\'Content-Type\').includes(\'application/json\')) {');
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
}); 