const { bodyJsonTag } = require('../src/body-tag');

describe('bodyJsonTag', () => {
  const testbodyJson = (input, expected) => {
    const result = bodyJsonTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result.body.json).toEqual('{ "foo": "bar" }');
  };

  // simple case
  it('should parse json body tag - 1', () => {
    const input = 'body(type=json)\n{ "foo": "bar" }\n/body';
    testbodyJson(input, '{ "foo": "bar" }\n');
  });

  // space between body and args
  it('should parse json body tag - 2', () => {
    const input = 'body (type = json)\n{ "foo": "bar" }\n/body';
    testbodyJson(input, '{ "foo": "bar" }\n');
  });

  // space after body tag
  it('should parse json body tag - 3', () => {
    const input = 'body (type = json)  \n{ "foo": "bar" }\n/body';
    testbodyJson(input, '{ "foo": "bar" }\n');
  });

  // space after body tag
  it('should parse json body tag - 4', () => {
    const input = 'body (type = json)  \n{ "foo": "bar" }\n/body ';
    testbodyJson(input, '{ "foo": "bar" }\n');
  });

  it('should fail to parse when body tag is missing', () => {
    const input = '{ "foo": "bar" }\n/body';
    const result = bodyJsonTag.run(input);
    expect(result.isError).toBe(true);
  });

  it('should fail to parse when body end tag is missing', () => {
    const input = 'body (type = json)\n{ "foo": "bar" }';
    const result = bodyJsonTag.run(input);
    expect(result.isError).toBe(true);
  });
});
