const fs = require('node:fs');
const path = require('node:path');
const { bruRequestParseAndRedactBodyData } = require("../utils/request-parse-and-redact-body-data");

describe("parse and redact body data", () => {
  it("should redact body blocks from the bru file string", () => {
    const fixturesPath = `/fixtures/request-parse-and-redact-body-data`;
    const inputBruString = fs.readFileSync(path.join(__dirname, fixturesPath, './input.bru'), 'utf8');
    const expectedOutputBruString = fs.readFileSync(path.join(__dirname, fixturesPath, './output.bru'), 'utf8');

    const res = bruRequestParseAndRedactBodyData(inputBruString);
    expect(res.bruFileStringWithRedactedBody).toBe(expectedOutputBruString);
    expect(res.extractedBodyContent).toEqual({
      graphql: `
{
  launchesPast {
    launch_site {
      site_name
    }
    launch_success
  }
}
      `.trim(),
      json: `
{
  "hello": "world"
}     
      `.trim(),
      sparql: `
SELECT * WHERE {
  ?subject ?predicate ?object .
}
LIMIT 10
      `.trim(),
      text: `This is a text body`, 
      xml: `
<xml>
  <name>John</name>
  <age>30</age>
</xml>
      `.trim()
    })
  });

  it("should handle files without trailing newlines when body is the final block", () => {
    const input = [
      'meta {',
      '  name: Test',
      '  type: http',
      '  seq: 1',
      '}',
      '',
      'body:json {',
      '  {',
      '    "foo": "bar"',
      '  }',
      '}'
    ].join('\n');

    const res = bruRequestParseAndRedactBodyData(input);
    expect(res.extractedBodyContent.json).toBe('{\n  "foo": "bar"\n}');
    expect(res.bruFileStringWithRedactedBody).toBe('meta {\n  name: Test\n  type: http\n  seq: 1\n}\n');
  });

  it("should handle files without trailing newlines when non-body block is the final block", () => {
    const input = [
      'meta {',
      '  name: Test',
      '  type: http',
      '  seq: 1',
      '}',
      '',
      'headers {',
      '  foo: bar',
      '}'
    ].join('\n');

    const res = bruRequestParseAndRedactBodyData(input);
    expect(res.bruFileStringWithRedactedBody).toBe('meta {\n  name: Test\n  type: http\n  seq: 1\n}\n\nheaders {\n  foo: bar\n}\n');
  });
});
