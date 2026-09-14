const fs = require('fs');
const path = require('path');
const collectionBruToJson = require('../src/collectionBruToJson');
const jsonToCollectionBru = require('../src/jsonToCollectionBru');

describe('collectionBruToJson', () => {
  it('should parse the collection bru file', () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'collection.bru'), 'utf8');
    const expected = require('./fixtures/collection.json');
    const output = collectionBruToJson(input);

    expect(output).toEqual(expected);
  });
});

describe('jsonToCollectionBru', () => {
  it('should convert the collection json to bru', () => {
    const input = require('./fixtures/collection.json');
    const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'collection.bru'), 'utf8');
    const output = jsonToCollectionBru(input);

    expect(output).toEqual(expected);
  });
});

describe('description round-trip in collection.bru', () => {
  it('should round-trip a multiline description on a header', () => {
    const json = {
      headers: [{ name: 'Authorization', value: 'Bearer token', enabled: true, description: 'Line 1\nLine 2' }]
    };
    const bru = jsonToCollectionBru(json);
    const parsed = collectionBruToJson(bru);
    expect(parsed.headers[0].description).toBe('Line 1\nLine 2');
    expect(parsed.headers[0].value).toBe('Bearer token');
  });

  it('should round-trip a description on a var with a multiline value', () => {
    const json = {
      vars: {
        req: [{ name: 'myVar', value: 'line1\nline2', enabled: true, description: 'my desc' }]
      }
    };
    const bru = jsonToCollectionBru(json);
    const parsed = collectionBruToJson(bru);
    expect(parsed.vars.req[0].description).toBe('my desc');
    expect(parsed.vars.req[0].value).toBe('line1\nline2');
  });

  it('should round-trip a description containing triple-quotes', () => {
    const json = {
      headers: [{ name: 'X-Token', value: 'abc', enabled: true, description: 'has \'\'\' quotes' }]
    };
    const bru = jsonToCollectionBru(json);
    const parsed = collectionBruToJson(bru);
    expect(parsed.headers[0].description).toBe('has \'\'\' quotes');
  });
});
