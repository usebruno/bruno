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

describe('round-trip', () => {
  it('should preserve all six script blocks through jsonToBru and back', () => {
    const json = {
      script: {
        req: 'req.setHeader(\'Content-Type\', \'application/json\');',
        res: 'expect(res.status).to.equal(200);',
        beforeCallStart: 'req.setMetadata(\'authorization\', \'Bearer token\');',
        afterCallEnd: 'if (res.getStatusCode() === 0) {\n  bru.setVar(\'ok\', true);\n}',
        beforeMessageSend: 'bru.setVar(\'sent\', bru.grpc.request.message.timestamp);',
        afterMessageReceive: 'if (bru.grpc.response.message.data) {\n  bru.setVar(\'received\', true);\n}'
      }
    };

    expect(bruToJson(jsonToBru(json))).toEqual(json);
  });
});
