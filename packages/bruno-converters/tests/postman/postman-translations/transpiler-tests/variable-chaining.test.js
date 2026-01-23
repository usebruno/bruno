import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Variable Chaining Resolution', () => {
  test('should resolve a simple variable chain (variable pointing to another variable)', () => {
    const code = `
      const original = pm.response;
      const alias = original;
      const data = alias.json();
    `;

    const translatedCode = translateCode(code);

    // Check that alias.json() was properly resolved to res.getBody()
    expect(translatedCode).toContain('const data = res.getBody();');
    // The original variable declarations should be removed
    expect(translatedCode).not.toContain('const original =');
    expect(translatedCode).not.toContain('const alias =');
  });

  test('should handle mixed variable references correctly', () => {
    const code = `
      const respVar = pm.response;
      const envVar = pm.environment;
      const respAlias = respVar;
      
      // These should be replaced
      const statusCode = respAlias.code;
      const envValue = envVar.get("key");
      
      // This should not be replaced
      const unrelatedVar = "some value";
    `;

    const translatedCode = translateCode(code);

    // Check correct replacements
    expect(translatedCode).not.toContain('const respVar');
    expect(translatedCode).not.toContain('const envVar');
    expect(translatedCode).toContain('const statusCode = res.getStatus();');
    expect(translatedCode).toContain('const envValue = bru.getEnvVar("key");');

    // Check that unrelated variables are preserved
    expect(translatedCode).toContain('const unrelatedVar = "some value";');
  });

  /**
   * This test verifies that when multiple variables are declared in a single statement,
   * only the ones referencing Postman objects are removed and the others are preserved.
   *
   * For example, in a statement like:
   *   const response = pm.response, counter = 5, helper = "test";
   *
   * Only 'response' should be removed, resulting in:
   *   const counter = 5, helper = "test";
   */
  test('should handle multiple variables in one declaration statement', () => {
    const code = `
      // Multiple variables in one declaration, with a mix of Postman objects and regular variables
      const response = pm.response, counter = 5, helper = "test";
      
      // Using both the Postman reference (should be replaced) and regular values (should be preserved)
      const statusCode = response.code;
      console.log("Counter value:", counter);
      console.log("Helper string:", helper);
      
      // Another example with different Postman object
      let env = pm.environment, timeout = 1000, isValid = true;
      const baseUrl = env.get("baseUrl");
    `;

    const translatedCode = translateCode(code);

    // Postman references should be replaced
    expect(translatedCode).not.toContain('response = pm.response');
    expect(translatedCode).not.toContain('env = pm.environment');

    // Regular variables should be preserved
    expect(translatedCode).toContain('const counter = 5');
    expect(translatedCode).toContain('helper = "test"');
    expect(translatedCode).toContain('timeout = 1000');
    expect(translatedCode).toContain('isValid = true');

    // References to Postman objects should be properly translated
    expect(translatedCode).toContain('const statusCode = res.getStatus();');
    expect(translatedCode).toContain('const baseUrl = bru.getEnvVar("baseUrl");');

    // Console logs with regular variables should be preserved
    expect(translatedCode).toContain('console.log("Counter value:", counter);');
    expect(translatedCode).toContain('console.log("Helper string:", helper);');
  });
});
