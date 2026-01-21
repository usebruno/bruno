import postmanTranslation from '../../../src/postman/postman-translations';

describe('postmanTranslations - test commands', () => {
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
