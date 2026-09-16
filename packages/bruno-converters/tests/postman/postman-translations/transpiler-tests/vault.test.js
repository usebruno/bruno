import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Vault Secret Translation', () => {
  it('should translate pm.vault.get to the global environment by default', () => {
    const code = 'pm.vault.get("api-key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.getGlobalEnvVar("api-key");');
  });

  it('should translate pm.vault.set to the global environment by default', () => {
    const code = 'pm.vault.set("api-key", "value");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setGlobalEnvVar("api-key", "value");');
  });

  it('should translate pm.vault.unset to the global environment by default', () => {
    const code = 'pm.vault.unset("api-key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.deleteGlobalEnvVar("api-key");');
  });

  it('should translate to the collection environment when that target is chosen', () => {
    const code = 'pm.vault.get("api-key");\npm.vault.set("api-key", "value");\npm.vault.unset("api-key");';
    const translatedCode = translateCode(code, { vaultTarget: 'collection' });
    expect(translatedCode).toContain('bru.getEnvVar("api-key");');
    expect(translatedCode).toContain('bru.setEnvVar("api-key", "value");');
    expect(translatedCode).toContain('bru.deleteEnvVar("api-key");');
  });

  it('should preserve a wrapping await', () => {
    const code = 'const token = await pm.vault.get("api-key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('const token = await bru.getGlobalEnvVar("api-key");');
  });

  it('should resolve a pm.vault alias', () => {
    const code = 'const vault = pm.vault;\nconst token = vault.get("api-key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('bru.getGlobalEnvVar("api-key")');
    expect(translatedCode).not.toContain('pm.vault');
  });

  it('should resolve a destructured vault reference', () => {
    const code = 'const { vault } = pm;\nconst token = vault.get("api-key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toContain('bru.getGlobalEnvVar("api-key")');
    expect(translatedCode).not.toContain('pm.vault');
  });

  it('should translate the legacy postman.vault namespace', () => {
    const code = 'postman.vault.get("api-key");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.getGlobalEnvVar("api-key");');
  });
});
