import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Environment Variable Translation', () => {
  it('should translate pm.environment.get', () => {
    const code = 'pm.environment.get("test");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.getEnvVar("test");');
  });

  it('should translate pm.environment.set', () => {
    const code = 'pm.environment.set("test", "value");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setEnvVar("test", "value");');
  });

  it('should translate pm.environment.has', () => {
    const code = 'pm.environment.has("test")';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.getEnvVar("test") !== undefined && bru.getEnvVar("test") !== null');
  });

  it('should translate pm.environment.unset', () => {
    const code = 'pm.environment.unset("test");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.deleteEnvVar("test");');
  });

  it('should translate pm.environment.name', () => {
    const code = 'pm.environment.name;';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.getEnvName();');
  });

  it('should handle nested Postman API calls with environment', () => {
    const code = 'pm.environment.set("computed", pm.variables.get("base") + "-suffix");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setEnvVar("computed", bru.getVar("base") + "-suffix");');
  });

  it('should handle JSON operations with environment variables', () => {
    const code = 'pm.environment.set("user", JSON.stringify({ id: 123, name: "John" }));';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setEnvVar("user", JSON.stringify({ id: 123, name: "John" }));');
  });

  it('should handle JSON.parse with environment variables', () => {
    const code = 'const userData = JSON.parse(pm.environment.get("user"));';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const userData = JSON.parse(bru.getEnvVar("user"));');
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
        const envName1 = bru.getEnvName();
        const envName2 = bru.getEnvName();
        console.log(bru.getEnvName());
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
        const name = bru.getEnvName();
        const has = bru.getEnvVar("test") !== undefined && bru.getEnvVar("test") !== null;
        const set = bru.setEnvVar("test", "value");
        const get = bru.getEnvVar("test");
        const unset = bru.deleteEnvVar("test");
        `);
  });

  // Legacy API (postman.) tests related to environment
  it('should translate postman.setEnvironmentVariable', () => {
    const code = 'postman.setEnvironmentVariable("apiKey", "abc123");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setEnvVar("apiKey", "abc123");');
  });

  it('should translate postman.getEnvironmentVariable', () => {
    const code = 'const baseUrl = postman.getEnvironmentVariable("baseUrl");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const baseUrl = bru.getEnvVar("baseUrl");');
  });

  it('should translate postman.clearEnvironmentVariable', () => {
    const code = 'postman.clearEnvironmentVariable("tempToken");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.deleteEnvVar("tempToken");');
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

    expect(translatedCode).toContain('const envName = bru.getEnvName();');
    expect(translatedCode).toContain('const hasToken = bru.getEnvVar("token") !== undefined && bru.getEnvVar("token") !== null;');
    expect(translatedCode).toContain('const token = bru.getEnvVar("token");');
    expect(translatedCode).toContain('bru.setEnvVar("timestamp", new Date().toISOString());');
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
    expect(translatedCode).toContain('bru.setEnvVar(prefix + "_" + suffix, "abc123");');
    expect(translatedCode).toContain('const computedValue = bru.getEnvVar(prefix + "_" + suffix);');
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
    expect(translatedCode).toContain('baseUrl: bru.getEnvVar("apiUrl"),');
    expect(translatedCode).toContain('"Authorization": "Bearer " + bru.getEnvVar("token"),');
    expect(translatedCode).toContain('"X-Api-Key": bru.getEnvVar("apiKey") || "default-key"');
    expect(translatedCode).toContain('timeout: parseInt(bru.getEnvVar("timeout") || "5000"),');
    expect(translatedCode).toContain('validate: bru.getEnvVar("validateResponses") !== undefined && bru.getEnvVar("validateResponses") !== null');
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
    expect(translatedCode).toContain('if (bru.getEnvVar("apiKey") !== undefined && bru.getEnvVar("apiKey") !== null) {');
    expect(translatedCode).toContain('if (bru.getEnvVar("apiKey").length > 0) {');
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
        bru.setEnvVar("key", "value");
        const value = bru.getEnvVar("key");
        const exists = bru.getEnvVar("key") !== undefined && bru.getEnvVar("key") !== null;
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
    expect(translatedCode).toContain('bru.setEnvVar("requestTimestamp", timestamp);');
    expect(translatedCode).toContain('bru.setEnvVar("requestId", uniqueId);');
    expect(translatedCode).toContain('bru.setEnvVar("tokenExpiry", expiryTime.getTime());');
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
    expect(translatedCode).toContain('const configStr = bru.getEnvVar("config");');
    expect(translatedCode).toContain('bru.setEnvVar("configError", error.message);');
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
    expect(translatedCode).toContain('bru.setEnvVar("legacyKey", "legacyValue");');
    expect(translatedCode).toContain('const value = bru.getEnvVar("anotherKey");');
    expect(translatedCode).toContain('bru.setEnvVar("thirdKey", "thirdValue");');
  });
});
