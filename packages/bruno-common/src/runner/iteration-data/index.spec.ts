import { describe, it, expect } from '@jest/globals';
import { getIterationDataFormat, parseIterationData, getIterationCount, getIterationRow } from './index';

describe('getIterationDataFormat', () => {
  it('detects csv and json by extension, case-insensitively', () => {
    expect(getIterationDataFormat('/data/users.csv')).toBe('csv');
    expect(getIterationDataFormat('C:\\data\\USERS.JSON')).toBe('json');
  });

  it('returns null for unsupported files', () => {
    expect(getIterationDataFormat('/data/users.txt')).toBeNull();
    expect(getIterationDataFormat('/data/users')).toBeNull();
    expect(getIterationDataFormat('')).toBeNull();
  });
});

describe('parseIterationData - csv', () => {
  it('maps each record to an object keyed by the header', () => {
    const rows = parseIterationData('name,age\nalice,30\nbob,25\n', 'csv');
    expect(rows).toEqual([
      { name: 'alice', age: '30' },
      { name: 'bob', age: '25' }
    ]);
  });

  it('handles CRLF line endings, a BOM, blank lines and a missing trailing newline', () => {
    const rows = parseIterationData('\uFEFFname,age\r\nalice,30\r\n\r\nbob,25', 'csv');
    expect(rows).toEqual([
      { name: 'alice', age: '30' },
      { name: 'bob', age: '25' }
    ]);
  });

  it('supports quoted fields with commas, escaped quotes and newlines', () => {
    const rows = parseIterationData('name,bio\n"Doe, Jane","She said ""hi""\nthen left"\n', 'csv');
    expect(rows).toEqual([{ name: 'Doe, Jane', bio: 'She said "hi"\nthen left' }]);
  });

  it('keeps empty fields as empty strings', () => {
    expect(parseIterationData('a,b,c\n,,\n1,"",3\n', 'csv')).toEqual([
      { a: '', b: '', c: '' },
      { a: '1', b: '', c: '3' }
    ]);
  });

  it('trims header names but not values', () => {
    expect(parseIterationData(' name , age \n alice , 30 \n', 'csv')).toEqual([{ name: ' alice ', age: ' 30 ' }]);
  });

  it('returns no rows for an empty file or a header-only file', () => {
    expect(parseIterationData('', 'csv')).toEqual([]);
    expect(parseIterationData('name,age\n', 'csv')).toEqual([]);
  });

  it('rejects a record with the wrong number of fields, naming its line', () => {
    expect(() => parseIterationData('name,age\nalice,30\nbob\n', 'csv')).toThrow('line 3: expected 2 fields but found 1');
  });

  it('reports the starting line of a multi-line record', () => {
    expect(() => parseIterationData('a,b\n"x\ny"\n', 'csv')).toThrow('line 2');
  });

  it('rejects duplicate and empty header names', () => {
    expect(() => parseIterationData('name,name\na,b\n', 'csv')).toThrow('duplicate column "name"');
    expect(() => parseIterationData('name,\na,b\n', 'csv')).toThrow('column 2 has no name');
  });

  it('rejects malformed quoting', () => {
    expect(() => parseIterationData('a\n"unterminated\n', 'csv')).toThrow('unterminated quoted field');
    expect(() => parseIterationData('a\nab"c\n', 'csv')).toThrow('unexpected quote');
    expect(() => parseIterationData('a\n"ab"c\n', 'csv')).toThrow('unexpected character after a closing quote');
  });
});

describe('parseIterationData - json', () => {
  it('returns an array of objects as-is, keeping non-string values', () => {
    const rows = parseIterationData('[{"id":1,"user":{"name":"a"}},{"id":2,"active":false}]', 'json');
    expect(rows).toEqual([
      { id: 1, user: { name: 'a' } },
      { id: 2, active: false }
    ]);
  });

  it('strips a BOM', () => {
    expect(parseIterationData('\uFEFF[{"a":"1"}]', 'json')).toEqual([{ a: '1' }]);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseIterationData('[{', 'json')).toThrow('Invalid JSON');
  });

  it('rejects a top-level value that is not an array', () => {
    expect(() => parseIterationData('{"a":1}', 'json')).toThrow('expected an array of objects');
  });

  it('rejects array items that are not objects', () => {
    expect(() => parseIterationData('[{"a":1}, 2]', 'json')).toThrow('item 2 is not an object');
    expect(() => parseIterationData('[null]', 'json')).toThrow('item 1 is not an object');
    expect(() => parseIterationData('[[1]]', 'json')).toThrow('item 1 is not an object');
  });
});

describe('parseIterationData - unsupported format', () => {
  it('throws', () => {
    expect(() => parseIterationData('a', 'xml' as any)).toThrow('Unsupported data file format');
  });
});

describe('getIterationCount', () => {
  it('defaults to one iteration per row', () => {
    expect(getIterationCount({ rowCount: 3 })).toBe(3);
  });

  it('runs once when there is no data', () => {
    expect(getIterationCount({})).toBe(1);
    expect(getIterationCount({ rowCount: 0, iterations: null })).toBe(1);
  });

  it('uses an explicit count over the row count', () => {
    expect(getIterationCount({ rowCount: 3, iterations: 5 })).toBe(5);
    expect(getIterationCount({ rowCount: 3, iterations: 1 })).toBe(1);
  });

  it('rejects counts that are not positive whole numbers', () => {
    expect(() => getIterationCount({ iterations: 0 })).toThrow('positive whole number');
    expect(() => getIterationCount({ iterations: -1 })).toThrow('positive whole number');
    expect(() => getIterationCount({ iterations: 1.5 })).toThrow('positive whole number');
    expect(() => getIterationCount({ iterations: NaN })).toThrow('positive whole number');
  });
});

describe('getIterationRow', () => {
  const rows = [{ n: '1' }, { n: '2' }];

  it('returns the row for the iteration', () => {
    expect(getIterationRow(rows, 0)).toEqual({ n: '1' });
    expect(getIterationRow(rows, 1)).toEqual({ n: '2' });
  });

  it('reuses the last row once iterations outnumber rows', () => {
    expect(getIterationRow(rows, 5)).toEqual({ n: '2' });
  });

  it('returns an empty row when there is no data', () => {
    expect(getIterationRow([], 0)).toEqual({});
    expect(getIterationRow(null, 2)).toEqual({});
  });
});
