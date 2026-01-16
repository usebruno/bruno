import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Multiline Syntax Handling', () => {
  it('should handle basic multiline variable syntax with indentation', () => {
    const code = `
    const userId = pm.variables
                            .get("userId");
    pm.variables
                            .set("timestamp", new Date().toISOString());
    const hasToken = pm.variables
                            .has("token");
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
    const userId = bru.getVar("userId");
    bru.setVar("timestamp", new Date().toISOString());
    const hasToken = bru.hasVar("token");
    `);
  });

  it('should handle multiline environment variable syntax', () => {
    const code = `
    const baseUrl = pm
                .environment
                .get("baseUrl");
    pm
                .environment
                .set("requestTime", Date.now());
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
    const baseUrl = bru.getEnvVar("baseUrl");
    bru.setEnvVar("requestTime", Date.now());
    `);
  });

  it('should handle multiline collection variable syntax', () => {
    const code = `
    const apiKey = pm.collectionVariables
                            .get("apiKey");
    pm.collectionVariables
                            .set("lastRun", new Date().toISOString());
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
    const apiKey = bru.getVar("apiKey");
    bru.setVar("lastRun", new Date().toISOString());
    `);
  });

  it('should handle complex environment.has transformation with multiline syntax', () => {
    const code = `
    if (pm.environment
                    .has("apiKey")) {
      console.log("API Key exists");
    }
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
    if (bru.getEnvVar("apiKey") !== undefined && bru.getEnvVar("apiKey") !== null) {
      console.log("API Key exists");
    }
    `);
  });

  it('should handle response.to.have.status with multiline formatting', () => {
    const code = `
    pm.test("Status code is correct", function() {
      pm
        .response
          .to
            .have
              .status(200);
    });
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200)');
  });

  it('should handle response.to.have.header with multiline formatting', () => {
    const code = `
    pm.test("Content type is present", function() {
      pm
        .response
          .to
            .have
              .header("content-type");
    });
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("content-type".toLowerCase())');
  });

  it('should handle response properties with multiline syntax', () => {
    const code = `
    const responseBody = pm
                          .response
                            .json();
    const responseText = pm
                          .response
                            .text;
    const responseTime = pm
                          .response
                            .responseTime;
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const responseBody = res.getBody()');
    expect(translatedCode).toContain('const responseText = ');
    expect(translatedCode).toContain('const responseTime = res.getResponseTime()');
  });

  it('should handle execution flow control with multiline syntax', () => {
    const code = `
    // Stop execution
    pm
      .execution
        .setNextRequest(null);
    
    // Continue to next request
    pm
      .execution
        .setNextRequest("Next API Call");
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('// Stop execution');
    expect(translatedCode).toContain('// Continue to next request');
    expect(translatedCode).toContain('bru.runner.stopExecution()');
    expect(translatedCode).toContain('bru.runner.setNextRequest("Next API Call")');
  });

  it('should handle mixed normal and multiline syntax in the same code', () => {
    const code = `
    // Normal syntax
    const normalVar = pm.variables.get("normal");
    
    // Multiline syntax
    const multilineVar = pm.variables
                            .get("multiline");
    
    // Normal syntax again
    pm.variables.set("normalSet", "value");
    
    // Multiline syntax again
    pm.variables
                            .set("multilineSet", "value");
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
    // Normal syntax
    const normalVar = bru.getVar("normal");
    
    // Multiline syntax
    const multilineVar = bru.getVar("multiline");
    
    // Normal syntax again
    bru.setVar("normalSet", "value");
    
    // Multiline syntax again
    bru.setVar("multilineSet", "value");
    `);
  });

  it('should handle complex multiline method chaining', () => {
    const code = `
    pm
      .test("Test with chaining", function() {
        pm
          .response
            .to
              .have
                .status(200);
        
        const body = pm
                      .response
                        .json();
        
        pm
          .expect(body)
            .to
              .have
                .property('success')
                  .equal(true);
      });
    `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('test("Test with chaining", function() {');
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200)');
    expect(translatedCode).toContain('const body = res.getBody()');
    expect(translatedCode).toContain('.property(\'success\')');
    expect(translatedCode).toContain('.equal(true)');
  });

  it('should handle a comprehensive script with various multiline formats', () => {
    const code = `
    // This comprehensive script tests different multiline styles and whitespace variations
    
    // Environment variables with different formatting styles
    const baseUrl = pm.environment.get("baseUrl");
    const apiKey = pm
      .environment
        .get("apiKey");
    const userId = pm.environment
                      .get("userId");
                      
    // Mix of variable styles
    pm.variables.set("testId", "test-" + Date.now());
    pm
      .variables
        .set("timestamp", new Date().toISOString());
        
    // Collection variables with inconsistent spacing
    pm.collectionVariables
      .set("lastRun", new Date());
      
    // Complex conditionals with multiline expressions
    if (pm
          .environment
            .has("apiKey") && 
       pm.variables.has("testId")) {
      
      // Testing response with mixed syntax styles
      pm.test("Response validation", function() {
        // Normal style
        pm.response.to.have.status(200);
        
        // Multiline with different indentation
        pm
          .response
            .to
              .have
                .header("content-type");
                
        pm.response
                .to.have
                      .jsonBody("success", true);
                      
        // Extreme indentation
        pm
                                .response
                                              .to
                                                        .not
                                                                  .have
                                                                            .jsonBody("error");
      });
      
      // Flow control with mixed styles
      if (pm.response.code === 401) {
        pm.execution.setNextRequest(null);
      } else {
        pm
          .execution
            .setNextRequest("Next API Call");
      }
    }
    `;

    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const baseUrl = bru.getEnvVar("baseUrl")');
    expect(translatedCode).toContain('const apiKey = bru.getEnvVar("apiKey")');
    expect(translatedCode).toContain('const userId = bru.getEnvVar("userId")');

    // Check variables translations
    expect(translatedCode).toContain('bru.setVar("testId", "test-" + Date.now())');
    expect(translatedCode).toContain('bru.setVar("timestamp", new Date().toISOString())');

    // Check collection variables
    expect(translatedCode).toContain('bru.setVar("lastRun", new Date())');

    // Check complex conditionals
    expect(translatedCode).toContain('if (bru.getEnvVar("apiKey") !== undefined && bru.getEnvVar("apiKey") !== null &&');
    expect(translatedCode).toContain('bru.hasVar("testId"))');

    // Check response testing
    expect(translatedCode).toContain('expect(res.getStatus()).to.equal(200)');
    expect(translatedCode).toContain('expect(res.getHeaders()).to.have.property("content-type".toLowerCase())');

    // Check flow control
    expect(translatedCode).toContain('if (res.getStatus() === 401)');
    expect(translatedCode).toContain('bru.runner.stopExecution()');
    expect(translatedCode).toContain('bru.runner.setNextRequest("Next API Call")');
  });
});
