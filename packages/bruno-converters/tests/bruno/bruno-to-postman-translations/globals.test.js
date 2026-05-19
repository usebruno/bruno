import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Global Variables Translation', () => {
  // Legacy bru.* methods
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

  it('should translate bru.getAllGlobalEnvVars', () => {
    const code = 'const vars = bru.getAllGlobalEnvVars();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const vars = pm.globals.toObject();');
  });

  // ── bru.getGlobalEnvVarList() → pm.globals.* ─────────────────────

  it('should translate bru.getGlobalEnvVarList().get', () => {
    const code = 'bru.getGlobalEnvVarList().get("test");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.globals.get("test");');
  });

  it('should translate bru.getGlobalEnvVarList().set', () => {
    const code = 'bru.getGlobalEnvVarList().set("test", "value");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.globals.set("test", "value");');
  });

  it('should translate bru.getGlobalEnvVarList().has', () => {
    const code = 'bru.getGlobalEnvVarList().has("apiKey");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.globals.has("apiKey");');
  });

  it('should translate bru.getGlobalEnvVarList().toObject', () => {
    const code = 'const vars = bru.getGlobalEnvVarList().toObject();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const vars = pm.globals.toObject();');
  });

  it('should handle bru.getGlobalEnvVarList() in complex expressions', () => {
    const code = 'const hasKey = bru.getGlobalEnvVarList().has("token") ? "yes" : "no";';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const hasKey = pm.globals.has("token") ? "yes" : "no";');
  });

  it('should handle mixed legacy and getter-based global var calls', () => {
    const code = `
const oldVal = bru.getGlobalEnvVar("key");
const newVal = bru.getGlobalEnvVarList().get("key");
`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('const oldVal = pm.globals.get("key");');
    expect(translatedCode).toContain('const newVal = pm.globals.get("key");');
  });
});
