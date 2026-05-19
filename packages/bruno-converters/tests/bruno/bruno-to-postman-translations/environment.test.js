import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Environment Variable Translation', () => {
  it('should translate bru.getEnvVar', () => {
    const code = 'bru.getEnvVar("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.get("test");');
  });

  it('should translate bru.setEnvVar', () => {
    const code = 'bru.setEnvVar("test", "value");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("test", "value");');
  });

  it('should translate bru.deleteEnvVar', () => {
    const code = 'bru.deleteEnvVar("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.unset("test");');
  });

  it('should translate bru.hasEnvVar', () => {
    const code = 'bru.hasEnvVar("apiKey");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.has("apiKey");');
  });

  it('should translate bru.getEnvName() to pm.environment.name (function to property)', () => {
    const code = 'const envName = bru.getEnvName();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const envName = pm.environment.name;');
  });

  it('should handle nested Postman API calls with environment', () => {
    const code = 'bru.setEnvVar("computed", bru.getVar("base") + "-suffix");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("computed", pm.variables.get("base") + "-suffix");');
  });

  it('should handle JSON operations with environment variables', () => {
    const code = 'bru.setEnvVar("user", JSON.stringify({ id: 123, name: "John" }));';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("user", JSON.stringify({ id: 123, name: "John" }));');
  });

  it('should handle JSON.parse with environment variables', () => {
    const code = 'const userData = JSON.parse(bru.getEnvVar("user"));';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const userData = JSON.parse(pm.environment.get("user"));');
  });

  it('should handle all environment variable methods together', () => {
    const code = `
// All environment variable methods
const token = bru.getEnvVar("token");
bru.setEnvVar("timestamp", new Date().toISOString());

console.log(\`Token: \${token}\`);
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const token = pm.environment.get("token");');
    expect(translatedCode).toContain('pm.environment.set("timestamp", new Date().toISOString());');
  });

  it('should handle environment variables with computed property names', () => {
    const code = `
const prefix = "api";
const suffix = "Key";
bru.setEnvVar(prefix + "_" + suffix, "abc123");
const computedValue = bru.getEnvVar(prefix + "_" + suffix);
`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('pm.environment.set(prefix + "_" + suffix, "abc123");');
    expect(translatedCode).toContain('const computedValue = pm.environment.get(prefix + "_" + suffix);');
  });

  it('should handle environment variables in complex object structures', () => {
    const code = `
const config = {
    baseUrl: bru.getEnvVar("apiUrl"),
    headers: {
        "Authorization": "Bearer " + bru.getEnvVar("token"),
        "X-Api-Key": bru.getEnvVar("apiKey") || "default-key"
    },
    timeout: parseInt(bru.getEnvVar("timeout") || "5000")
};
`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('baseUrl: pm.environment.get("apiUrl"),');
    expect(translatedCode).toContain('"Authorization": "Bearer " + pm.environment.get("token"),');
    expect(translatedCode).toContain('"X-Api-Key": pm.environment.get("apiKey") || "default-key"');
    expect(translatedCode).toContain('timeout: parseInt(pm.environment.get("timeout") || "5000")');
  });

  it('should handle environment variables in try-catch blocks', () => {
    const code = `
try {
    const configStr = bru.getEnvVar("config");
    const config = JSON.parse(configStr);
    console.log("Config loaded:", config.version);
} catch (error) {
    console.error("Failed to parse config");
    bru.setEnvVar("configError", error.message);
}
`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('const configStr = pm.environment.get("config");');
    expect(translatedCode).toContain('pm.environment.set("configError", error.message);');
  });

  // ── bru.getEnvVarList() → pm.environment.* ───────────────────────

  it('should translate bru.getEnvVarList().get', () => {
    const code = 'bru.getEnvVarList().get("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.get("test");');
  });

  it('should translate bru.getEnvVarList().set', () => {
    const code = 'bru.getEnvVarList().set("test", "value");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.set("test", "value");');
  });

  it('should translate bru.getEnvVarList().has', () => {
    const code = 'bru.getEnvVarList().has("apiKey");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.has("apiKey");');
  });

  it('should translate bru.getEnvVarList().delete', () => {
    const code = 'bru.getEnvVarList().delete("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.unset("test");');
  });

  it('should translate bru.getEnvVarList().toObject', () => {
    const code = 'const vars = bru.getEnvVarList().toObject();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const vars = pm.environment.toObject();');
  });

  it('should translate bru.getEnvVarList().clear', () => {
    const code = 'bru.getEnvVarList().clear();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.environment.clear();');
  });

  it('should handle bru.getEnvVarList() in complex expressions', () => {
    const code = 'const hasKey = bru.getEnvVarList().has("token") ? "yes" : "no";';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const hasKey = pm.environment.has("token") ? "yes" : "no";');
  });
});
