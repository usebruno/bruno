/**
 * This test file is used to test the text parser.
 */
const parser = require('../src/bruToJson');
const collectionParser = require('../src/collectionBruToJson');

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
        seq: '1'
      }
    };
    expect(output).toEqual(expected);
  });
});

describe('collection.bru tags parser', () => {
  it('should parse folder tags', () => {
    const input = `
meta {
  name: folder
  seq: 2
  tags: [
    tag_1
    tag_2
    tag_3
  ]
}
`;

    const output = collectionParser(input);
    const expected = {
      meta: {
        name: 'folder',
        seq: '2',
        tags: ['tag_1', 'tag_2', 'tag_3'],
        type: 'collection'
      }
    };
    expect(output).toEqual(expected);
  });

  it('should not add a tags key when the meta block has no tags', () => {
    const input = `
meta {
  name: folder
  seq: 1
}
`;

    const output = collectionParser(input);
    expect(output.meta.tags).toBeUndefined();
  });
});
