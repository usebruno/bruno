import type { GrpcRequest as BrunoGrpcRequest } from '@usebruno/schema-types/requests/grpc';
import stringifyItem from './stringifyItem';
import parseItem from './parseItem';

// `Item['request']` is an un-discriminated union, so the grpc arm has to be named to reach the
// lifecycle hooks — the same cast the serializers make.
const parseGrpcItem = (yml: string) => parseItem(yml).request as BrunoGrpcRequest;

const grpcItem = (script: Record<string, string | null>, tests: string | null = null) => ({
  uid: 'i1',
  type: 'grpc-request',
  name: 'say hello',
  seq: 1,
  request: {
    url: 'grpc://localhost:50051',
    method: '/hello.Greeter/SayHello',
    methodType: 'unary',
    headers: [],
    auth: { mode: 'none' },
    body: { mode: 'grpc', grpc: [{ name: 'message 1', content: '{}' }] },
    script,
    tests,
    vars: { req: [], res: [] },
    assertions: []
  }
}) as any;

describe('grpc lifecycle hooks — stringify/parse round trip', () => {
  it('writes both hooks as grpc-prefixed script types and reads them back', () => {
    const yml = stringifyItem(grpcItem({ beforeCallStart: 'bru.setVar("a", 1);', afterCallEnd: 'bru.setVar("b", 2);' }));

    expect(yml).toContain('grpc:before-call-start');
    expect(yml).toContain('grpc:after-call-end');

    const { script } = parseGrpcItem(yml);
    expect(script!.beforeCallStart).toBe('bru.setVar("a", 1);');
    expect(script!.afterCallEnd).toBe('bru.setVar("b", 2);');
  });

  it('preserves a multiline hook verbatim', () => {
    const beforeCallStart = ['const now = 1;', 'if (now) {', '  bru.setVar("startedAt", now);', '}'].join('\n');

    const yml = stringifyItem(grpcItem({ beforeCallStart, afterCallEnd: null }));
    const { script } = parseGrpcItem(yml);

    expect(script!.beforeCallStart).toBe(beforeCallStart);
  });

  it('round-trips one hook without inventing the other', () => {
    const yml = stringifyItem(grpcItem({ beforeCallStart: null, afterCallEnd: 'bru.setVar("b", 2);' }));

    expect(yml).not.toContain('grpc:before-call-start');

    const { script } = parseGrpcItem(yml);
    expect(script!.beforeCallStart).toBeNull();
    expect(script!.afterCallEnd).toBe('bru.setVar("b", 2);');
  });

  it('writes no scripts block when both hooks are empty', () => {
    const yml = stringifyItem(grpcItem({ beforeCallStart: null, afterCallEnd: '   ' }));

    expect(yml).not.toContain('scripts:');

    const { script } = parseGrpcItem(yml);
    expect(script!.beforeCallStart).toBeNull();
    expect(script!.afterCallEnd).toBeNull();
  });

  it('keeps tests alongside the hooks', () => {
    const yml = stringifyItem(
      grpcItem({ beforeCallStart: 'bru.setVar("a", 1);', afterCallEnd: null }, 'test("ok", () => {});')
    );

    const request = parseGrpcItem(yml);
    expect(request.script!.beforeCallStart).toBe('bru.setVar("a", 1);');
    expect(request.tests).toBe('test("ok", () => {});');
  });

  it('survives a second round trip unchanged', () => {
    const item = grpcItem({ beforeCallStart: 'bru.setVar("a", 1);', afterCallEnd: 'bru.setVar("b", 2);' });

    const firstPass = stringifyItem(item);
    const secondPass = stringifyItem(parseItem(firstPass));

    expect(secondPass).toBe(firstPass);
  });
});
