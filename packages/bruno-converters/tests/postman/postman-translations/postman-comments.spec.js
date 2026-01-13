import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - comment handling', () => {
  test('should not translate non-pm commands', () => {
    const inputScript = `
      console.log('This script does not contain pm commands.');
      const data = pm.environment.get('key');
      pm.collectionVariables.set('key', data);
    `;
    const expectedOutput = `
      console.log('This script does not contain pm commands.');
      const data = bru.getEnvVar('key');
      bru.setVar('key', data);
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should comment non-translated pm commands', () => {
    const inputScript = 'pm.test(\'random test\', () => pm.globals.clear());';
    const expectedOutput = '// test(\'random test\', () => pm.globals.clear());';
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle multiple pm commands on the same line', () => {
    const inputScript = 'pm.environment.get(\'key\'); pm.environment.set(\'key\', \'value\');';
    const expectedOutput = 'bru.getEnvVar(\'key\'); bru.setEnvVar(\'key\', \'value\');';
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle comments and other JavaScript code', () => {
    const inputScript = `
      // This is a comment
      const value = 'test';
      pm.environment.set('key', value);
      /*
        Multi-line comment
      */
      const result = pm.environment.get('key');
      console.log('Result:', result);
    `;
    const expectedOutput = `
      // This is a comment
      const value = 'test';
      bru.setEnvVar('key', value);
      /*
        Multi-line comment
      */
      const result = bru.getEnvVar('key');
      console.log('Result:', result);
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
