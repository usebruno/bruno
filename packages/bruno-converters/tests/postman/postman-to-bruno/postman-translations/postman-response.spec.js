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
      const responseHeaders = req.getHeaders();

      test('Status code is 200', function() {
        expect(res.getStatus()).to.equal(200);
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });

  test('should handle response size methods', () => {
    const inputScript = `
      const size = pm.response.size();
      
      const bodySize = pm.response.size().body;
      const headerSize = pm.response.size().header;
      const totalSize = pm.response.size().total;
      
      // Get responseSize directly
      const responseSize = pm.response.responseSize;
      
      // Use in tests
      pm.test('Response size check', function() {
        pm.expect(pm.response.size().body).to.be.above(100);
        console.log("Total response size: " + pm.response.size().total + " bytes");
      });
    `;
    const expectedOutput = `
      const size = res.getSize();
      
      const bodySize = res.getSize().body;
      const headerSize = res.getSize().header;
      const totalSize = res.getSize().total;
      
      // Get responseSize directly
      const responseSize = res.getSize().body;
      
      // Use in tests
      test('Response size check', function() {
        expect(res.getSize().body).to.be.above(100);
        console.log("Total response size: " + res.getSize().total + " bytes");
      });
    `;
    expect(postmanTranslation(inputScript)).toBe(expectedOutput);
  });
});



