import stringifyItem from './stringifyItem';
import parseItem from './parseItem';
import stringifyCollection from './stringifyCollection';
import parseCollection from './parseCollection';
import stringifyFolder from './stringifyFolder';
import parseFolder from './parseFolder';

const GRPC_SLOTS = {
  beforeCallStart: 'before()',
  afterCallEnd: 'after()',
  beforeMessageSend: 'beforeSend()',
  afterMessageReceive: 'afterReceive()'
};

const ALL_SLOTS = {
  req: 'pre()',
  res: 'post()',
  ...GRPC_SLOTS
};

const HTTP_TYPES = ['before-request', 'after-response'];
const GRPC_TYPES = [
  'grpc:before-call-start',
  'grpc:after-call-end',
  'grpc:before-message-send',
  'grpc:after-message-receive'
];

const expectScriptTypes = (yml: string, written: string[], dropped: string[]) => {
  written.forEach((type) => expect(yml).toContain(`type: ${type}`));
  dropped.forEach((type) => expect(yml).not.toContain(`type: ${type}`));
};

const itemWithAllSlots = (type: string, request: Record<string, any>) => ({
  uid: 'i1',
  type,
  name: 'r',
  seq: 1,
  request: {
    auth: { mode: 'none' },
    headers: [],
    script: { ...ALL_SLOTS },
    tests: null,
    vars: { req: [], res: [] },
    ...request
  }
}) as any;

const rootWithScript = (script: Record<string, string | null>) => ({
  meta: { name: 'my-folder', seq: 1 },
  request: {
    headers: [],
    auth: { mode: 'none' },
    script,
    tests: null,
    vars: { req: [], res: [] }
  },
  docs: null
}) as any;

describe('script — request items', () => {
  const httpFamily = [
    [
      'http',
      itemWithAllSlots('http-request', {
        url: 'https://example.com',
        method: 'GET',
        params: [],
        body: { mode: 'none' }
      })
    ],
    [
      'graphql',
      itemWithAllSlots('graphql-request', {
        url: 'https://example.com/graphql',
        method: 'POST',
        params: [],
        body: { mode: 'graphql', graphql: { query: '{ hi }', variables: '' } }
      })
    ],
    // TODO: Move it to a separate test block, once ws scripts are added.
    [
      'websocket',
      itemWithAllSlots('ws-request', {
        url: 'wss://example.com',
        body: { mode: 'ws', ws: [{ name: 'message 1', content: '{}' }] }
      })
    ]
  ] as [string, any][];

  it.each(httpFamily)('a %s request writes req/res and drops the grpc hooks', (_name, item) => {
    const yml = stringifyItem(item);

    expectScriptTypes(yml, HTTP_TYPES, GRPC_TYPES);
    expect(yml).not.toContain('before()');
    expect(yml).not.toContain('after()');
    expect(yml).not.toContain('beforeSend()');
    expect(yml).not.toContain('afterReceive()');

    expect(parseItem(yml).request!.script).toEqual({ req: 'pre()', res: 'post()' });
  });

  it('a grpc request writes the lifecycle hooks and drops req/res', () => {
    const item = itemWithAllSlots('grpc-request', {
      url: 'grpc://localhost:50051',
      method: '/hello.Greeter/SayHello',
      methodType: 'unary',
      body: { mode: 'grpc', grpc: [{ name: 'message 1', content: '{}' }] },
      assertions: []
    });

    const yml = stringifyItem(item);

    expectScriptTypes(yml, GRPC_TYPES, HTTP_TYPES);
    expect(yml).not.toContain('pre()');
    expect(yml).not.toContain('post()');

    expect(parseItem(yml).request!.script).toEqual({
      beforeCallStart: 'before()',
      afterCallEnd: 'after()',
      beforeMessageSend: 'beforeSend()',
      afterMessageReceive: 'afterReceive()'
    });
  });
});

describe('script — collection and folder roots', () => {
  it('a collection root writes req/res and drops the grpc hooks', () => {
    const yml = stringifyCollection(rootWithScript({ ...ALL_SLOTS }), { name: 'c' });

    expectScriptTypes(yml, HTTP_TYPES, GRPC_TYPES);

    expect(parseCollection(yml).collectionRoot.request!.script).toEqual({ req: 'pre()', res: 'post()' });
  });

  it('a folder root writes req/res and drops the grpc hooks', () => {
    const yml = stringifyFolder(rootWithScript({ ...ALL_SLOTS }));

    expectScriptTypes(yml, HTTP_TYPES, GRPC_TYPES);

    expect(parseFolder(yml).request!.script).toEqual({ req: 'pre()', res: 'post()' });
  });

  it('a collection root carrying only grpc hooks writes no scripts at all', () => {
    const yml = stringifyCollection(rootWithScript({ ...GRPC_SLOTS }), { name: 'c' });

    expect(yml).not.toContain('scripts:');

    expect(parseCollection(yml).collectionRoot.request?.script).toBeUndefined();
  });

  it('a folder root carrying only grpc hooks writes no scripts at all', () => {
    const yml = stringifyFolder(rootWithScript({ ...GRPC_SLOTS }));

    expect(yml).not.toContain('scripts:');

    expect(parseFolder(yml).request!.script).toEqual({ req: null, res: null });
  });
});
