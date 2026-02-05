import translateBruToPostman from '../../../src/utils/bruno-to-postman-translator';

describe('Bruno to Postman Visualizer Translation', () => {
  it('should translate bru.visualize to pm.visualizer.set', () => {
    const code = 'bru.visualize("<h1>Hello</h1>");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.visualizer.set("<h1>Hello</h1>", {});');
  });

  it('should translate bru.visualize with variable', () => {
    const code = 'const html = "<div>Test</div>"; bru.visualize(html);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('const html = "<div>Test</div>"; pm.visualizer.set(html, {});');
  });

  it('should translate bru.visualize with template literal', () => {
    const code = 'bru.visualize(`<h1>${title}</h1>`);';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.visualizer.set(`<h1>${title}</h1>`, {});');
  });

  it('should translate bru.visualize with complex HTML', () => {
    const code = 'bru.visualize("<div class=\\"container\\"><h1>Title</h1><p>Content</p></div>");';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('pm.visualizer.set(');
    expect(translatedCode).toContain(', {});');
  });

  it('should translate bru.visualize inside a function', () => {
    const code = `
function showResults(data) {
    const html = \`<table><tr><td>\${data.name}</td></tr></table>\`;
    bru.visualize(html);
}
`;
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toContain('pm.visualizer.set(html, {});');
  });

  it('should handle bru.visualize with no arguments', () => {
    const code = 'bru.visualize();';
    const translatedCode = translateBruToPostman(code);
    expect(translatedCode).toBe('pm.visualizer.set("", {});');
  });
});
