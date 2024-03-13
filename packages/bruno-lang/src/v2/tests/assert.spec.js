/**
 * This test file is used to test the text parser.
 */
const parser = require('../src/bruToJson');

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
});
