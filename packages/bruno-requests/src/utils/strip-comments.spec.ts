import { stripComments } from './strip-comments';

describe('stripComments', () => {
  it('removes a line comment', () => {
    expect(stripComments('{\n  // the id\n  "id": 1\n}')).toBe('{\n  \n  "id": 1\n}');
  });

  it('removes a block comment', () => {
    expect(stripComments('{ /* note */ "id": 1 }')).toBe('{  "id": 1 }');
  });

  it('keeps // inside a double-quoted string', () => {
    const body = '{"url": "https://api.example.com/v1"}';
    expect(stripComments(body)).toBe(body);
  });

  it('keeps // inside a single-quoted string', () => {
    const body = '{\'url\': \'https://api.example.com/v1\'}';
    expect(stripComments(body)).toBe(body);
  });

  it('keeps a protocol-relative URL inside a single-quoted string', () => {
    const body = '{\'src\': \'//cdn.example.com/x.js\'}';
    expect(stripComments(body)).toBe(body);
  });

  it('keeps // in a single-quoted value that follows a double-quoted one', () => {
    const body = `{"a": "keep // this", 'b': 'drop // this'}`;
    expect(stripComments(body)).toBe(body);
  });

  it('keeps unquoted {{variable}} placeholders and strips the comment beside them', () => {
    expect(stripComments('{\n"test": {{someVar}} // comment\n}')).toBe('{\n"test": {{someVar}} \n}');
  });

  it('accepts syntax esprima-based strippers reject', () => {
    expect(stripComments('{ "n": 1_000 }')).toBe('{ "n": 1_000 }');
    expect(stripComments('{ "n": 10n }')).toBe('{ "n": 10n }');
  });

  it('preserves CRLF line endings', () => {
    expect(stripComments('{\r\n"a": 1 // c\r\n}')).toBe('{\r\n"a": 1 \r\n}');
  });

  it('throws on an unterminated block comment so the caller can fall back to the raw body', () => {
    expect(() => stripComments('{"a": 1 /* unterminated')).toThrow();
  });

  it('throws on an unterminated string so the caller can fall back to the raw body', () => {
    expect(() => stripComments('{\'a\': \'no closing quote // here')).toThrow();
  });
});
