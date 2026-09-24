const { itemSchema, environmentSchema, collectionSchema } = require('./index');

describe('annotation acceptance', () => {
  test('itemSchema accepts annotations on headers and params', async () => {
    const item = {
      uid: 'aaaaaaaaaaaaaaaaaaaaa',
      type: 'http-request',
      name: 'Req',
      request: {
        url: 'https://example.com',
        method: 'GET',
        headers: [
          { uid: 'bbbbbbbbbbbbbbbbbbbbb', name: 'X-Test', value: '1', annotations: [{ name: 'note', value: 'header note' }] }
        ],
        params: [
          { uid: 'ccccccccccccccccccccc', name: 'q', value: '1', type: 'query', annotations: [{ name: 'hint' }] }
        ],
      },
    };

    await expect(itemSchema.validate(item)).resolves.toBeTruthy();
  });

  test('environmentSchema accepts annotations on variables', async () => {
    const env = {
      uid: 'ddddddddddddddddddddd',
      name: 'Env',
      variables: [
        { uid: 'eeeeeeeeeeeeeeeeeeeee', name: 'API_KEY', value: 'abc', annotations: [{ name: 'secret', value: null }], type: 'text', enabled: true, secret: false }
      ]
    };

    await expect(environmentSchema.validate(env)).resolves.toBeTruthy();
  });

  test('collectionSchema accepts annotations in item vars and items', async () => {
    const coll = {
      version: '1',
      uid: 'fffffffffffffffffffff',
      name: 'Coll',
      items: [
        {
          uid: 'ggggggggggggggggggggg',
          type: 'http-request',
          name: 'Req2',
          request: { url: '/path', method: 'POST', headers: [], params: [], vars: { req: [{ uid: 'hhhhhhhhhhhhhhhhhhhhh', name: 'base', value: 'https://example.com', annotations: [{ name: 'base-note' }] }] } }
        }
      ]
    };

    await expect(collectionSchema.validate(coll)).resolves.toBeTruthy();
  });
});
