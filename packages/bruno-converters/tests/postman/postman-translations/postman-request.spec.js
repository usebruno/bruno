const { default: postmanTranslation } = require("../../../src/postman/postman-translations");

describe('postmanTranslations - request commands', () => {
  test('should handle request commands', () => {
    const inputScript = `
      const requestUrl = pm.request.url;
      const requestMethod = pm.request.method;
      const requestHeaders = pm.request.headers;
      const requestBody = pm.request.body;

      pm.test('Request method is POST', function() {
        pm.expect(pm.request.method).to.equal('POST');
      });
    `;
    const expectedOutput = `
      const requestUrl = req.getUrl();
      const requestMethod = req.getMethod();
      const requestHeaders = req.getHeaders();
      const requestBody = req.getBody();

      test('Request method is POST', function() {
        expect(req.getMethod()).to.equal('POST');
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
}); 