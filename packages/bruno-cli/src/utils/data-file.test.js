const { parseCSV, parseJSON, parseDataFile } = require('./data-file');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('parseCSV', () => {
  test('parses a simple CSV', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    expect(parseCSV(csv)).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' }
    ]);
  });

  test('handles Windows line endings', () => {
    const csv = 'name,age\r\nAlice,30\r\nBob,25';
    expect(parseCSV(csv)).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' }
    ]);
  });

  test('handles quoted fields with commas', () => {
    const csv = 'name,address\nAlice,"123 Main St, Apt 4"\nBob,456 Oak Ave';
    expect(parseCSV(csv)).toEqual([
      { name: 'Alice', address: '123 Main St, Apt 4' },
      { name: 'Bob', address: '456 Oak Ave' }
    ]);
  });

  test('handles escaped quotes inside quoted fields', () => {
    const csv = 'name,note\nAlice,"She said ""hello"""\nBob,plain';
    expect(parseCSV(csv)).toEqual([
      { name: 'Alice', note: 'She said "hello"' },
      { name: 'Bob', note: 'plain' }
    ]);
  });

  test('returns empty array for empty string', () => {
    expect(parseCSV('')).toEqual([]);
  });

  test('returns empty array for header-only CSV', () => {
    expect(parseCSV('name,age')).toEqual([]);
  });

  test('trims header names', () => {
    const csv = ' name , age \nAlice,30';
    expect(parseCSV(csv)).toEqual([{ name: 'Alice', age: '30' }]);
  });

  test('fills missing values with empty string', () => {
    const csv = 'a,b,c\n1,2';
    const result = parseCSV(csv);
    expect(result[0].c).toBe('');
  });
});

describe('parseJSON', () => {
  test('parses a valid JSON array', () => {
    const json = '[{"name":"Alice","age":30},{"name":"Bob","age":25}]';
    expect(parseJSON(json)).toEqual([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 }
    ]);
  });

  test('throws if top-level is not an array', () => {
    expect(() => parseJSON('{"name":"Alice"}')).toThrow(/array/);
  });

  test('throws on invalid JSON', () => {
    expect(() => parseJSON('not json')).toThrow(/Failed to parse/);
  });

  test('returns empty array for empty array input', () => {
    expect(parseJSON('[]')).toEqual([]);
  });
});

describe('parseDataFile', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  test('reads and parses a CSV file', () => {
    const filePath = path.join(tmpDir, 'data.csv');
    fs.writeFileSync(filePath, 'name,role\nAlice,admin\nBob,user');
    expect(parseDataFile(filePath)).toEqual([
      { name: 'Alice', role: 'admin' },
      { name: 'Bob', role: 'user' }
    ]);
  });

  test('reads and parses a JSON file', () => {
    const filePath = path.join(tmpDir, 'data.json');
    fs.writeFileSync(filePath, '[{"name":"Alice"},{"name":"Bob"}]');
    expect(parseDataFile(filePath)).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  test('throws for unsupported extension', () => {
    const filePath = path.join(tmpDir, 'data.xml');
    fs.writeFileSync(filePath, '<data/>');
    expect(() => parseDataFile(filePath)).toThrow(/Unsupported/);
  });

  test('throws when file does not exist', () => {
    expect(() => parseDataFile(path.join(tmpDir, 'missing.csv'))).toThrow(/Could not read/);
  });
});
