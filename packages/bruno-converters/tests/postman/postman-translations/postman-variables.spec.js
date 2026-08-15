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
});
