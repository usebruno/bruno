const fs = require('fs');
const path = require('path');
const bruToJson = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

describe('bruToJson', () => {
  it('should parse the bru file', () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.bru'), 'utf8');
    const expected = require('./fixtures/request.json');
    const output = bruToJson(input);

    expect(output).toEqual(expected);
  });
});

describe('jsonToBru', () => {
  it('should parse the json file', () => {
    const input = require('./fixtures/request.json');
    const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.bru'), 'utf8');
    const output = jsonToBru(input);

    expect(output).toEqual(expected);
  });
});
