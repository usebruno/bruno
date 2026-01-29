import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - variables commands', () => {
  test('should translate variable commands correctly', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
      pm.variables.get('key');
      pm.variables.set('key', 'value');
      pm.collectionVariables.get('key');
      pm.collectionVariables.set('key', 'value');
      pm.expect(pm.environment.has('key')).to.be.true;
    `;
    const expectedOutput = `
      bru.getEnvVar('key');
      bru.setEnvVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      expect(bru.getEnvVar('key') !== undefined && bru.getEnvVar('key') !== null).to.be.true;
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
