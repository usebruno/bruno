import translateCode from '../../../../src/utils/jscode-shift-translator';

describe('JSON Body Assertions Translation', () => {
    // Tests for pm.response.to.have.jsonBody
    it('should transform pm.response.to.have.jsonBody', () => {
        const code = 'pm.response.to.have.jsonBody();';
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`expect(res.getBody()).to.satisfy(
  u => Array.isArray(u) || u !== null && typeof u === "object",
  "expected response body to be an array or object"
);`);
    });

    it('should transform pm.response.to.have.jsonBody inside a test function', () => {
        const code = `
    pm.test("Response should be JSON", function() {
      pm.response.to.have.jsonBody();
    });
    `;
        const translatedCode = translateCode(code);
        const expectedOutput = `
    test("Response should be JSON", function() {
      expect(res.getBody()).to.satisfy(
        u => Array.isArray(u) || u !== null && typeof u === "object",
        "expected response body to be an array or object"
      );
    });
    `;
        expect(translatedCode).toBe(expectedOutput);
    });

    it('should transform pm.response.to.have.jsonBody with response alias', () => {
        const code = `
    const resp = pm.response;
    resp.to.have.jsonBody();
    `;
        const translatedCode = translateCode(code);
        expect(translatedCode).toBe(`
    expect(res.getBody()).to.satisfy(
        u => Array.isArray(u) || u !== null && typeof u === "object",
        "expected response body to be an array or object"
    );
    `);
    });

    it('should transform pm.response.to.have.jsonBody with object equal', () => {
        const code = 'pm.response.to.have.jsonBody({ a: 1 });';
        const translated = translateCode(code);
        expect(translated).toBe(
            `expect(res.getBody()).to.deep.equal({ a: 1 });`
        );
    });

    it('should transform pm.response.to.have.jsonBody with property path', () => {
        const code = 'pm.response.to.have.jsonBody("id");';
        const translated = translateCode(code);
        expect(translated).toBe(
            `expect(res.getBody()).to.have.property("id");`
        );
    });

    it('should transform pm.response.to.have.jsonBody with property path and value', () => {
        const code = 'pm.response.to.have.jsonBody("id", 5);';
        const translated = translateCode(code);
        expect(translated).toBe(
            `expect(res.getBody()).to.have.property("id", 5);`
        );
    });

});