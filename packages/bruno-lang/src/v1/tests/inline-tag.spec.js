const inlineTag = require('../src/inline-tag');
const { sepBy, char, many } = require('arcsecond');

describe('type', () => {
  it('should parse the type', () => {
    const input = 'type http-request';
    const result = inlineTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result).toEqual({ type: 'http-request' });
  });

  it('should allow whitespaces while parsing the type', () => {
    const input = 'type    http-request';
    const result = inlineTag.run(input);
    expect(result.isError).toBe(false);
    expect(result.result).toEqual({ type: 'http-request' });
  });

  it('should fail to parse when type is missing', () => {
    const input = 'type';
    const result = inlineTag.run(input);
    expect(result.isError).toBe(true);
  });
});

describe('multiple inline tags', () => {
  it('should parse the multiple inline tags', () => {
    const input = `
type http-request
name Send Bulk SMS
method GET
url https://api.textlocal.in/bulk_json?apiKey=secret=&numbers=919988776655&message=hello&sender=600010
body-mode json
    `;

    const newline = char('\n');
    const line = inlineTag;
    const lines = many(line);
    const parser = sepBy(newline)(lines);

    const result = parser.run(input);

    expect(result.isError).toBe(false);
    expect(result.result).toEqual([
      [],
      [{ type: 'http-request' }],
      [{ name: 'Send Bulk SMS' }],
      [{ method: 'GET' }],
      [{ url: 'https://api.textlocal.in/bulk_json?apiKey=secret=&numbers=919988776655&message=hello&sender=600010' }],
      [{ body: { mode: 'json' } }],
      []
    ]);
  });
});
