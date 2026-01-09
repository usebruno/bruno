const { default: postmanTranslation } = require('../../../../src/postman/postman-translations');

describe('postmanTranslations - request commands', () => {
  test('should handle request commands', () => {
    const inputScript = `
      const requestUrl = pm.request.url;
      const requestMethod = pm.request.method;
      const requestHeaders = pm.request.headers;
      const requestBody = pm.request.body;
      const requestName = pm.info.requestName;

      pm.test('Request method is POST', function() {
        pm.expect(pm.request.method).to.equal('POST');
      });
    `;
    const expectedOutput = `
      const requestUrl = req.getUrl();
      const requestMethod = req.getMethod();
      const requestHeaders = req.getHeaders();
      const requestBody = req.getBody();
      const requestName = req.getName();

      test('Request method is POST', function() {
        expect(req.getMethod()).to.equal('POST');
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle legacy request object without pm prefix', () => {
    const inputScript = `
      const url = request.url;
      const method = request.method;
      const body = request.body;
      const name = request.name;
    `;
    const expectedOutput = `
      const url = req.getUrl();
      const method = req.getMethod();
      const body = req.getBody();
      const name = req.getName();
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle pm.request.url helper methods', () => {
    const inputScript = `
      const host = pm.request.url.getHost();
      const path = pm.request.url.getPath();
      const queryString = pm.request.url.getQueryString();
      const pathVariables = pm.request.url.variables;
    `;
    const expectedOutput = `
      const host = req.getHost();
      const path = req.getPath();
      const queryString = req.getQueryString();
      const pathVariables = req.getPathParams();
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
