import type { Item as BrunoItem } from '@usebruno/schema-types/collection/item';
import parseItem from './parseItem';
import stringifyItem from './stringifyItem';

const grpcItem = (script: Record<string, string | null>) => ({
  type: 'grpc-request',
  name: 'SayHello',
  seq: 1,
  request: {
    url: '{{host}}',
    method: '/hello.HelloService/SayHello',
    methodType: 'unary',
    headers: [],
    auth: { mode: 'none' },
    body: { mode: 'grpc', grpc: [] },
    script,
    vars: { req: [], res: [] },
    assertions: [],
    tests: '',
    docs: ''
  }
}) as unknown as BrunoItem;

const allPhases = {
  beforeCallStart: 'console.log("before call start");',
  beforeMessageSend: 'console.log("before message send");',
  afterMessageReceive: 'console.log("after message receive");',
  afterCallEnd: 'console.log("after call end");'
};

describe('gRPC phase scripts — .yml serialization', () => {
  it('stringifies each phase as a grpc:<phase> script entry', () => {
    const yml = stringifyItem(grpcItem({ ...allPhases }));

    expect(yml).toContain('grpc:before-call-start');
    expect(yml).toContain('grpc:before-message-send');
    expect(yml).toContain('grpc:after-message-receive');
    expect(yml).toContain('grpc:after-call-end');
    expect(yml).toContain('console.log("before call start");');
    expect(yml).toContain('console.log("before message send");');
    expect(yml).toContain('console.log("after message receive");');
    expect(yml).toContain('console.log("after call end");');
  });

  it('round-trips every phase losslessly (parse → stringify → parse)', () => {
    const parsed = parseItem(stringifyItem(grpcItem({ ...allPhases })));
    expect(parsed.request?.script).toEqual(allPhases);
  });

  it('does not emit an entry for an empty or null phase', () => {
    const yml = stringifyItem(
      grpcItem({
        beforeCallStart: 'console.log("before call start");',
        beforeMessageSend: '',
        afterMessageReceive: null,
        afterCallEnd: 'console.log("after call end");'
      })
    );

    expect(yml).toContain('grpc:before-call-start');
    expect(yml).toContain('grpc:after-call-end');
    expect(yml).not.toContain('grpc:before-message-send');
    expect(yml).not.toContain('grpc:after-message-receive');

    const script = parseItem(yml).request?.script;
    expect(script?.beforeMessageSend).toBeNull();
    expect(script?.afterMessageReceive).toBeNull();
    expect(script?.beforeCallStart).toBe('console.log("before call start");');
  });
});
