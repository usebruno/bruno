import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - variables commands', () => {
  test('should translate environment variable commands', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
    `;
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.getEnvVar(\'key\')');
    expect(result).toContain('bru.setEnvVar(\'key\', \'value\')');
  });

  test('should translate runtime variable commands', () => {
    const inputScript = `
      pm.variables.get('key');
      pm.variables.set('key', 'value');
    `;
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.getVar(\'key\')');
    expect(result).toContain('bru.setVar(\'key\', \'value\')');
  });

  test('should translate pm.collectionVariables.get', () => {
    const inputScript = 'pm.collectionVariables.get(\'key\');';
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.getCollectionVar(\'key\')');
  });

  test('should translate pm.expect with pm.environment.has', () => {
    const inputScript = 'pm.expect(pm.environment.has(\'key\')).to.be.true;';
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.getEnvVar(\'key\') !== undefined && bru.getEnvVar(\'key\') !== null');
    expect(result).toContain('.to.be.true');
  });

  test('should translate pm.collectionVariables.set to bru.setCollectionVar', () => {
    const inputScript = 'pm.collectionVariables.set(\'key\', \'value\');';
    expect(postmanTranslation(inputScript)).toBe('bru.setCollectionVar(\'key\', \'value\');');
  });

  test('should translate pm.collectionVariables.unset to bru.deleteCollectionVar', () => {
    const inputScript = 'pm.collectionVariables.unset(\'key\');';
    expect(postmanTranslation(inputScript)).toBe('bru.deleteCollectionVar(\'key\');');
  });

  test('should translate pm.collectionVariables.clear to bru.deleteAllCollectionVars', () => {
    const inputScript = 'pm.collectionVariables.clear();';
    expect(postmanTranslation(inputScript)).toBe('bru.deleteAllCollectionVars();');
  });

  test('should translate pm.collectionVariables.toObject to bru.getAllCollectionVars', () => {
    const inputScript = 'const vars = pm.collectionVariables.toObject();';
    expect(postmanTranslation(inputScript)).toBe('const vars = bru.getAllCollectionVars();');
  });

  test('should translate pm.globals.unset to bru.deleteGlobalEnvVar', () => {
    const inputScript = 'pm.globals.unset(\'token\');';
    expect(postmanTranslation(inputScript)).toBe('bru.deleteGlobalEnvVar(\'token\');');
  });

  test('should translate pm.globals.clear to bru.deleteAllGlobalEnvVars', () => {
    const inputScript = 'pm.globals.clear();';
    expect(postmanTranslation(inputScript)).toBe('bru.deleteAllGlobalEnvVars();');
  });

  // The mangled key is re-printed by recast, which emits its own double quotes.
  test('should translate pm.vault.get against the chosen environment scope', () => {
    const inputScript = 'pm.vault.get(\'api-key\');';
    expect(postmanTranslation(inputScript)).toBe('bru.getGlobalEnvVar("vault_api-key");');
    expect(postmanTranslation(inputScript, { vaultTarget: 'collection' })).toBe('bru.getEnvVar("vault_api-key");');
  });

  test('should translate pm.vault commands via the regex fallback when the script cannot be parsed', () => {
    // The trailing `{` makes the AST pass throw, leaving the regex replacements as the only path.
    const inputScript = 'pm.vault.get(\'api-key\'); if (x) {';
    expect(postmanTranslation(inputScript)).toBe('bru.getGlobalEnvVar(\'vault_api-key\'); if (x) {');
    expect(postmanTranslation(inputScript, { vaultTarget: 'collection' })).toBe('bru.getEnvVar(\'vault_api-key\'); if (x) {');
  });

  test('should fall back to renaming only when the vault key is computed', () => {
    const inputScript = 'pm.vault.get(secretPath); if (x) {';
    expect(postmanTranslation(inputScript)).toBe('bru.getGlobalEnvVar(secretPath); if (x) {');
  });
});
