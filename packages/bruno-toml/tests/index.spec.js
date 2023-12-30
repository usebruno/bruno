const fs = require('fs');
const path = require('path');
const jsonToToml = require('../src/jsonToToml');
const { describe } = require('@jest/globals');

const fixtures = ['methods/get', 'methods/delete'];

describe('bruno toml', () => {
  fixtures.forEach((fixture) => {
    describe(fixture, () => {
      const json = require(`./${fixture}/request.json`);
      const toml = fs.readFileSync(path.join(__dirname, fixture, 'request.toml'), 'utf8');
      it(`should convert json to toml`, () => {
        expect(toml).toEqual(jsonToToml(json));
      });
    });
  });
});
