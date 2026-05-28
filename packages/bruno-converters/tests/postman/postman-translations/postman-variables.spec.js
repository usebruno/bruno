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

  // TODO: Restore once UI update fixes are live for setCollectionVar
  test.skip('should translate pm.collectionVariables.set to bru.setCollectionVar', () => {
    const inputScript = 'pm.collectionVariables.set(\'key\', \'value\');';
    expect(postmanTranslation(inputScript)).toBe('bru.setCollectionVar(\'key\', \'value\');');
  });
});
