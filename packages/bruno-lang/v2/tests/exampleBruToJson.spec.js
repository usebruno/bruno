const fs = require('fs');
const path = require('path');
const exampleBruToJson = require('../src/exampleBruToJson');
const jsonToExampleBru = require('../src/jsonToExampleBru');

describe('exampleBruToJson', () => {
  it('should parse the bru file', () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'example.bru'), 'utf8');
    const expected = require('./fixtures/example.json');
    const output = exampleBruToJson(input);

    expect(output).toEqual(expected);
  });
});

describe('jsonToExampleBru', () => {
  it('should parse the json file', () => {
    const input = require('./fixtures/example.json');
    const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'example.bru'), 'utf8');
    const output = jsonToExampleBru(input);

    expect(output).toEqual(expected);
  });
});
