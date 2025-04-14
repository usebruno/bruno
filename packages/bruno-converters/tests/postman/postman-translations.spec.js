const { default: postmanTranslation } = require("../../src/postman/postman-translations");

describe('postmanTranslation function', () => {
  test('should translate pm commands correctly', () => {
    const inputScript = `
      pm.environment.get('key');
      pm.environment.set('key', 'value');
      pm.variables.get('key');
      pm.variables.set('key', 'value');
      pm.collectionVariables.get('key');
      pm.collectionVariables.set('key', 'value');
      const data = pm.response.json();
      pm.expect(pm.environment.has('key')).to.be.true;
    `;
    const expectedOutput = `
      bru.getEnvVar('key');
      bru.setEnvVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      bru.getVar('key');
      bru.setVar('key', 'value');
      const data = res.getBody();
      expect(bru.getEnvVar('key') !== undefined && bru.getEnvVar('key') !== null).to.be.true;
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should translate response headers and cookies', () => {
    const inputScript = `
      const headers = pm.response.headers;
      const contentType = pm.response.headers.get('Content-Type');
      const cookies = pm.response.cookies;
      const sessionCookie = pm.response.cookies.get('session');
    `;
    const expectedOutput = `
      const headers = res.getHeaders();
      const contentType = res.getHeader('Content-Type');
      const cookies = res.getCookies();
      const sessionCookie = res.getCookie('session');
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should translate response status and body', () => {
    const inputScript = `
      const status = pm.response.status;
      const statusCode = pm.response.statusCode;
      const body = pm.response.body;
      const text = pm.response.text();
    `;
    const expectedOutput = `
      const status = res.getStatus();
      const statusCode = res.getStatus();
      const body = res.getBody();
      const text = res.getBody()?.toString();
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should translate request information', () => {
    const inputScript = `
      const url = pm.request.url;
      const method = pm.request.method;
      const headers = pm.request.headers;
      const body = pm.request.body;
    `;
    const expectedOutput = `
      const url = req.getUrl();
      const method = req.getMethod();
      const headers = req.getHeaders();
      const body = req.getBody();
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should translate testing assertions', () => {
    const inputScript = `
      pm.expect(value).to.be.true;
      pm.expect(value).to.be.false;
      pm.expect(value).to.be.null;
      pm.expect(value).to.be.undefined;
      pm.expect(value).to.be.a('string');
      pm.expect(value).to.be.an('object');
      pm.expect(value).to.have.lengthOf(5);
      pm.expect(value).to.include('text');
    `;
    const expectedOutput = `
      expect(value).to.be.true;
      expect(value).to.be.false;
      expect(value).to.be.null;
      expect(value).to.be.undefined;
      expect(value).to.be.a('string');
      expect(value).to.be.an('object');
      expect(value).to.have.lengthOf(5);
      expect(value).to.include('text');
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should translate request/response information', () => {
    const inputScript = `
      const requestName = pm.info.requestName;
      const requestId = pm.info.requestId;
    `;
    const expectedOutput = `
      const requestName = req.getName();
      const requestId = req.getId();
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
    const inputScript = "pm.test('random test', () => postman.variables.replaceIn('{{$guid}}'));";
    const expectedOutput = "// test('random test', () => postman.variables.replaceIn('{{$guid}}'));";
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle multiple pm commands on the same line', () => {
    const inputScript = "pm.environment.get('key'); pm.environment.set('key', 'value');";
    const expectedOutput = "bru.getEnvVar('key'); bru.setEnvVar('key', 'value');";
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

test('should handle response commands', () => {
  const inputScript = `
    const responseTime = pm.response.responseTime;
    const responseCode = pm.response.code;
    const responseText = pm.response.text();
  `;
  const expectedOutput = `
    const responseTime = res.getResponseTime();
    const responseCode = res.getStatus();
    const responseText = res.getBody()?.toString();
  `;
  expect(postmanTranslation(inputScript)).toBe(expectedOutput);
});
