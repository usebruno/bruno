import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Testing Framework Translation', () => {
  // Basic testing framework translations
  it('should translate test() to pm.test()', () => {
    const code = 'test("Status code is 200", function() { expect(res.getStatus()).to.equal(200); });';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.test("Status code is 200", function() { pm.expect(pm.response.code).to.equal(200); });');
  });

  it('should translate expect() to pm.expect()', () => {
    const code = 'expect(jsonData.success).to.be.true;';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.expect(jsonData.success).to.be.true;');
  });

  it('should translate expect.fail() to pm.expect.fail()', () => {
    const code = 'if (!isValid) expect.fail("Data is invalid");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('if (!isValid) pm.expect.fail("Data is invalid");');
  });

  // Tests with response assertions
  it('should translate test with status check', () => {
    const code = `
test("Check environment and call successful", function () {
    expect(bru.getEnvName()).to.equal("ENVIRONMENT_NAME");
    expect(res.getStatus()).to.equal(200);
});`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe(`
pm.test("Check environment and call successful", function () {
    pm.expect(pm.environment.name).to.equal("ENVIRONMENT_NAME");
    pm.expect(pm.response.code).to.equal(200);
});`);
  });

  // Test with arrow functions
  it('should translate test with arrow functions', () => {
    const code = `
test("Status code is 200", () => {
    expect(res.getStatus()).to.equal(200);
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("Status code is 200", () => {');
    expect(translatedCode).toContain('pm.expect(pm.response.code).to.equal(200);');
  });

  it('should handle multiple test assertions in one function', () => {
    const code = `
test("The response has all properties", () => {
    const responseJson = res.getBody();
    expect(responseJson.type).to.eql('vip');
    expect(responseJson.name).to.be.a('string');
    expect(responseJson.id).to.have.lengthOf(1);
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("The response has all properties", () => {');
    expect(translatedCode).toContain('const responseJson = pm.response.json();');
    expect(translatedCode).toContain('pm.expect(responseJson.type).to.eql(\'vip\');');
    expect(translatedCode).toContain('pm.expect(responseJson.name).to.be.a(\'string\');');
    expect(translatedCode).toContain('pm.expect(responseJson.id).to.have.lengthOf(1);');
  });

  // Tests inside different code structures
  it('should translate test commands inside tests with nested functions', () => {
    const code = `
test("Auth flow works", function() {
    const response = res.getBody();
    expect(response.authenticated).to.be.true;
    bru.setEnvVar("userId", response.user.id);
    bru.setVar("sessionId", response.session.id);
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("Auth flow works", function() {');
    expect(translatedCode).toContain('const response = pm.response.json();');
    expect(translatedCode).toContain('pm.expect(response.authenticated).to.be.true;');
    expect(translatedCode).toContain('pm.environment.set("userId", response.user.id);');
    expect(translatedCode).toContain('pm.variables.set("sessionId", response.session.id);');
  });

  it('should handle nested test functions', () => {
    const code = `
test("Main test group", function() {
    const responseJson = res.getBody();

    test("User data validation", function() {
        expect(responseJson.user).to.be.an('object');
        expect(responseJson.user.id).to.be.a('string');
    });

    test("Settings validation", function() {
        expect(responseJson.settings).to.be.an('object');
        expect(responseJson.settings.notifications).to.be.a('boolean');
    });
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("Main test group", function() {');
    expect(translatedCode).toContain('const responseJson = pm.response.json();');
    expect(translatedCode).toContain('pm.test("User data validation", function() {');
    expect(translatedCode).toContain('pm.expect(responseJson.user).to.be.an(\'object\');');
    expect(translatedCode).toContain('pm.test("Settings validation", function() {');
    expect(translatedCode).toContain('pm.expect(responseJson.settings.notifications).to.be.a(\'boolean\');');
  });

  it('should handle test with dynamic test names', () => {
    const code = `
const endpoint = bru.getVar("currentEndpoint");

test(\`\${endpoint} returns correct data\`, function() {
    const responseJson = res.getBody();
    expect(responseJson).to.be.an('object');
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const endpoint = pm.variables.get("currentEndpoint");');
    expect(translatedCode).toContain('pm.test(`${endpoint} returns correct data`, function() {');
    expect(translatedCode).toContain('const responseJson = pm.response.json();');
    expect(translatedCode).toContain('pm.expect(responseJson).to.be.an(\'object\');');
  });

  it('should handle test with conditional execution', () => {
    const code = `
const responseJson = res.getBody();

if (responseJson.type === 'user') {
    test("User validation", function() {
        expect(responseJson.name).to.be.a('string');
        expect(responseJson.email).to.be.a('string');
    });
} else if (responseJson.type === 'admin') {
    test("Admin validation", function() {
        expect(responseJson.accessLevel).to.be.above(5);
        expect(responseJson.permissions).to.be.an('array');
    });
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const responseJson = pm.response.json();');
    expect(translatedCode).toContain('if (responseJson.type === \'user\') {');
    expect(translatedCode).toContain('pm.test("User validation", function() {');
    expect(translatedCode).toContain('pm.expect(responseJson.name).to.be.a(\'string\');');
    expect(translatedCode).toContain('} else if (responseJson.type === \'admin\') {');
    expect(translatedCode).toContain('pm.test("Admin validation", function() {');
    expect(translatedCode).toContain('pm.expect(responseJson.accessLevel).to.be.above(5);');
  });

  it('should handle assertions with logical operators', () => {
    const code = `
test("Response has valid structure", function() {
    const data = res.getBody();

    expect(data.id && data.name).to.be.ok;
    expect(data.active || data.pending).to.be.true;
    expect(!data.deleted).to.be.true;
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("Response has valid structure", function() {');
    expect(translatedCode).toContain('const data = pm.response.json();');
    expect(translatedCode).toContain('pm.expect(data.id && data.name).to.be.ok;');
    expect(translatedCode).toContain('pm.expect(data.active || data.pending).to.be.true;');
    expect(translatedCode).toContain('pm.expect(!data.deleted).to.be.true;');
  });

  it('should handle array and object assertions', () => {
    const code = `
test("Array and object validations", function() {
    const data = res.getBody();

    // Array validations
    expect(data.items).to.be.an('array');
    expect(data.items).to.have.lengthOf.at.least(1);
    expect(data.items[0]).to.have.property('id');

    // Object validations
    expect(data.user).to.be.an('object');
    expect(data.user).to.have.all.keys('id', 'name', 'email');
    expect(data.user).to.include({active: true});
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("Array and object validations", function() {');
    expect(translatedCode).toContain('const data = pm.response.json();');
    expect(translatedCode).toContain('pm.expect(data.items).to.be.an(\'array\');');
    expect(translatedCode).toContain('pm.expect(data.items).to.have.lengthOf.at.least(1);');
    expect(translatedCode).toContain('pm.expect(data.items[0]).to.have.property(\'id\');');
    expect(translatedCode).toContain('pm.expect(data.user).to.be.an(\'object\');');
    expect(translatedCode).toContain('pm.expect(data.user).to.have.all.keys(\'id\', \'name\', \'email\');');
    expect(translatedCode).toContain('pm.expect(data.user).to.include({active: true});');
  });

  it('should handle expect.fail with conditions', () => {
    const code = `
test("Validate critical fields", function() {
    const data = res.getBody();

    if (!data.id) {
        expect.fail("Missing ID field");
    }

    if (data.status !== 'active' && data.status !== 'pending') {
        expect.fail("Invalid status: " + data.status);
    }

    // Continue with normal assertions
    expect(data.name).to.be.a('string');
});
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('pm.test("Validate critical fields", function() {');
    expect(translatedCode).toContain('const data = pm.response.json();');
    expect(translatedCode).toContain('if (!data.id) {');
    expect(translatedCode).toContain('pm.expect.fail("Missing ID field");');
    expect(translatedCode).toContain('if (data.status !== \'active\' && data.status !== \'pending\') {');
    expect(translatedCode).toContain('pm.expect.fail("Invalid status: " + data.status);');
    expect(translatedCode).toContain('pm.expect(data.name).to.be.a(\'string\');');
  });
});
