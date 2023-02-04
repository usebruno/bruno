const scriptTag = require('../src/script-tag');

describe('scriptTag', () => {
  // simple case
  it('should parse script contents - 1', () => {
    const input = 'script\n  const foo = "bar";\n/script';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.script).toEqual('  const foo = "bar";');
  });

  // simple case with extra spaces
  it('should parse script contents - 2', () => {
    const input = 'script  \n  const foo = "bar";\n/script';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.script).toEqual('  const foo = "bar";');
  });

  // simple case with extra spaces
  it('should parse script contents - 3', () => {
    const input = 'script  \n  const foo = "bar";\n/script  ';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.script).toEqual('  const foo = "bar";');
  });

  // simple case with extra spaces
  it('should parse script contents - 4', () => {
    const input = 'script  \n  const foo = "bar";\n/script  \n';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.script).toEqual('  const foo = "bar";');
  });

  // simple case with extra spaces
  it('should parse script contents - 5', () => {
    const input = 'script  \n  const foo = "bar";\n/script  \n  ';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.script).toEqual('  const foo = "bar";');
  });

  // simple case with extra spaces
  it('should parse script contents - 6', () => {
    const input = 'script  \n  const foo = "bar";\n/script  \n  \n';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.script).toEqual('  const foo = "bar";');
  });

  // error case - missing script start tag
  it('should fail to parse when script start tag is missing', () => {
    const input = '  const foo = "bar";\n/script';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(true);
  });

  // error case - missing script end tag
  it('should fail to parse when script end tag is missing', () => {
    const input = 'script\n  const foo = "bar";';
    const result = scriptTag.run(input);
    expect(result.isError).toBe(true);
  });
});
