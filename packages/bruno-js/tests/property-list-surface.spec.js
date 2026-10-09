const ReadOnlyPropertyList = require('../src/readonly-property-list');
const HeaderList = require('../src/header-list');
const CookieList = require('../src/cookie-list');
const GrpcMetadataList = require('../src/grpc/grpc-metadata-list');
const GrpcMessageList = require('../src/grpc/grpc-message-list');

// Public method names reachable on an instance: own + inherited, up to Object.prototype.
const publicMethods = (instance) => {
  const names = new Set();
  for (let proto = Object.getPrototypeOf(instance); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === 'constructor' || name.startsWith('_')) continue;
      if (typeof Object.getOwnPropertyDescriptor(proto, name).value === 'function') names.add(name);
    }
  }
  return [...names].sort();
};

// Own enumerable keys scripts can see, minus protected `_` state.
const publicOwnKeys = (instance) => Object.keys(instance).filter((key) => !key.startsWith('_'));

const READ_API = [
  'all', 'count', 'each', 'filter', 'find', 'get', 'has', 'idx', 'indexOf',
  'map', 'one', 'reduce', 'toJSON', 'toObject', 'toString'
];

const cases = [
  {
    name: 'ReadOnlyPropertyList',
    create: () => new ReadOnlyPropertyList({ items: [] }),
    methods: READ_API,
    ownKeys: []
  },
  {
    name: 'HeaderList (req)',
    create: () => new HeaderList({ headers: {} }),
    methods: [...READ_API, 'add', 'assimilate', 'clear', 'populate', 'remove', 'repopulate', 'upsert'].sort(),
    ownKeys: []
  },
  {
    name: 'HeaderList (res)',
    create: () => new HeaderList({ headers: {} }, { writable: false }),
    methods: [...READ_API, 'add', 'assimilate', 'clear', 'populate', 'remove', 'repopulate', 'upsert'].sort(),
    ownKeys: []
  },
  {
    name: 'GrpcMetadataList',
    create: () => new GrpcMetadataList({ headers: {} }, { writable: true }),
    methods: [...READ_API, 'add', 'clear', 'remove', 'upsert'].sort(),
    ownKeys: []
  },
  {
    name: 'CookieList',
    create: () => new CookieList({
      getUrl: () => null,
      interpolate: (s) => s,
      createCookieJar: () => ({}),
      getCookiesForUrl: () => []
    }),
    methods: [...READ_API, 'add', 'clear', 'delete', 'jar', 'remove', 'upsert'].sort(),
    ownKeys: []
  },
  {
    name: 'GrpcMessageList',
    create: () => new GrpcMessageList([]),
    methods: ['all', 'count', 'each', 'filter', 'find', 'get', 'map', 'reduce', 'toJSON'],
    ownKeys: []
  }
];

describe('property list public surface', () => {
  describe.each(cases)('$name', ({ create, methods, ownKeys }) => {
    test('public methods', () => {
      expect(publicMethods(create())).toEqual(methods);
    });

    test('public own keys', () => {
      expect(publicOwnKeys(create())).toEqual(ownKeys);
    });
  });
});
