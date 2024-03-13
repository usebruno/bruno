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
