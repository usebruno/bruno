const { default: postmanTranslation } = require("../../../../src/postman/postman-translations");

describe('postmanTranslations - response commands', () => {
  test('should handle response commands', () => {
    const inputScript = `
      const responseTime = pm.response.responseTime;
      const responseCode = pm.response.code;
      const responseText = pm.response.text();
      const responseJson = pm.response.json();
      const responseStatus = pm.response.status;
      const responseHeaders = pm.response.headers;
      const responseSize = pm.response.size();
      const responseSizeBody = pm.response.size().body;
      const responseSizeHeader = pm.response.size().header;
      const responseSizeTotal = pm.response.size().total;
      const responseSizeBody2 = pm.response.responseSize;

      pm.test('Status code is 200', function() {
        pm.response.to.have.status(200);
      });
    `;
    const expectedOutput = `
      const responseTime = res.getResponseTime();
      const responseCode = res.getStatus();
      const responseText = JSON.stringify(res.getBody());
      const responseJson = res.getBody();
      const responseStatus = res.statusText;
      const responseHeaders = res.getHeaders();
      const responseSize = res.getSize();
      const responseSizeBody = res.getSize().body;
      const responseSizeHeader = res.getSize().header;
      const responseSizeTotal = res.getSize().total;
      const responseSizeBody2 = res.getSize().body;

      test('Status code is 200', function() {
        expect(res.getStatus()).to.equal(200);
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});
