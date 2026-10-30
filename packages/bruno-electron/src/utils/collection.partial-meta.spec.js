const { parseFileMeta } = require('./collection');
const { defaultClassify, FOLDER_ROOT_BASENAMES } = require('./mount');

describe('parseFileMeta — YAML partial metadata', () => {
  it('reads OpenCollection info and http url/method', () => {
    const yml = `info:
  name: needle-yml
  type: http
  seq: 3

http:
  method: POST
  url: https://payments.unique.example/charge

runtime:
  script: |
    console.log('heavy');
`;
    const meta = parseFileMeta(yml, 'yml');
    expect(meta).toMatchObject({
      name: 'needle-yml',
      type: 'http-request',
      seq: 3,
      request: { method: 'POST', url: 'https://payments.unique.example/charge' }
    });
    expect(meta.request.script).toEqual({});
    expect(meta.request.tests).toBe('');
  });

  it('maps graphql request metadata', () => {
    const yml = `info:
  name: gql
  type: graphql
  seq: 1

graphql:
  method: POST
  url: https://example.com/graphql
`;
    expect(parseFileMeta(yml, 'yml')).toMatchObject({
      type: 'graphql-request',
      request: { method: 'POST', url: 'https://example.com/graphql' }
    });
  });

  it('maps grpc and websocket request metadata', () => {
    const grpc = parseFileMeta(`info:
  name: rpc
  type: grpc
  seq: 2
grpc:
  method: POST
  url: grpc://service.example/rpc
`, 'yml');
    expect(grpc).toMatchObject({ type: 'grpc-request', request: { method: 'POST', url: 'grpc://service.example/rpc' } });

    const ws = parseFileMeta(`info:
  name: live
  type: websocket
  seq: 3
websocket:
  method: GET
  url: wss://live.example/socket
`, 'yml');
    expect(ws).toMatchObject({ type: 'ws-request', request: { method: 'GET', url: 'wss://live.example/socket' } });
  });
});

describe('defaultClassify — yaml extensions', () => {
  it('recognizes folder.yaml and collection.yaml roots', () => {
    expect(defaultClassify('folder.yaml')?.type).toBe('folder');
    expect(defaultClassify('collection.yaml')?.type).toBe('collection');
    expect(FOLDER_ROOT_BASENAMES.has('folder.yaml')).toBe(true);
  });
});
