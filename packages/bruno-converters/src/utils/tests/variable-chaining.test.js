import translateCode from '../jscode-shift-translator.js';

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
}); 