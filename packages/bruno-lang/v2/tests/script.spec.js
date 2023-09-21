/**
 * This test file is used to test the text parser.
 */
const parser = require('../src/bruToJson');

describe('script parser', () => {
  it('should parse request script', () => {
    const input = `
script:pre-request {
  $req.setHeader('Content-Type', 'application/json');
}
`;

    const output = parser(input);
    const expected = {
      script: {
        req: "$req.setHeader('Content-Type', 'application/json');"
      }
    };
    expect(output).toEqual(expected);
  });

  it('should parse response script', () => {
    const input = `
script:post-response {
  expect(response.status).to.equal(200);
}
`;

    const output = parser(input);
    const expected = {
      script: {
        res: 'expect(response.status).to.equal(200);'
      }
    };
    expect(output).toEqual(expected);
  });
});
