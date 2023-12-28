const TOML = require('@iarna/toml');
const jsonToToml = require('../../src/jsonToToml');

const json = {
  meta: {
    name: 'Get users',
    type: 'http',
    seq: '1'
  },
  http: {
    method: 'get',
    url: 'https://reqres.in/api/users'
  },
  headers: {
    Accept: 'application/json'
  }
};

const toml = `[meta]
name = 'Get users'
type = 'http'
seq = '1'

[http]
method = 'get'
url = 'https://reqres.in/api/users'

[headers]
Accept = 'application/json'
`;

describe('jsonToToml - simple get', () => {
  it('should parse the json file', () => {
    expect(jsonToToml(json)).toEqual(toml);
  });
});
