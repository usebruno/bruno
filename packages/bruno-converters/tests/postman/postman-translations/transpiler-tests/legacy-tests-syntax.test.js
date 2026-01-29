import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Legacy Tests[] Syntax Translation', () => {
  it('should handle tests[] commands', () => {
    const code = `
        tests["Status code is 200"] = pm.response.code === 200;`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Status code is 200", function() {
                expect(Boolean(res.getStatus() === 200)).to.be.true;
        });`);
  });

  it('should handle tests[] with complex expressions', () => {
    const code = `
        tests["Response has valid data"] = pm.response.json().data && pm.response.json().data.length > 0;`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Response has valid data", function() {
                expect(Boolean(res.getBody().data && res.getBody().data.length > 0)).to.be.true;
        });`);
  });

  it('should handle tests[] with string equality', () => {
    const code = `
        tests["Content-Type is application/json"] = pm.response.headers.get("Content-Type") === "application/json";`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Content-Type is application/json", function() {
                expect(Boolean(res.getHeader("Content-Type") === "application/json")).to.be.true;
        });`);
  });

  it('should handle tests[] with function calls', () => {
    const code = `
        tests["Response time is acceptable"] = pm.response.responseTime < 500;`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Response time is acceptable", function() {
                expect(Boolean(res.getResponseTime() < 500)).to.be.true;
        });`);
  });

  it('should handle tests[] with variable references', () => {
    const code = `
        const expectedStatus = 201;
        tests["Status code is correct"] = pm.response.code === expectedStatus;`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const expectedStatus = 201;
        test("Status code is correct", function() {
                expect(Boolean(res.getStatus() === expectedStatus)).to.be.true;
        });`);
  });

  it('should handle multiple tests[] statements', () => {
    const code = `
        tests["Status code is 200"] = pm.response.code === 200;
        tests["Response has data"] = pm.response.json().hasOwnProperty("data");`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Status code is 200", function() {
                expect(Boolean(res.getStatus() === 200)).to.be.true;
        });
        test("Response has data", function() {
                expect(Boolean(res.getBody().hasOwnProperty("data"))).to.be.true;
        });`);
  });

  it('should handle tests[] with special characters in name', () => {
    const code = `
        tests["Special characters: !@#$%^&*()"] = true;`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Special characters: !@#$%^&*()", function() {
                expect(Boolean(true)).to.be.true;
        });`);
  });

  it('should handle tests[] with pm.environment variables', () => {
    const code = `
        tests["Response matches environment variable"] = pm.response.json().id === pm.environment.get("expectedId");`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Response matches environment variable", function() {
                expect(Boolean(res.getBody().id === bru.getEnvVar("expectedId"))).to.be.true;
        });`);
  });

  it('should handle nested pm objects in tests[] assignments', () => {
    const code = `
        tests["Authentication header is present"] = pm.request.headers.has("Authorization");
        tests["Data count is correct"] = pm.response.json().items.length === pm.variables.get("expectedCount");
        `;
    const translatedCode = translateCode(code);

    // The exact translation might vary depending on implementation details,
    // but we can check for key transformations
    expect(translatedCode).toContain('test("Authentication header is present"');
    expect(translatedCode).toContain('test("Data count is correct"');
    expect(translatedCode).toContain('res.getBody().items.length === bru.getVar("expectedCount")');
  });

  // Additional robust tests for legacy tests[] syntax
  it('should handle tests[] with complex boolean expressions', () => {
    const code = `
        tests["Complex validation"] = (pm.response.code >= 200 && pm.response.code < 300) || 
                                     (pm.response.json().success === true && pm.response.json().data !== null);`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Complex validation", function() {');
    expect(translatedCode).toContain('expect(Boolean((res.getStatus() >= 200 && res.getStatus() < 300) ||');
    expect(translatedCode).toContain('(res.getBody().success === true && res.getBody().data !== null))).to.be.true;');
  });

  it('should handle tests[] with array methods', () => {
    const code = `
        tests["All items have an ID"] = pm.response.json().items.every(item => item.hasOwnProperty('id'));
        tests["Has premium item"] = pm.response.json().items.some(item => item.type === 'premium');`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("All items have an ID", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getBody().items.every(item => item.hasOwnProperty(\'id\')))).to.be.true;');
    expect(translatedCode).toContain('test("Has premium item", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getBody().items.some(item => item.type === \'premium\'))).to.be.true;');
  });

  it('should handle tests[] with template literals in the name', () => {
    const code = `
        const endpoint = "users";
        tests[\`Endpoint \${endpoint} returns valid response\`] = pm.response.code === 200;`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const endpoint = "users";');
    expect(translatedCode).toContain('test(`Endpoint ${endpoint} returns valid response`, function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getStatus() === 200)).to.be.true;');
  });

  it('should handle tests[] with deep property access', () => {
    const code = `
        tests["User has admin role"] = pm.response.json().user && 
                                     pm.response.json().user.roles && 
                                     pm.response.json().user.roles.includes('admin');`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("User has admin role", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getBody().user &&');
    expect(translatedCode).toContain('res.getBody().user.roles &&');
    expect(translatedCode).toContain('res.getBody().user.roles.includes(\'admin\'))).to.be.true;');
  });

  it('should handle tests[] with JSON schema validation patterns', () => {
    const code = `
        const schema = {
            type: "object",
            required: ["id", "name"],
            properties: {
                id: { type: "string" },
                name: { type: "string" }
            }
        };
        
        const data = pm.response.json();
        
        // Basic schema validation patterns
        tests["Has required fields"] = data.hasOwnProperty('id') && data.hasOwnProperty('name');
        tests["ID is string"] = typeof data.id === 'string';
        tests["Name is string"] = typeof data.name === 'string';`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const schema = {');
    expect(translatedCode).toContain('type: "object",');
    expect(translatedCode).toContain('required: ["id", "name"],');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('test("Has required fields", function() {');
    expect(translatedCode).toContain('expect(Boolean(data.hasOwnProperty(\'id\') && data.hasOwnProperty(\'name\'))).to.be.true;');
    expect(translatedCode).toContain('test("ID is string", function() {');
    expect(translatedCode).toContain('expect(Boolean(typeof data.id === \'string\')).to.be.true;');
  });

  it('should handle tests[] within conditional blocks', () => {
    const code = `
        const data = pm.response.json();
        
        if (pm.response.code === 200) {
            tests["Success response has data"] = data.hasOwnProperty('items');
            
            if (data.items.length > 0) {
                tests["First item has ID"] = data.items[0].hasOwnProperty('id');
            }
        } else {
            tests["Error response has message"] = data.hasOwnProperty('message');
        }`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('if (res.getStatus() === 200) {');
    expect(translatedCode).toContain('test("Success response has data", function() {');
    expect(translatedCode).toContain('expect(Boolean(data.hasOwnProperty(\'items\'))).to.be.true;');
    expect(translatedCode).toContain('if (data.items.length > 0) {');
    expect(translatedCode).toContain('test("First item has ID", function() {');
    expect(translatedCode).toContain('expect(Boolean(data.items[0].hasOwnProperty(\'id\'))).to.be.true;');
    expect(translatedCode).toContain('} else {');
    expect(translatedCode).toContain('test("Error response has message", function() {');
    expect(translatedCode).toContain('expect(Boolean(data.hasOwnProperty(\'message\'))).to.be.true;');
  });

  it('should handle tests[] with combination of legacy and modern styles', () => {
    const code = `
        // Legacy style
        tests["Status code is 200"] = pm.response.code === 200;
        
        // Modern style
        pm.test("Response has valid data", function() {
            const json = pm.response.json();
            pm.expect(json).to.be.an('object');
            pm.expect(json.items).to.be.an('array');
            
            // Mix by using tests[] inside pm.test
            tests["All items have price"] = json.items.every(item => item.hasOwnProperty('price'));
        });`;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Status code is 200", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getStatus() === 200)).to.be.true;');
    expect(translatedCode).toContain('test("Response has valid data", function() {');
    expect(translatedCode).toContain('const json = res.getBody();');
    expect(translatedCode).toContain('expect(json).to.be.an(\'object\');');
    expect(translatedCode).toContain('expect(json.items).to.be.an(\'array\');');
    expect(translatedCode).toContain('test("All items have price", function() {');
    expect(translatedCode).toContain('expect(Boolean(json.items.every(item => item.hasOwnProperty(\'price\')))).to.be.true;');
  });

  it('should handle complex real-world tests[] example', () => {
    const code = `
        // Parse response
        const response = pm.response.json();
        
        // Basic response validation
        tests["Status code is 200"] = pm.response.code === 200;
        tests["Response is valid JSON"] = response !== null && typeof response === 'object';
        
        // Check headers
        tests["Has content-type header"] = pm.response.headers.has("Content-Type");
        tests["Content-Type is JSON"] = pm.response.headers.get("Content-Type").includes("application/json");
        
        // Validate against expected values
        const expectedItems = parseInt(pm.environment.get("expectedItemCount"));
        tests["Has correct number of items"] = response.items.length === expectedItems;
        
        // Check for required fields on all items
        const requiredFields = ["id", "name", "price", "category"];
        tests["All items have required fields"] = response.items.every(item => {
            return requiredFields.every(field => item.hasOwnProperty(field));
        });
        
        // Validate specific business rules
        tests["No items with zero price"] = response.items.every(item => parseFloat(item.price) > 0);
        tests["Has at least one featured item"] = response.items.some(item => item.featured === true);
        
        // If we find a specific item we're looking for, save its ID for later
        const targetItem = response.items.find(item => item.name === pm.variables.get("targetItemName"));
        if (targetItem) {
            pm.environment.set("targetItemId", targetItem.id);
            tests["Found target item"] = true;
        }`;
    const translatedCode = translateCode(code);

    // Check key transformations
    expect(translatedCode).toContain('const response = res.getBody();');
    expect(translatedCode).toContain('test("Status code is 200", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getStatus() === 200)).to.be.true;');
    expect(translatedCode).toContain('test("Has content-type header", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getHeaders().has("Content-Type"))).to.be.true;');
    expect(translatedCode).toContain('test("Content-Type is JSON", function() {');
    expect(translatedCode).toContain('expect(Boolean(res.getHeader("Content-Type").includes("application/json"))).to.be.true;');
    expect(translatedCode).toContain('const expectedItems = parseInt(bru.getEnvVar("expectedItemCount"));');
    expect(translatedCode).toContain('test("Has correct number of items", function() {');
    expect(translatedCode).toContain('expect(Boolean(response.items.length === expectedItems)).to.be.true;');
    expect(translatedCode).toContain('const targetItem = response.items.find(item => item.name === bru.getVar("targetItemName"));');
    expect(translatedCode).toContain('bru.setEnvVar("targetItemId", targetItem.id);');
  });
});
