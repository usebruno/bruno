import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Scoped Variables', () => {
  it.skip('should handle scoped variables correctly', () => {
    const code = `
    const response = pm.response;
    const status = response.status;

    function test() {
        const response = delta.response;
        const status = response.status;
        console.log(status);
    }
    `;
    const result = translateCode(code);
    console.log(result);
    expect(result).toBe(`
    const status = res.statusText;

    function test() {
        const response = delta.response;
        const status = response.status;
        console.log(status);
    }
    `);
  });

  it.skip('should handle scoped variables correctly', () => {
    const code = `
    const response = delta.response;
    const status = response.status;

    function test() {
        const response = pm.response;
        const status = response.status;
        console.log(status);
    }
    `;
    const result = translateCode(code);
    console.log(result);
    expect(result).toBe(`
    const response = delta.response;
    const status = response.status;

    function test() {
        const status = res.statusText;
        console.log(status);
    }
    `);
  });
});
