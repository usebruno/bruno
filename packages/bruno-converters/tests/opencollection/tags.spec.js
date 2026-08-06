import { fromOpenCollectionTags } from '../../src/opencollection/common/tags';
import { openCollectionToBruno } from '../../src/opencollection/opencollection-to-bruno';

describe('fromOpenCollectionTags', () => {
  test('coerces numeric YAML tags to strings', () => {
    expect(fromOpenCollectionTags(['close-code', 1000, 1008])).toEqual(['close-code', '1000', '1008']);
  });

  test('returns empty array for missing tags', () => {
    expect(fromOpenCollectionTags(undefined)).toEqual([]);
    expect(fromOpenCollectionTags(null)).toEqual([]);
    expect(fromOpenCollectionTags([])).toEqual([]);
  });

  test('drops null and empty-string tags', () => {
    expect(fromOpenCollectionTags(['ok', null, '', undefined, 42])).toEqual(['ok', '42']);
  });
});

describe('openCollectionToBruno: numeric tags', () => {
  const collectionWithNumericTags = (type, extras = {}) => ({
    opencollection: '1.0.0',
    info: { name: 'Tagged' },
    items: [
      {
        info: { name: 'req', type, tags: ['close-code', 1000], seq: 1 },
        ...extras
      }
    ]
  });

  test('coerces websocket item tags to strings', () => {
    const bruno = openCollectionToBruno(
      collectionWithNumericTags('websocket', { websocket: { url: 'ws://localhost' } })
    );
    expect(bruno.items[0].tags).toEqual(['close-code', '1000']);
  });

  test('coerces http item tags to strings', () => {
    const bruno = openCollectionToBruno(
      collectionWithNumericTags('http', { http: { method: 'GET', url: 'http://localhost' } })
    );
    expect(bruno.items[0].tags).toEqual(['close-code', '1000']);
  });

  test('coerces graphql item tags to strings', () => {
    const bruno = openCollectionToBruno(
      collectionWithNumericTags('graphql', {
        http: { method: 'POST', url: 'http://localhost/graphql' },
        graphql: { query: '{ __typename }' }
      })
    );
    expect(bruno.items[0].tags).toEqual(['close-code', '1000']);
  });

  test('coerces grpc item tags to strings', () => {
    const bruno = openCollectionToBruno(
      collectionWithNumericTags('grpc', {
        grpc: { url: 'localhost:50051', method: '/pkg.Service/Method' }
      })
    );
    expect(bruno.items[0].tags).toEqual(['close-code', '1000']);
  });

  test('coerces folder tags and nested item tags to strings', () => {
    const bruno = openCollectionToBruno({
      opencollection: '1.0.0',
      info: { name: 'Tagged' },
      items: [
        {
          info: { name: 'folder', type: 'folder', tags: [1008], seq: 1 },
          items: [
            {
              info: { name: 'child', type: 'websocket', tags: [1000], seq: 1 },
              websocket: { url: 'ws://localhost' }
            }
          ]
        }
      ]
    });
    expect(bruno.items[0].tags).toEqual(['1008']);
    expect(bruno.items[0].items[0].tags).toEqual(['1000']);
  });
});
