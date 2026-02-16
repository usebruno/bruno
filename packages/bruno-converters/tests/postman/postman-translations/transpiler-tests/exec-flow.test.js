import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Execution Flow Translation', () => {
  // Request flow control
  it('should translate pm.setNextRequest', () => {
    const code = 'pm.setNextRequest("Get User Details");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.setNextRequest("Get User Details");');
  });

  it('should translate pm.execution.skipRequest', () => {
    const code = 'if (condition) pm.execution.skipRequest();';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('if (condition) bru.runner.skipRequest();');
  });

  it('should translate pm.execution.setNextRequest(null)', () => {
    const code = 'pm.execution.setNextRequest(null);';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.runner.stopExecution();');
  });

  it('should translate pm.execution.setNextRequest("null")', () => {
    const code = 'pm.execution.setNextRequest("null");';
    const translatedCode = translateCode(code);
    expect(translatedCode).toBe('bru.runner.stopExecution();');
  });

  it('should handle pm.execution.setNextRequest with non-null parameters', () => {
    const code = `
        // Continue normal flow
        pm.execution.setNextRequest("Get user details");
        
        // With variable
        const nextReq = "Update profile";
        pm.execution.setNextRequest(nextReq);
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('bru.runner.setNextRequest("Get user details");');
    expect(translatedCode).toContain('bru.runner.setNextRequest(nextReq);');
  });

  it('should handle all execution control methods together', () => {
    const code = `
        // All execution control methods
        if (pm.response.code === 401) {
            pm.execution.skipRequest();
        } else if (pm.response.code === 500) {
            pm.execution.setNextRequest(null);
        } else {
            pm.setNextRequest("Get User Details");
        }
        `;
    const translatedCode = translateCode(code);

    expect(translatedCode).toContain('if (res.getStatus() === 401) {');
    expect(translatedCode).toContain('bru.runner.skipRequest();');
    expect(translatedCode).toContain('} else if (res.getStatus() === 500) {');
    expect(translatedCode).toContain('bru.runner.stopExecution();');
    expect(translatedCode).toContain('} else {');
    expect(translatedCode).toContain('bru.setNextRequest("Get User Details");');
  });
});
