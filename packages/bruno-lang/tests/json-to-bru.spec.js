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
      ],
      "headers": [
        {
          "enabled": "1",
          "key": "content-type",
          "value": "application/json"
        },
        {
          "enabled": "1",
          "key": "accept-language",
          "value": "en-US,en;q=0.9,hi;q=0.8"
        },
        {
          "enabled": "0",
          "key": "transaction-id",
          "value": "{{transactionId}}"
        }
      ],
      "body": {
        "mode": "json",
        "json": '{"apikey":"secret","numbers":"+91998877665"}',
        "graphql": {
          "query": "  {\n    launchesPast {\n      launch_success\n    }\n  }"
        },
        "text": "  Hello, there. You must be from the past",
        "xml": "  <body>back to the ice age</body>",
        "formUrlEncoded": [
          {
            "enabled": "1",
            "key": "username",
            "value": "john"
          },
          {
            "enabled": "0",
            "key": "password",
            "value": "{{password}}"
          }
        ],
        "multipartForm": [
          {
            "enabled": "1",
            "key": "username",
            "value": "nash"
          },
          {
            "enabled": "0",
            "key": "password",
            "value": "governingdynamics"
          }
        ]
      }
    });
  });
});


