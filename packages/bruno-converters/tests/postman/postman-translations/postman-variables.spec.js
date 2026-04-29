import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - variables commands', () => {
  test('should translate environment variable commands', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
    `;
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.environment.get(\'key\')');
    expect(result).toContain('bru.environment.set(\'key\', \'value\')');
  });

  test('should translate runtime variable commands', () => {
    const inputScript = `
      pm.variables.get('key');
      pm.variables.set('key', 'value');
    `;
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.variables.get(\'key\')');
    expect(result).toContain('bru.variables.set(\'key\', \'value\')');
  });

  test('should translate pm.collectionVariables.get', () => {
    const inputScript = 'pm.collectionVariables.get(\'key\');';
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.getCollectionVar(\'key\')');
  });

  test('should translate pm.expect with pm.environment.has', () => {
    const inputScript = 'pm.expect(pm.environment.has(\'key\')).to.be.true;';
    const result = postmanTranslation(inputScript);
    expect(result).toContain('bru.environment.has(\'key\')');
    expect(result).toContain('.to.be.true');
  });

  // TODO: Restore once UI update fixes are live for setCollectionVar
  test.skip('should translate pm.collectionVariables.set to bru.setCollectionVar', () => {
    const inputScript = 'pm.collectionVariables.set(\'key\', \'value\');';
    expect(postmanTranslation(inputScript)).toBe('bru.setCollectionVar(\'key\', \'value\');');
  });
});
