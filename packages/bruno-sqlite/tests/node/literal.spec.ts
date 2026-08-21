import { literal } from '../../scripts/lib/literal';

const evaluate = (source: string): unknown => new Function(`return ${source};`)();

describe('literal', () => {
  it('single-quotes strings and leaves identifier keys bare', () => {
    expect(literal({ name: 'get_thing', type: 'one' })).toBe(`{\n  name: 'get_thing',\n  type: 'one'\n}`);
  });

  it('quotes keys that are not valid identifiers', () => {
    expect(literal({ 'get-thing': 1 })).toBe(`{\n  'get-thing': 1\n}`);
  });

  it('indents nested values by two spaces', () => {
    expect(literal({ tables: ['things', 'notes'] })).toBe(
      `{\n  tables: [\n    'things',\n    'notes'\n  ]\n}`
    );
  });

  it('keeps empty objects and arrays inline', () => {
    expect(literal({})).toBe('{}');
    expect(literal([])).toBe('[]');
    expect(literal({ statements: [], types: {} })).toBe(`{\n  statements: [],\n  types: {}\n}`);
  });

  it('emits non-string values as-is', () => {
    expect(literal({ sequence: 1, applied: true, note: null })).toBe(
      `{\n  sequence: 1,\n  applied: true,\n  note: null\n}`
    );
  });

  it.each([
    ['sql literals', `SELECT * FROM t WHERE type = 'table' AND note = 'it''s fine'`],
    ['backslashes', 'C:\\path\\to\\db'],
    ['newlines and carriage returns', 'SELECT 1\nUNION\r\nSELECT 2'],
    ['a quoted backslash', `\\'`]
  ])('round-trips %s', (_name, sql) => {
    expect(evaluate(literal({ sql }))).toEqual({ sql });
  });
});
