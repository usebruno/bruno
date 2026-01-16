import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Testing Framework Translation', () => {
  // Basic testing framework translations
  it('should translate pm.test', () => {
    const code = 'pm.test("Status code is 200", function() { pm.response.to.have.status(200); });';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('test("Status code is 200", function() { expect(res.getStatus()).to.equal(200); });');
  });

  it('should translate pm.expect', () => {
    const code = 'pm.expect(jsonData.success).to.be.true;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('expect(jsonData.success).to.be.true;');
  });

  it('should translate pm.expect.fail', () => {
    const code = 'if (!isValid) pm.expect.fail("Data is invalid");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('if (!isValid) expect.fail("Data is invalid");');
  });

  // Tests with response assertions
  it('should translate pm.response.to.have.status in tests', () => {
    const code = `
        pm.test("Check environment and call successful", function () {
            pm.expect(pm.environment.name).to.equal("ENVIRONMENT_NAME");
            pm.response.to.have.status(200);
        });`;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        test("Check environment and call successful", function () {
            expect(bru.getEnvName()).to.equal("ENVIRONMENT_NAME");
            expect(res.getStatus()).to.equal(200);
        });`);
  });

  // Test aliases
  it('should handle test aliases', () => {
    const code = `
        const { test, expect } = pm;
        
        test("Status code is 200", function () {
            expect(pm.response.code).to.equal(200);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).not.toContain('const { test, expect } = pm');
    expect(translatedCode).toContain('test("Status code is 200", function () {');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
  });

  // Tests inside different code structures
  it('should translate pm commands inside tests with nested functions', () => {
    const code = `
        pm.test("Auth flow works", function() {
            const response = pm.response.json();
            pm.expect(response.authenticated).to.be.true;
            pm.environment.set("userId", response.user.id);
            pm.collectionVariables.set("sessionId", response.session.id);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Auth flow works", function() {');
    expect(translatedCode).toContain('const response = res.getBody();');
    expect(translatedCode).toContain('expect(response.authenticated).to.be.true;');
    expect(translatedCode).toContain('bru.setEnvVar("userId", response.user.id);');
    expect(translatedCode).toContain('bru.setVar("sessionId", response.session.id);');
  });

  it('should translate pm.test with arrow functions', () => {
    const code = `
        pm.test("Status code is 200", () => {
            pm.expect(pm.response.code).to.eql(200);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Status code is 200", () => {');
    expect(translatedCode).toContain('expect(res.getStatus()).to.eql(200);');
  });

  it('should handle multiple test assertions in one function', () => {
    const code = `
        pm.test("The response has all properties", () => {
            const responseJson = pm.response.json();
            pm.expect(responseJson.type).to.eql('vip');
            pm.expect(responseJson.name).to.be.a('string');
            pm.expect(responseJson.id).to.have.lengthOf(1);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("The response has all properties", () => {');
    expect(translatedCode).toContain('const responseJson = res.getBody();');
    expect(translatedCode).toContain('expect(responseJson.type).to.eql(\'vip\');');
    expect(translatedCode).toContain('expect(responseJson.name).to.be.a(\'string\');');
    expect(translatedCode).toContain('expect(responseJson.id).to.have.lengthOf(1);');
  });

  // Test with aliased variables
  it('should translate aliases within test functions', () => {
    const code = `
        const tempRes = pm.response;
        const tempTest = pm.test;
        const tempExpect = pm.expect;

        tempTest("Status code is 200", function() { 
            tempExpect(tempRes.code).to.equal(200); 
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).not.toContain('const tempRes = pm.response;');
    expect(translatedCode).not.toContain('const tempTest = pm.test;');
    expect(translatedCode).not.toContain('const tempExpect = pm.expect;');
    expect(translatedCode).toContain('test("Status code is 200", function() {');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
  });

  // Additional robust tests for testing framework
  it('should handle nested test functions', () => {
    const code = `
        pm.test("Main test group", function() {
            const responseJson = pm.response.json();
            
            pm.test("User data validation", function() {
                pm.expect(responseJson.user).to.be.an('object');
                pm.expect(responseJson.user.id).to.be.a('string');
            });
            
            pm.test("Settings validation", function() {
                pm.expect(responseJson.settings).to.be.an('object');
                pm.expect(responseJson.settings.notifications).to.be.a('boolean');
            });
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Main test group", function() {');
    expect(translatedCode).toContain('const responseJson = res.getBody();');
    expect(translatedCode).toContain('test("User data validation", function() {');
    expect(translatedCode).toContain('expect(responseJson.user).to.be.an(\'object\');');
    expect(translatedCode).toContain('test("Settings validation", function() {');
    expect(translatedCode).toContain('expect(responseJson.settings.notifications).to.be.a(\'boolean\');');
  });

  it('should handle test with dynamic test names', () => {
    const code = `
        const endpoint = pm.variables.get("currentEndpoint");
        
        pm.test(\`\${endpoint} returns correct data\`, function() {
            const responseJson = pm.response.json();
            pm.expect(responseJson).to.be.an('object');
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const endpoint = bru.getVar("currentEndpoint");');
    expect(translatedCode).toContain('test(`${endpoint} returns correct data`, function() {');
    expect(translatedCode).toContain('const responseJson = res.getBody();');
    expect(translatedCode).toContain('expect(responseJson).to.be.an(\'object\');');
  });

  it('should handle test with conditional execution', () => {
    const code = `
        const responseJson = pm.response.json();
        
        if (responseJson.type === 'user') {
            pm.test("User validation", function() {
                pm.expect(responseJson.name).to.be.a('string');
                pm.expect(responseJson.email).to.be.a('string');
            });
        } else if (responseJson.type === 'admin') {
            pm.test("Admin validation", function() {
                pm.expect(responseJson.accessLevel).to.be.above(5);
                pm.expect(responseJson.permissions).to.be.an('array');
            });
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const responseJson = res.getBody();');
    expect(translatedCode).toContain('if (responseJson.type === \'user\') {');
    expect(translatedCode).toContain('test("User validation", function() {');
    expect(translatedCode).toContain('expect(responseJson.name).to.be.a(\'string\');');
    expect(translatedCode).toContain('} else if (responseJson.type === \'admin\') {');
    expect(translatedCode).toContain('test("Admin validation", function() {');
    expect(translatedCode).toContain('expect(responseJson.accessLevel).to.be.above(5);');
  });

  it('should handle assertions with logical operators', () => {
    const code = `
        pm.test("Response has valid structure", function() {
            const data = pm.response.json();
            
            pm.expect(data.id && data.name).to.be.ok;
            pm.expect(data.active || data.pending).to.be.true;
            pm.expect(!data.deleted).to.be.true;
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Response has valid structure", function() {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('expect(data.id && data.name).to.be.ok;');
    expect(translatedCode).toContain('expect(data.active || data.pending).to.be.true;');
    expect(translatedCode).toContain('expect(!data.deleted).to.be.true;');
  });

  it('should handle array and object assertions', () => {
    const code = `
        pm.test("Array and object validations", function() {
            const data = pm.response.json();
            
            // Array validations
            pm.expect(data.items).to.be.an('array');
            pm.expect(data.items).to.have.lengthOf.at.least(1);
            pm.expect(data.items[0]).to.have.property('id');
            
            // Object validations
            pm.expect(data.user).to.be.an('object');
            pm.expect(data.user).to.have.all.keys('id', 'name', 'email');
            pm.expect(data.user).to.include({active: true});
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Array and object validations", function() {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('expect(data.items).to.be.an(\'array\');');
    expect(translatedCode).toContain('expect(data.items).to.have.lengthOf.at.least(1);');
    expect(translatedCode).toContain('expect(data.items[0]).to.have.property(\'id\');');
    expect(translatedCode).toContain('expect(data.user).to.be.an(\'object\');');
    expect(translatedCode).toContain('expect(data.user).to.have.all.keys(\'id\', \'name\', \'email\');');
    expect(translatedCode).toContain('expect(data.user).to.include({active: true});');
  });

  it('should handle chai assertions with deep equality', () => {
    const code = `
        pm.test("Deep equality checks", function() {
            const data = pm.response.json();
            
            pm.expect(data.config).to.deep.equal({
                version: "1.0",
                active: true,
                features: ["search", "export"]
            });
            
            pm.expect(data.tags).to.have.members(['api', 'test']);
            pm.expect(data.meta).to.deep.include({format: 'json'});
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Deep equality checks", function() {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('expect(data.config).to.deep.equal({');
    expect(translatedCode).toContain('version: "1.0",');
    expect(translatedCode).toContain('active: true,');
    expect(translatedCode).toContain('features: ["search", "export"]');
    expect(translatedCode).toContain('expect(data.tags).to.have.members([\'api\', \'test\']);');
    expect(translatedCode).toContain('expect(data.meta).to.deep.include({format: \'json\'});');
  });

  it('should handle chai assertions with string comparisons', () => {
    const code = `
        pm.test("String validations", function() {
            const data = pm.response.json();
            
            pm.expect(data.id).to.be.a('string');
            pm.expect(data.name).to.match(/^[A-Za-z\\s]+$/);
            pm.expect(data.description).to.include('API');
            pm.expect(data.url).to.have.string('api/v1');
            pm.expect(data.code).to.have.lengthOf(8);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("String validations", function() {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('expect(data.id).to.be.a(\'string\');');
    expect(translatedCode).toContain('expect(data.name).to.match(/^[A-Za-z\\s]+$/);');
    expect(translatedCode).toContain('expect(data.description).to.include(\'API\');');
    expect(translatedCode).toContain('expect(data.url).to.have.string(\'api/v1\');');
    expect(translatedCode).toContain('expect(data.code).to.have.lengthOf(8);');
  });

  it('should handle assertions with numeric comparisons', () => {
    const code = `
        pm.test("Numeric validations", function() {
            const data = pm.response.json();
            
            pm.expect(data.count).to.be.a('number');
            pm.expect(data.count).to.be.above(0);
            pm.expect(data.price).to.be.within(10, 100);
            pm.expect(data.discount).to.be.at.most(25);
            pm.expect(data.quantity * data.price).to.equal(data.total);
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Numeric validations", function() {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('expect(data.count).to.be.a(\'number\');');
    expect(translatedCode).toContain('expect(data.count).to.be.above(0);');
    expect(translatedCode).toContain('expect(data.price).to.be.within(10, 100);');
    expect(translatedCode).toContain('expect(data.discount).to.be.at.most(25);');
    expect(translatedCode).toContain('expect(data.quantity * data.price).to.equal(data.total);');
  });

  it('should handle pm.expect.fail with conditions', () => {
    const code = `
        pm.test("Validate critical fields", function() {
            const data = pm.response.json();
            
            if (!data.id) {
                pm.expect.fail("Missing ID field");
            }
            
            if (data.status !== 'active' && data.status !== 'pending') {
                pm.expect.fail("Invalid status: " + data.status);
            }
            
            // Continue with normal assertions
            pm.expect(data.name).to.be.a('string');
        });
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('test("Validate critical fields", function() {');
    expect(translatedCode).toContain('const data = res.getBody();');
    expect(translatedCode).toContain('if (!data.id) {');
    expect(translatedCode).toContain('expect.fail("Missing ID field");');
    expect(translatedCode).toContain('if (data.status !== \'active\' && data.status !== \'pending\') {');
    expect(translatedCode).toContain('expect.fail("Invalid status: " + data.status);');
    expect(translatedCode).toContain('expect(data.name).to.be.a(\'string\');');
  });

  it('should handle complex test compositions', () => {
    const code = `
        // Helper function
        function validateUserObject(user) {
            pm.expect(user).to.be.an('object');
            pm.expect(user.id).to.be.a('string');
            pm.expect(user.name).to.be.a('string');
            return user.id && user.name;
        }
        
        pm.test("Response validation", function() {
            const response = pm.response.json();
            const validUsers = [];
            
            // Test status code
            pm.response.to.have.status(200);
            
            // Test main user
            if (response.user) {
                const isValid = validateUserObject(response.user);
                if (isValid) {
                    validUsers.push(response.user);
                }
            }
            
            // Test related users
            if (response.relatedUsers && Array.isArray(response.relatedUsers)) {
                pm.test("Related users validation", function() {
                    response.relatedUsers.forEach((user, index) => {
                        pm.test(\`User at index \${index}\`, function() {
                            const isValid = validateUserObject(user);
                            if (isValid) {
                                validUsers.push(user);
                            }
                        });
                    });
                });
            }
            
            // Set the valid users for later use
            if (validUsers.length > 0) {
                pm.environment.set("validUsers", JSON.stringify(validUsers));
            }
        });
        `;
    const translatedCode = translateCode(code);

    // Test key transformations
    expect(translatedCode).toContain('function validateUserObject(user) {');
    expect(translatedCode).toContain('expect(user).to.be.an(\'object\');');
    expect(translatedCode).toContain('test("Response validation", function() {');
    expect(translatedCode).toContain('const response = res.getBody();');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
    expect(translatedCode).toContain('test("Related users validation", function() {');
    expect(translatedCode).toContain('test(`User at index ${index}`, function() {');
    expect(translatedCode).toContain('bru.setEnvVar("validUsers", JSON.stringify(validUsers));');
  });
});
