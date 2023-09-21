const fs = require('fs');
const path = require('path');

const { jsonToBru } = require('../src');

describe('bruToJson', () => {
  it('should convert json file into .bru file', () => {
    const request = {
      type: 'http-request',
      name: 'Send Bulk SMS',
      seq: 1,
      request: {
        method: 'GET',
        url: 'https://api.textlocal.in/bulk_json?apiKey=secret=&numbers=919988776655&message=hello&sender=600010',
        params: [
          {
            enabled: true,
            name: 'apiKey',
            value: 'secret'
          },
          {
            enabled: true,
            name: 'numbers',
            value: '998877665'
          },
          {
            enabled: true,
            name: 'message',
            value: 'hello'
          }
        ],
        headers: [
          {
            enabled: true,
            name: 'content-type',
            value: 'application/json'
          },
          {
            enabled: true,
            name: 'accept-language',
            value: 'en-US,en;q=0.9,hi;q=0.8'
          },
          {
            enabled: false,
            name: 'transaction-id',
            value: '{{transactionId}}'
          }
        ],
        body: {
          mode: 'json',
          json: '{\n  "apikey": "secret",\n  "numbers": "+91998877665"\n}',
          graphql: {
            query: '{\n  launchesPast {\n    launch_success\n  }\n}'
          },
          text: 'Hello, there. You must be from the past',
          xml: '<body>back to the ice age</body>',
          formUrlEncoded: [
            {
              enabled: true,
              name: 'username',
              value: 'john'
            },
            {
              enabled: false,
              name: 'password',
              value: '{{password}}'
            }
          ],
          multipartForm: [
            {
              enabled: true,
              name: 'username',
              value: 'nash'
            },
            {
              enabled: false,
              name: 'password',
              value: 'governingdynamics'
            }
          ]
        },
        script: "const foo='bar';",
        tests: "bruno.test('200 ok', () => {});"
      }
    };

    const expectedBruFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'request.bru'), 'utf8');
    const actualBruFile = jsonToBru(request);

    expect(expectedBruFile).toEqual(actualBruFile);
  });
});
