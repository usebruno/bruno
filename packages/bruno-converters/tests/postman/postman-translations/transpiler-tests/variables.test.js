import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Variables Translation', () => {
  // Regular variables tests
  it('should translate pm.variables.get', () => {
    const code = 'pm.variables.get("test");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.getVar("test");');
  });

  it('should translate pm.variables.set', () => {
    const code = 'pm.variables.set("test", "value");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.setVar("test", "value");');
  });

  it('should translate pm.variables.has', () => {
    const code = 'pm.variables.has("userId");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.hasVar("userId");');
  });

  it('should translate pm.variables.replaceIn', () => {
    const code = 'pm.variables.replaceIn("Hello {{name}}");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.interpolate("Hello {{name}}");');
  });

  it('should translate pm.variables.replaceIn with variables and expressions', () => {
    const code = 'const greeting = pm.variables.replaceIn("Hello {{name}}, your user id is {{userId}}");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('const greeting = bru.interpolate("Hello {{name}}, your user id is {{userId}}");');
  });

  it('should translate pm.variables.replaceIn within complex expressions', () => {
    const code = 'const url = baseUrl + pm.variables.replaceIn("/users/{{userId}}/profile");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('const url = baseUrl + bru.interpolate("/users/{{userId}}/profile");');
  });

  it('should translate pm.variables.replaceIn with multiple nested variable references', () => {
    const code = 'const template = pm.variables.replaceIn("{{prefix}}-{{env}}-{{suffix}}");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('const template = bru.interpolate("{{prefix}}-{{env}}-{{suffix}}");');
  });

  it('should translate aliased variables.replaceIn', () => {
    const code = `
            const variables = pm.variables;
            const message = variables.replaceIn("Welcome, {{username}}!");
            `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe(`
            const message = bru.interpolate("Welcome, {{username}}!");
            `);
  });

  // Collection variables tests
  it('should translate pm.collectionVariables.get', () => {
    const code = 'pm.collectionVariables.get("apiUrl");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.getCollectionVar("apiUrl");');
  });

  // TODO: Restore once UI update fixes are live for setCollectionVar
  it.skip('should translate pm.collectionVariables.set', () => {
    const code = 'pm.collectionVariables.set("token", jsonData.token);';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.setCollectionVar("token", jsonData.token);');
  });

  it('should translate pm.collectionVariables.has', () => {
    const code = 'pm.collectionVariables.has("authToken");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.hasCollectionVar("authToken");');
  });

  // TODO: Restore once UI update fixes are live for deleteCollectionVar
  it.skip('should translate pm.collectionVariables.unset', () => {
    const code = 'pm.collectionVariables.unset("tempVar");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.deleteCollectionVar("tempVar");');
  });

  it('should handle pm.globals.get', () => {
    const code = 'pm.globals.get("test");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.getGlobalEnvVar("test");');
  });

  it('should handle pm.globals.set', () => {
    const code = 'pm.globals.set("test", "value");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.setGlobalEnvVar("test", "value");');
  });

  // Alias tests for variables
  it('should handle variables aliases', () => {
    const code = `
        const vars = pm.variables;
        const has = vars.has("test");
        const set = vars.set("test", "value");
        const get = vars.get("test");
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe(`
        const has = bru.hasVar("test");
        const set = bru.setVar("test", "value");
        const get = bru.getVar("test");
        `);
  });

  // Alias tests for collection variables
  // TODO: Restore once UI update fixes are live for setCollectionVar/deleteCollectionVar
  it.skip('should handle collection variables aliases', () => {
    const code = `
        const collVars = pm.collectionVariables;
        const has = collVars.has("test");
        const set = collVars.set("test", "value");
        const get = collVars.get("test");
        const unset = collVars.unset("test");
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe(`
        const has = bru.hasCollectionVar("test");
        const set = bru.setCollectionVar("test", "value");
        const get = bru.getCollectionVar("test");
        const unset = bru.deleteCollectionVar("test");
        `);
  });

  it('should handle pm.globals aliases', () => {
    const code = `
        const globals = pm.globals;
        const get = globals.get("test");
        const set = globals.set("test", "value");
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe(`
        const get = bru.getGlobalEnvVar("test");
        const set = bru.setGlobalEnvVar("test", "value");
        `);
  });

  // Combined tests
  it('should handle conditional expressions with variable calls', () => {
    const code = 'const userStatus = pm.variables.has("userId") ? "logged-in" : "guest";';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('const userStatus = bru.hasVar("userId") ? "logged-in" : "guest";');
  });

  it('should handle all variable methods together', () => {
    const code = `
        // All variable methods
        const hasUserId = pm.variables.has("userId");
        const userId = pm.variables.get("userId");
        pm.variables.set("requestTime", new Date().toISOString());
        
        console.log(\`Has userId: \${hasUserId}, User ID: \${userId}\`);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const hasUserId = bru.hasVar("userId");');
    expect(translatedCode).toContain('const userId = bru.getVar("userId");');
    expect(translatedCode).toContain('bru.setVar("requestTime", new Date().toISOString());');
  });

  // TODO: Restore once UI update fixes are live for setCollectionVar/deleteCollectionVar
  it.skip('should handle all collection variable methods together', () => {
    const code = `
        // All collection variable methods
        const hasApiUrl = pm.collectionVariables.has("apiUrl");
        const apiUrl = pm.collectionVariables.get("apiUrl");
        pm.collectionVariables.set("requestTime", new Date().toISOString());
        pm.collectionVariables.unset("tempVar");
        
        console.log(\`Has API URL: \${hasApiUrl}, API URL: \${apiUrl}\`);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const hasApiUrl = bru.hasCollectionVar("apiUrl");');
    expect(translatedCode).toContain('const apiUrl = bru.getCollectionVar("apiUrl");');
    expect(translatedCode).toContain('bru.setCollectionVar("requestTime", new Date().toISOString());');
    expect(translatedCode).toContain('bru.deleteCollectionVar("tempVar");');
  });

  // TODO: Restore once UI update fixes are live for setCollectionVar
  it.skip('should handle more complex nested expressions with variables', () => {
    const code = 'pm.collectionVariables.set("fullPath", pm.environment.get("baseUrl") + pm.variables.get("endpoint"));';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.setCollectionVar("fullPath", bru.getEnvVar("baseUrl") + bru.getVar("endpoint"));');
  });

  // replaceIn tests for different variable scopes
  it('should translate pm.globals.replaceIn', () => {
    const code = 'pm.globals.replaceIn("Hello {{name}}");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.interpolate("Hello {{name}}");');
  });

  it('should translate pm.environment.replaceIn', () => {
    const code = 'pm.environment.replaceIn("{{baseUrl}}/api");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.interpolate("{{baseUrl}}/api");');
  });

  it('should translate pm.collectionVariables.replaceIn', () => {
    const code = 'pm.collectionVariables.replaceIn("{{apiKey}}");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('bru.interpolate("{{apiKey}}");');
  });

  it('should translate pm.globals.replaceIn in assignment', () => {
    const code = 'const message = pm.globals.replaceIn("Welcome {{username}}!");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toBe('const message = bru.interpolate("Welcome {{username}}!");');
  });

  // pm.globals.has tests
  it('should translate pm.globals.has', () => {
    const code = 'pm.globals.has("token");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('bru.getGlobalEnvVar("token") !== undefined');
    expect(translatedCode).toContain('bru.getGlobalEnvVar("token") !== null');
  });

  it('should translate pm.globals.has in conditional', () => {
    const code = 'if (pm.globals.has("authToken")) { console.log("Token exists"); }';
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('bru.getGlobalEnvVar("authToken") !== undefined');
    expect(translatedCode).toContain('bru.getGlobalEnvVar("authToken") !== null');
    expect(translatedCode).toContain('console.log("Token exists");');
  });

  it('should translate pm.globals.has with variable assignment', () => {
    const code = 'const hasGlobal = pm.globals.has("config");';
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const hasGlobal = bru.getGlobalEnvVar("config") !== undefined && bru.getGlobalEnvVar("config") !== null');
  });
});
