const fs = require('fs');
const path = require('path');

const {
  bruToJson
} = require('../src');

describe('bruToJson', () => {
  it('should parse .bru file contents', () => {
    const requestFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.bru'), 'utf8');
    const result = bruToJson(requestFile);

    expect(result).toEqual({
      "ver": "1.0",
      "type": "http-request",
      "name": "Send Bulk SMS",
      "method": "GET",
      "url": "https://api.textlocal.in/bulk_json?apiKey=secret=&numbers=919988776655&message=hello&sender=600010",
      "params": [
        {
          "enabled": "1",
          "key": "apiKey",
          "value": "secret"
        },
        {
          "enabled": "1",
          "key": "numbers",
          "value": "998877665"
        },
        {
          "enabled": "1",
          "key": "message",
          "value": "hello"
        }
      ]
    });
  });
});


