import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Variables Translation', () => {
  // Regular variables tests
  it('should translate bru.getVar', () => {
    const code = 'bru.getVar("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("test");');
  });

  it('should translate bru.setVar', () => {
    const code = 'bru.setVar("test", "value");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.set("test", "value");');
  });

  it('should translate bru.hasVar', () => {
    const code = 'bru.hasVar("userId");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.has("userId");');
  });

  it('should translate bru.deleteVar', () => {
    const code = 'bru.deleteVar("tempVar");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.unset("tempVar");');
  });

  it('should translate bru.interpolate', () => {
    const code = 'bru.interpolate("Hello {{name}}");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.replaceIn("Hello {{name}}");');
  });

  it('should translate bru.interpolate with complex template', () => {
    const code = 'const greeting = bru.interpolate("Hello {{name}}, your user id is {{userId}}");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const greeting = pm.variables.replaceIn("Hello {{name}}, your user id is {{userId}}");');
  });

  // Global variables tests
  it('should translate bru.getGlobalEnvVar', () => {
    const code = 'bru.getGlobalEnvVar("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.globals.get("test");');
  });

  it('should translate bru.setGlobalEnvVar', () => {
    const code = 'bru.setGlobalEnvVar("test", "value");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.globals.set("test", "value");');
  });

  // Collection variables tests
  it('should translate bru.getCollectionVar', () => {
    const code = 'bru.getCollectionVar("baseUrl");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("baseUrl");');
  });

  // Folder variables tests
  it('should translate bru.getFolderVar', () => {
    const code = 'bru.getFolderVar("folderToken");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("folderToken");');
  });

  // Request variables tests
  it('should translate bru.getRequestVar', () => {
    const code = 'bru.getRequestVar("requestId");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.get("requestId");');
  });

  // Combined tests
  it('should handle conditional expressions with variable calls', () => {
    const code = 'const userStatus = bru.hasVar("userId") ? "logged-in" : "guest";';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const userStatus = pm.variables.has("userId") ? "logged-in" : "guest";');
  });

  it('should handle all variable methods together', () => {
    const code = `
// All variable methods
const hasUserId = bru.hasVar("userId");
const userId = bru.getVar("userId");
bru.setVar("requestTime", new Date().toISOString());

console.log(\`Has userId: \${hasUserId}, User ID: \${userId}\`);
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const hasUserId = pm.variables.has("userId");');
    expect(translatedCode).toContain('const userId = pm.variables.get("userId");');
    expect(translatedCode).toContain('pm.variables.set("requestTime", new Date().toISOString());');
  });

  it('should handle nested expressions with variables', () => {
    const code = 'bru.setVar("fullPath", bru.getEnvVar("baseUrl") + bru.getVar("endpoint"));';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.variables.set("fullPath", pm.environment.get("baseUrl") + pm.variables.get("endpoint"));');
  });
});
