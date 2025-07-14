/**
 * This test file is used to test the text parser.
 */
const parser = require('../src/bruToJson');

describe('tags parser', () => {
  it('should parse request tags', () => {
    const input = `
meta {
  name: request
  type: http
  seq: 1
  tags: [
    tag_1
    tag_2
    tag_3
    tag_4
  ]
}
`;

    const output = parser(input);
    const expected = {
      meta: {
        name: 'request',
        type: 'http',
        tags: ['tag_1', 'tag_2', 'tag_3', 'tag_4'],
        seq: "1"
      }
    };
    expect(output).toEqual(expected);
  });
});
