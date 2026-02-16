import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Postman to PM References Conversion', () => {
  // Basic conversions
  it('should convert basic postman references to pm', () => {
    const code = 'postman.setEnvironmentVariable("key", "value");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setEnvVar("key", "value");');
    // The key part is that it should convert postman.* to pm.* internally before
    // translating to bru.* APIs
  });

  it('should convert postman variable access to pm', () => {
    const code = 'const value = postman.getEnvironmentVariable("key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const value = bru.getEnvVar("key");');
  });

  it('should handle postman variable assignments', () => {
    const code = `
    const envVar = postman.environment.get("apiKey");
    const baseUrl = postman.environment.get("baseUrl");
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const envVar = bru.getEnvVar("apiKey");');
    expect(translatedCode).toContain('const baseUrl = bru.getEnvVar("baseUrl");');
  });

  // More complex patterns
  it('should handle mixed postman and pm references in the same code', () => {
    const code = `
    // Using both postman and pm APIs
    const apiKey = postman.environment.get("apiKey");
    const baseUrl = pm.environment.get("baseUrl");
    
    // Using both formats in a test
    postman.test("Status code is 200", function() {
        pm.expect(pm.response.code).to.equal(200);
    });
    `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const apiKey = bru.getEnvVar("apiKey");');
    expect(translatedCode).toContain('const baseUrl = bru.getEnvVar("baseUrl");');
    expect(translatedCode).toContain('test("Status code is 200", function() {');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200);');
  });

  it('should handle postman references in object destructuring', () => {
    const code = `
    const { environment } = postman;
    environment.set("key", "value");
    `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('bru.setEnvVar("key", "value");');
  });

  // Complex control flows
  it('should handle postman references in control flow statements', () => {
    const code = `
    if (postman.environment.get("isProduction") === "true") {
        const apiUrl = postman.environment.get("prodUrl");
        postman.setNextRequest("Production Flow");
    } else {
        const apiUrl = postman.environment.get("devUrl");
        postman.setNextRequest("Development Flow");
    }
    `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('if (bru.getEnvVar("isProduction") === "true") {');
    expect(translatedCode).toContain('const apiUrl = bru.getEnvVar("prodUrl");');
    expect(translatedCode).toContain('bru.setNextRequest("Production Flow");');
    expect(translatedCode).toContain('const apiUrl = bru.getEnvVar("devUrl");');
    expect(translatedCode).toContain('bru.setNextRequest("Development Flow");');
  });

  // Legacy response handling
  it('should handle legacy postman response methods', () => {
    const code = `
    // Using legacy response handling
    const responseCode = postman.response.code;
    const responseBody = postman.response.json();
    
    // Set environment variables with response data
    postman.setEnvironmentVariable("lastResponseCode", responseCode);
    `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const responseCode = res.getStatus();');
    expect(translatedCode).toContain('const responseBody = res.getBody();');
    expect(translatedCode).toContain('bru.setEnvVar("lastResponseCode", responseCode);');
  });

  // Postman in string literals should be untouched
  it('should not convert postman references in string literals', () => {
    const code = `
    console.log("This is a pm script");
    const message = "We're using pm to test our API";
    `;

    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('console.log("This is a pm script");');
    expect(translatedCode).toContain('const message = "We\'re using pm to test our API";');
  });

  // Complex example with aliasing
  it('should handle complex postman reference patterns with aliasing', () => {
    const code = `
    // Aliasing the postman object
    const env = postman.environment;
    const code = postman.code;
    
    // Using the alias
    const apiKey = env.get("apiKey");
    const userId = env.get("userId");
    
    // Using alias in tests
    postman.test("Response is valid", function() {
        postman.expect(code).to.equal(200);
    });
    `;

    const translatedCode = translateCode(code);
    // Should handle the aliases properly
    expect(translatedCode).toContain('const apiKey = bru.getEnvVar("apiKey");');
    expect(translatedCode).toContain('const userId = bru.getEnvVar("userId");');
    expect(translatedCode).toContain('test("Response is valid", function() {');
    expect(translatedCode).toContain('expect(code).to.equal(200);');
  });
});
