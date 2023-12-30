const fs = require('fs');
const path = require('path');
const jsonToToml = require('../src/jsonToToml');
const tomlToJson = require('../src/tomlToJson');

const fixtures = ['methods/get', 'methods/delete', 'headers/simple'];

describe('bruno toml', () => {
  fixtures.forEach((fixture) => {
    describe(fixture, () => {
      const json = require(`./${fixture}/request.json`);
      const toml = fs.readFileSync(path.join(__dirname, fixture, 'request.toml'), 'utf8');

      if (process.env.DEBUG === 'true') {
        console.log(`DEBUG: Running ${fixture} tests`);
        console.log('json', JSON.stringify(json, null, 2));
        console.log('toml', toml);
        console.log('jsonToToml', jsonToToml(json));
        console.log('tomlToJson', JSON.stringify(tomlToJson(toml), null, 2));
      }

      it(`should convert json to toml`, () => {
        expect(toml).toEqual(jsonToToml(json));
      });

      it(`should convert toml to json`, () => {
        expect(json).toEqual(tomlToJson(toml));
      });
    });
  });
});
