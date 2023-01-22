const testsTag = require('../src/tests-tag');

describe('testsTag', () => {
  // simple case
  it('should parse tests contents - 1', () => {
    const input = 'tests\n  bruno.test("200 ok", () => {});\n/tests';
    const result = testsTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.tests).toEqual('  bruno.test("200 ok", () => {});');
  });

  // simple case with extra spaces
  it('should parse tests contents - 2', () => {
    const input = 'tests  \n  bruno.test("200 ok", () => {});\n/tests';
    const result = testsTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.tests).toEqual('  bruno.test("200 ok", () => {});');
  });

  // simple case with extra spaces
  it('should parse tests contents - 3', () => {
    const input = 'tests  \n  bruno.test("200 ok", () => {});\n/tests  ';
    const result = testsTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.tests).toEqual('  bruno.test("200 ok", () => {});');
  });

  // simple case with extra spaces
  it('should parse tests contents - 4', () => {
    const input = 'tests  \n  bruno.test("200 ok", () => {});\n/tests  \n';
    const result = testsTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.tests).toEqual('  bruno.test("200 ok", () => {});');
  });

  // simple case with extra spaces
  it('should parse tests contents - 5', () => {
    const input = 'tests  \n  bruno.test("200 ok", () => {});\n/tests  \n  ';
    const result = testsTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.tests).toEqual('  bruno.test("200 ok", () => {});');
  });

  // simple case with extra spaces
  it('should parse tests contents - 6', () => {
    const input = 'tests  \n  bruno.test("200 ok", () => {});\n/tests  \n  \n';
    const result = testsTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.tests).toEqual('  bruno.test("200 ok", () => {});');
  });

  // error case - missing tests start tag
  it('should fail to parse when tests start tag is missing', () => {
    const input = '  bruno.test("200 ok", () => {});\n/tests';
    const result = testsTag.run(input);
    expect(result.isError).toBe(true);
  });

  // error case - missing tests end tag
  it('should fail to parse when tests end tag is missing', () => {
    const input = 'tests\n  bruno.test("200 ok", () => {});';
    const result = testsTag.run(input);
    expect(result.isError).toBe(true);
  });
});
