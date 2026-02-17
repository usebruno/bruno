import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Execution Control Translation', () => {
  // setNextRequest translations
  it('should translate bru.setNextRequest', () => {
    const code = 'bru.setNextRequest("Get User Details");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest("Get User Details");');
  });

  it('should translate bru.runner.setNextRequest', () => {
    const code = 'bru.runner.setNextRequest("Create Order");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest("Create Order");');
  });

  // skipRequest translation
  it('should translate bru.runner.skipRequest', () => {
    const code = 'bru.runner.skipRequest();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.execution.skipRequest();');
  });

  // stopExecution translation
  it('should translate bru.runner.stopExecution() to pm.execution.setNextRequest(null)', () => {
    const code = 'bru.runner.stopExecution();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.execution.setNextRequest(null);');
  });

  // Conditional execution control
  it('should handle setNextRequest in conditionals', () => {
    const code = `
if (res.getStatus() === 401) {
    bru.setNextRequest("Refresh Token");
} else if (res.getStatus() === 200) {
    bru.setNextRequest("Process Data");
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('if (pm.response.code === 401) {');
    expect(translatedCode).toContain('pm.execution.setNextRequest("Refresh Token");');
    expect(translatedCode).toContain('} else if (pm.response.code === 200) {');
    expect(translatedCode).toContain('pm.execution.setNextRequest("Process Data");');
  });

  it('should handle stopExecution in error handling', () => {
    const code = `
if (res.getStatus() >= 500) {
    console.error("Server error, stopping execution");
    bru.runner.stopExecution();
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('if (pm.response.code >= 500) {');
    expect(translatedCode).toContain('console.error("Server error, stopping execution");');
    expect(translatedCode).toContain('pm.execution.setNextRequest(null);');
  });

  it('should handle skipRequest with condition', () => {
    const code = `
const shouldSkip = bru.getEnvVar("skipNextRequest") === "true";
if (shouldSkip) {
    bru.runner.skipRequest();
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const shouldSkip = pm.environment.get("skipNextRequest") === "true";');
    expect(translatedCode).toContain('if (shouldSkip) {');
    expect(translatedCode).toContain('pm.execution.skipRequest();');
  });

  it('should handle all execution control methods together', () => {
    const code = `
const status = res.getStatus();
const data = res.getBody();

if (status === 200 && data.hasMore) {
    bru.setNextRequest("Fetch Next Page");
} else if (status === 429) {
    console.log("Rate limited, skipping");
    bru.runner.skipRequest();
} else if (status >= 500) {
    bru.runner.stopExecution();
}
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const status = pm.response.code;');
    expect(translatedCode).toContain('const data = pm.response.json();');
    expect(translatedCode).toContain('pm.execution.setNextRequest("Fetch Next Page");');
    expect(translatedCode).toContain('pm.execution.skipRequest();');
    expect(translatedCode).toContain('pm.execution.setNextRequest(null);');
  });

  it('should handle dynamic request names in setNextRequest', () => {
    const code = `
const nextRequest = bru.getVar("nextRequestName");
bru.setNextRequest(nextRequest);
`;
    const translatedCode = translateBruToPostman(code);

    expect(translatedCode).toContain('const nextRequest = pm.variables.get("nextRequestName");');
    expect(translatedCode).toContain('pm.execution.setNextRequest(nextRequest);');
  });
});
