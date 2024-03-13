const fs = require('fs');
const path = require('path');

const { bruToEnvJson } = require('../src');

describe('bruToEnvJson', () => {
  it('should parse .bru file contents', () => {
    const requestFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'env.bru'), 'utf8');
    const result = bruToEnvJson(requestFile);

    expect(result).toEqual({
      variables: [
        {
          enabled: true,
          name: 'host',
          value: 'https://www.google.com',
          type: 'text'
        },
        {
          enabled: true,
          name: 'jwt',
          value: 'secret',
          type: 'text'
        },
        {
          enabled: false,
          name: 'Content-type',
          value: 'application/json',
          type: 'text'
        }
      ]
    });
  });
});
