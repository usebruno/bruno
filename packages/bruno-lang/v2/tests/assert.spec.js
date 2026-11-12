/**
 * This test file is used to test the text parser.
 */
const parser = require('../src/bruToJson');
const jsonToBru = require('../src/jsonToBru');

describe('assert parser', () => {
  it('should parse assert statement', () => {
    const input = `
assert {
  res("data.airports").filter(a => a.code ==="BLR").name: "Bangalore International Airport"
}
`;

    const output = parser(input);
    const expected = {
      assertions: [
        {
          name: 'res("data.airports").filter(a => a.code ==="BLR").name',
          value: '"Bangalore International Airport"',
          enabled: true
        }
      ]
    };
    expect(output).toEqual(expected);
  });

  it.each([
    'res.body["hydra:totalItems"]',
    'res.body[\'hydra:totalItems\']',
    'res.body[`hydra:totalItems`]',
    String.raw`res.body["hydra\":totalItems"]`
  ])('should preserve assertion %s after saving', (name) => {
    const input = `
assert {
  res.status: eq 200
  ${name}: isNumber
}
`;
    const expected = {
      assertions: [
        { name: 'res.status', value: 'eq 200', enabled: true },
        { name, value: 'isNumber', enabled: true }
      ]
    };

    expect(parser(input)).toEqual(expected);
    expect(parser(jsonToBru(expected))).toEqual(expected);

    expected.assertions[1].enabled = false;
    expect(parser(jsonToBru(expected))).toEqual(expected);
  });

  it('should parse regex assertions containing quotes', () => {
    const input = `
assert {
  /"/.test(res.body): eq "true"
}
`;

    expect(parser(input)).toEqual({
      assertions: [
        { name: '/"/.test(res.body)', value: 'eq "true"', enabled: true }
      ]
    });
  });
});
