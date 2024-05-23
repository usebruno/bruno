const fs = require('fs');
const path = require('path');
const jsonToToml = require('../src/jsonToToml');
const tomlToJson = require('../src/tomlToJson');

const fixtures = [
  'methods/get',
  'methods/delete',
  'headers/simple-header',
  'headers/empty-header',
  'headers/spaces-in-header',
  'headers/unicode-in-header',
  'headers/disabled-header',
  'headers/dotted-header',
  'headers/duplicate-header',
  'headers/reserved-header',
  'scripts/pre-request',
  'scripts/post-response',
  'scripts/tests'
];

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
describe('joinPathUrl', () => {
  it('should join path and query params correctly', () => {
    const url = 'https://example.com/api/:id';
    const params = [
      { name: 'id', type: 'path', enabled: true, value: '123' },
      { name: 'sort', type: 'query', enabled: true, value: 'asc' },
      { name: 'filter', type: 'query', enabled: true, value: 'active' }
    ];
    const expectedUrl = 'https://example.com/api/123?sort=asc&filter=active';

    const result = joinPathUrl(url, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should handle empty path and query params', () => {
    const url = 'https://example.com/api';
    const params = [];
    const expectedUrl = 'https://example.com/api';

    const result = joinPathUrl(url, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should handle empty query params', () => {
    const url = 'https://example.com/api/:id';
    const params = [{ name: 'id', type: 'path', enabled: true, value: '123' }];
    const expectedUrl = 'https://example.com/api/123';

    const result = joinPathUrl(url, params);

    expect(result).toEqual(expectedUrl);
  });

  it('should handle invalid URL', () => {
    const url = 'example.com/api/:id';
    const params = [{ name: 'id', type: 'path', enabled: true, value: '123' }];
    const expectedUrl = 'http://example.com/api/123';

    const result = joinPathUrl(url, params);

    expect(result).toEqual(expectedUrl);
  });
});
