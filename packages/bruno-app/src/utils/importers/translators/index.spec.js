const { postmanTranslation } = require('./postman_translation'); // Adjust path as needed

describe('postmanTranslation function', () => {
  test('should translate pm commands correctly', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
      pm.variables.get('key');
      pm.variables.set('key', 'value');
      pm.collectionVariables.get('key');
      pm.collectionVariables.set('key', 'value');
    `;
    const expectedOutput = `
      bru.getEnvVar('key');
      bru.setEnvVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

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
    const inputScript = "pm.test('random test', () => pm.response.json());";
    const expectedOutput = "// test('random test', () => pm.response.json());";
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
  test('should handle multiple pm commands on the same line', () => {
    const inputScript = "pm.environment.get('key'); pm.environment.set('key', 'value');";
    const expectedOutput = "bru.getEnv(var); bru.setEnvVar(var, 'value');";
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

  test('should handle nested commands and edge cases', () => {
    const inputScript = `
      const sampleObjects = [
        {
          key: pm.environment.get('key'),
          value: pm.variables.get('value')
        },
        {
          key: pm.collectionVariables.get('key'),
          value: pm.collectionVariables.get('value')
        }
      ];
      const dataTesting = Object.entries(sampleObjects || {}).reduce((acc, [key, value]) => {
        // this is a comment
        acc[key] = pm.collectionVariables.get(pm.environment.get(value));
        return acc; // Return the accumulator
      }, {});
      Object.values(dataTesting).forEach((data) => {
        pm.environment.set(data.key, pm.variables.get(data.value));
      });
    `;
    const expectedOutput = `
      const sampleObjects = [
        {
          key: bru.getEnvVar('key'),
          value: bru.getVar('value')
        },
        {
          key: bru.getVar('key'),
          value: bru.getVar('value')
        }
      ];
      const dataTesting = Object.entries(sampleObjects || {}).reduce((acc, [key, value]) => {
        // this is a comment
        acc[key] = bru.getVar(bru.getEnvVar(value));
        return acc; // Return the accumulator
      }, {});
      Object.values(dataTesting).forEach((data) => {
        bru.setEnvVar(data.key, bru.getVar(data.value));
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle test commands', () => {
    const inputScript = `
      pm.test('Status code is 200', () => {
        pm.response.to.have.status(200);
      });
      pm.test('this test will fail', () => {
        return false
      });
    `;
    const expectedOutput = `
      test('Status code is 200', () => {
        expect(res.getStatus()).to.equal(200);
      });
      test('this test will fail', () => {
        return false
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
