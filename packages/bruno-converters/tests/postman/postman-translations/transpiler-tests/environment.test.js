import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Environment Variable Translation', () => {
  it('should translate pm.environment.get', () => {
    const code = 'pm.environment.get("test");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.get("test");');
  });

  it('should translate pm.environment.set', () => {
    const code = 'pm.environment.set("test", "value");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.set("test", "value");');
  });

  it('should translate pm.environment.has', () => {
    const code = 'pm.environment.has("test")';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.has("test")');
  });

  it('should translate pm.environment.unset', () => {
    const code = 'pm.environment.unset("test");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.unset("test");');
  });

  it('should translate pm.environment.name', () => {
    const code = 'pm.environment.name;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.name;');
  });

  it('should handle nested Postman API calls with environment', () => {
    const code = 'pm.environment.set("computed", pm.variables.get("base") + "-suffix");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.set("computed", bru.variables.get("base") + "-suffix");');
  });

  it('should handle JSON operations with environment variables', () => {
    const code = 'pm.environment.set("user", JSON.stringify({ id: 123, name: "John" }));';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.set("user", JSON.stringify({ id: 123, name: "John" }));');
  });

  it('should handle JSON.parse with environment variables', () => {
    const code = 'const userData = JSON.parse(pm.environment.get("user"));';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const userData = JSON.parse(bru.environment.get("user"));');
  });

  it('should translate pm.environment.name with different access patterns', () => {
    const code = `
        const envName1 = pm.environment.name;
        const env = pm.environment;
        const envName2 = env.name;
        console.log(pm.environment.name);
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const envName1 = bru.environment.name;
        const envName2 = bru.environment.name;
        console.log(bru.environment.name);
        `);
  });

  it('should handle environment aliases', () => {
    const code = `
        const env = pm.environment;
        const name = env.name;
        const has = env.has("test");
        const set = env.set("test", "value");
        const get = env.get("test");
        const unset = env.unset("test");
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        const name = bru.environment.name;
        const has = bru.environment.has("test");
        const set = bru.environment.set("test", "value");
        const get = bru.environment.get("test");
        const unset = bru.environment.unset("test");
        `);
  });

  // Legacy API (postman.) tests related to environment
  it('should translate postman.setEnvironmentVariable', () => {
    const code = 'postman.setEnvironmentVariable("apiKey", "abc123");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.set("apiKey", "abc123");');
  });

  it('should translate postman.getEnvironmentVariable', () => {
    const code = 'const baseUrl = postman.getEnvironmentVariable("baseUrl");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const baseUrl = bru.environment.get("baseUrl");');
  });

  it('should translate postman.clearEnvironmentVariable', () => {
    const code = 'postman.clearEnvironmentVariable("tempToken");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.environment.unset("tempToken");');
  });

  it('should handle all environment variable methods together', () => {
    const code = `
        // All environment variable methods
        const envName = pm.environment.name;
        const hasToken = pm.environment.has("token");
        const token = pm.environment.get("token");
        pm.environment.set("timestamp", new Date().toISOString());
        
        console.log(\`Environment: \${envName}, Has token: \${hasToken}, Token: \${token}\`);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('const envName = bru.environment.name;');
    expect(translatedCode).toContain('const hasToken = bru.environment.has("token");');
    expect(translatedCode).toContain('const token = bru.environment.get("token");');
    expect(translatedCode).toContain('bru.environment.set("timestamp", new Date().toISOString());');
  });

  // Additional robust tests for environment variables
  it('should handle environment variables with computed property names', () => {
    const code = `
        const prefix = "api";
        const suffix = "Key";
        pm.environment.set(prefix + "_" + suffix, "abc123");
        const computedValue = pm.environment.get(prefix + "_" + suffix);
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('bru.environment.set(prefix + "_" + suffix, "abc123");');
    expect(translatedCode).toContain('const computedValue = bru.environment.get(prefix + "_" + suffix);');
  });

  it('should handle environment variables in complex object structures', () => {
    const code = `
        const config = {
            baseUrl: pm.environment.get("apiUrl"),
            headers: {
                "Authorization": "Bearer " + pm.environment.get("token"),
                "X-Api-Key": pm.environment.get("apiKey") || "default-key"
            },
            timeout: parseInt(pm.environment.get("timeout") || "5000"),
            validate: pm.environment.has("validateResponses")
        };
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('baseUrl: bru.environment.get("apiUrl"),');
    expect(translatedCode).toContain('"Authorization": "Bearer " + bru.environment.get("token"),');
    expect(translatedCode).toContain('"X-Api-Key": bru.environment.get("apiKey") || "default-key"');
    expect(translatedCode).toContain('timeout: parseInt(bru.environment.get("timeout") || "5000"),');
    expect(translatedCode).toContain('validate: bru.environment.has("validateResponses")');
  });

  it('should handle environment variables in conditionals correctly', () => {
    const code = `
        if (pm.environment.has("apiKey")) {
            if (pm.environment.get("apiKey").length > 0) {
                console.log("Valid API key exists");
            } else {
                console.log("API key is empty");
            }
        } else {
            console.log("No API key defined");
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('if (bru.environment.has("apiKey")) {');
    expect(translatedCode).toContain('if (bru.environment.get("apiKey").length > 0) {');
  });

  it('should handle multiple levels of environment variable aliasing', () => {
    const code = `
        const env = pm.environment;
        
        env.set("key", "value");
        const value = env.get("key");
        const exists = env.has("key");
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe(`
        bru.environment.set("key", "value");
        const value = bru.environment.get("key");
        const exists = bru.environment.has("key");
        `);
  });

  it('should handle environment variables with dynamic values', () => {
    const code = `
        // Generate a timestamp for this request
        const timestamp = new Date().toISOString();
        pm.environment.set("requestTimestamp", timestamp);
        
        // Generate a unique ID
        const uniqueId = "req_" + Math.random().toString(36).substring(2, 15);
        pm.environment.set("requestId", uniqueId);
        
        // Calculate an expiry time (30 minutes from now)
        const expiryTime = new Date();
        expiryTime.setMinutes(expiryTime.getMinutes() + 30);
        pm.environment.set("tokenExpiry", expiryTime.getTime());
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('bru.environment.set("requestTimestamp", timestamp);');
    expect(translatedCode).toContain('bru.environment.set("requestId", uniqueId);');
    expect(translatedCode).toContain('bru.environment.set("tokenExpiry", expiryTime.getTime());');
  });

  it('should handle environment variables in try-catch blocks', () => {
    const code = `
        try {
            const configStr = pm.environment.get("config");
            const config = JSON.parse(configStr);
            console.log("Config loaded:", config.version);
        } catch (error) {
            console.error("Failed to parse config");
            pm.environment.set("configError", error.message);
        }
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('const configStr = bru.environment.get("config");');
    expect(translatedCode).toContain('bru.environment.set("configError", error.message);');
  });

  it('should handle legacy environment and pm.setEnvironmentVariable together', () => {
    const code = `
        // Legacy style
        postman.setEnvironmentVariable("legacyKey", "legacyValue");
        
        // Mixed with newer style
        const value = pm.environment.get("anotherKey");
        
        // Another legacy form
        pm.setEnvironmentVariable("thirdKey", "thirdValue");
        `;
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('bru.environment.set("legacyKey", "legacyValue");');
    expect(translatedCode).toContain('const value = bru.environment.get("anotherKey");');
    expect(translatedCode).toContain('bru.environment.set("thirdKey", "thirdValue");');
  });
});
