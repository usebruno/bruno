jest.mock('nanoid', () => {
  let counter = 0;
  return {
    customAlphabet: () => () => `uid-${++counter}`
  };
});

import { collectionsSlice } from './index';

const reducer = collectionsSlice.reducer;

const makeStateWith = (item) => ({
  collections: [
    {
      uid: 'col1',
      items: [item]
    }
  ]
});

describe('url edits keep query param metadata the url cannot hold', () => {
  const { requestUrlChanged, updateResponseExampleRequestUrl } = collectionsSlice.actions;

  const queryParam = (overrides) => ({
    uid: 'p1',
    name: 'page',
    value: '1',
    description: 'page number',
    annotations: [{ name: 'deprecated' }],
    enabled: true,
    type: 'query',
    ...overrides
  });

  const makeRequestItem = (params) => ({
    uid: 'item1',
    type: 'http-request',
    request: { url: 'https://example.com/items?page=1', params }
  });

  const changeUrl = (item, url) => {
    const next = reducer(makeStateWith(item), requestUrlChanged({ collectionUid: 'col1', itemUid: 'item1', url }));
    return next.collections[0].items[0].draft.request.params;
  };

  it('keeps the description and annotations when the param value is edited', () => {
    const params = changeUrl(makeRequestItem([queryParam()]), 'https://example.com/items?page=2');

    expect(params).toHaveLength(1);
    expect(params[0]).toMatchObject({
      uid: 'p1',
      name: 'page',
      value: '2',
      description: 'page number',
      annotations: [{ name: 'deprecated' }]
    });
  });

  it('keeps the description of existing params when the path changes and a new param is added', () => {
    const params = changeUrl(
      makeRequestItem([queryParam()]),
      'https://example.com/products?page=1&sort=asc'
    );

    expect(params).toHaveLength(2);
    expect(params[0]).toMatchObject({ uid: 'p1', name: 'page', description: 'page number' });
    expect(params[1]).toMatchObject({ name: 'sort', value: 'asc' });
    expect(params[1].description).toBeUndefined();
  });

  it('keeps the description of each param when several are present', () => {
    const params = changeUrl(
      makeRequestItem([
        queryParam(),
        queryParam({ uid: 'p2', name: 'size', value: '10', description: 'page size', annotations: null })
      ]),
      'https://example.com/items?page=3&size=20'
    );

    expect(params.map((p) => [p.uid, p.description])).toEqual([
      ['p1', 'page number'],
      ['p2', 'page size']
    ]);
  });

  it('does not give a param the description of a sibling that only shares its value', () => {
    const params = changeUrl(
      makeRequestItem([
        queryParam({ uid: 'p1', name: 'a', value: 'true', description: 'desc A' }),
        queryParam({ uid: 'p2', name: 'b', value: 'true', description: 'desc B' })
      ]),
      'https://example.com/items?b=true'
    );

    expect(params).toHaveLength(1);
    expect(params[0]).toMatchObject({ uid: 'p2', name: 'b', description: 'desc B' });
  });

  it('keeps the description of a param renamed in the url', () => {
    const params = changeUrl(makeRequestItem([queryParam()]), 'https://example.com/items?pages=1');

    expect(params[0]).toMatchObject({ uid: 'p1', name: 'pages', description: 'page number' });
  });

  it('keeps the description when a response example url is edited', () => {
    const item = {
      ...makeRequestItem([]),
      examples: [
        {
          uid: 'ex1',
          request: { url: 'https://example.com/items?page=1', params: [queryParam()] }
        }
      ]
    };

    const next = reducer(
      makeStateWith(item),
      updateResponseExampleRequestUrl({
        collectionUid: 'col1',
        itemUid: 'item1',
        exampleUid: 'ex1',
        request: { url: 'https://example.com/items?page=2' }
      })
    );
    const params = next.collections[0].items[0].draft.examples[0].request.params;

    expect(params[0]).toMatchObject({ uid: 'p1', value: '2', description: 'page number' });
  });
});
