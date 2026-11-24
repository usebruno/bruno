const fs = require('fs');
const path = require('path');
const collectionBruToJson = require('../src/collectionBruToJson');
const jsonToCollectionBru = require('../src/jsonToCollectionBru');

describe('collectionBruToJson', () => {
  it('should parse the collection bru file', () => {
    const input = fs.readFileSync(path.join(__dirname, 'fixtures', 'collection.bru'), 'utf8');
    const expected = require('./fixtures/collection.json');
    const output = collectionBruToJson(input);

    expect(output).toEqual(expected);
  });
});

describe('jsonToCollectionBru', () => {
  it('should convert the collection json to bru', () => {
    const input = require('./fixtures/collection.json');
    const expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'collection.bru'), 'utf8');
    const output = jsonToCollectionBru(input);

    expect(output).toEqual(expected);
  });
});

describe('description round-trip in collection.bru', () => {
  it('should round-trip a multiline description on a header', () => {
    const json = {
      headers: [{ name: 'Authorization', value: 'Bearer token', enabled: true, description: 'Line 1\nLine 2' }]
    };
    const bru = jsonToCollectionBru(json);
    const parsed = collectionBruToJson(bru);
    expect(parsed.headers[0].description).toBe('Line 1\nLine 2');
    expect(parsed.headers[0].value).toBe('Bearer token');
  });

  it('should round-trip a description on a var with a multiline value', () => {
    const json = {
      vars: {
        req: [{ name: 'myVar', value: 'line1\nline2', enabled: true, description: 'my desc' }]
      }
    };
    const bru = jsonToCollectionBru(json);
    const parsed = collectionBruToJson(bru);
    expect(parsed.vars.req[0].description).toBe('my desc');
    expect(parsed.vars.req[0].value).toBe('line1\nline2');
  });

  it('should round-trip a description containing triple-quotes', () => {
    const json = {
      headers: [{ name: 'X-Token', value: 'abc', enabled: true, description: 'has \'\'\' quotes' }]
    };
    const bru = jsonToCollectionBru(json);
    const parsed = collectionBruToJson(bru);
    expect(parsed.headers[0].description).toBe('has \'\'\' quotes');
  });
});

describe('jsonToCollectionBru - meta tags', () => {
  it('should serialize tags as a list block', () => {
    const bru = jsonToCollectionBru({ meta: { name: 'folder', seq: 1, tags: ['tag_1', 'tag_2'] } });

    expect(bru).toEqual(`meta {
  name: folder
  seq: 1
  tags: [
    tag_1
    tag_2
  ]
}
`);
  });

  it('should not write a tags key when tags is an empty array', () => {
    const bru = jsonToCollectionBru({ meta: { name: 'folder', tags: [] } });

    expect(bru).toEqual(`meta {
  name: folder
}
`);
  });

  it('should not write a tags key when tags is absent', () => {
    const bru = jsonToCollectionBru({ meta: { name: 'folder' } });

    expect(bru).toEqual(`meta {
  name: folder
}
`);
  });

  it('should serialize tags alongside other blocks', () => {
    const bru = jsonToCollectionBru({
      meta: { name: 'folder', tags: ['tag_1'] },
      headers: [{ name: 'content-type', value: 'application/json', enabled: true }],
      docs: 'some docs'
    });

    expect(bru).toEqual(`meta {
  name: folder
  tags: [
    tag_1
  ]
}

headers {
  content-type: application/json
}

docs {
  some docs
}
`);
  });
});

describe('tags round-trip in collection.bru', () => {
  it('should round-trip folder meta tags', () => {
    const json = { meta: { name: 'folder', seq: 1, tags: ['tag_1', 'tag-2', 'Tag_3'] } };
    const parsed = collectionBruToJson(jsonToCollectionBru(json));

    expect(parsed.meta.tags).toEqual(['tag_1', 'tag-2', 'Tag_3']);
    expect(parsed.meta.name).toEqual('folder');
    expect(parsed.meta.seq).toEqual('1');
  });

  it('should round-trip a collection.bru that has tags and other blocks', () => {
    const json = {
      meta: { name: 'folder', tags: ['smoke'] },
      headers: [{ name: 'Authorization', value: 'Bearer 123', enabled: true }],
      docs: 'This folder needs auth token to be set in the headers.'
    };
    const parsed = collectionBruToJson(jsonToCollectionBru(json));

    expect(parsed.meta.tags).toEqual(['smoke']);
    expect(parsed.headers).toEqual([{ name: 'Authorization', value: 'Bearer 123', enabled: true }]);
    expect(parsed.docs).toEqual('This folder needs auth token to be set in the headers.');
  });

  it('should round-trip a meta block with no tags', () => {
    const parsed = collectionBruToJson(jsonToCollectionBru({ meta: { name: 'folder', tags: [] } }));

    expect(parsed.meta.tags).toBeUndefined();
    expect(parsed.meta.name).toEqual('folder');
  });
});
