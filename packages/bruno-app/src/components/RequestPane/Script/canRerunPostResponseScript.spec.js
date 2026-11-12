import { canRerunPostResponseScript } from './canRerunPostResponseScript';

const makeItem = (overrides = {}) => ({
  uid: 'item-1',
  type: 'http-request',
  requestUid: 'run-1',
  requestState: 'received',
  response: { status: 200, data: { ok: true }, stream: null },
  ...overrides
});

describe('canRerunPostResponseScript', () => {
  it('is enabled for a completed response and a non-empty script', () => {
    expect(canRerunPostResponseScript(makeItem(), 'console.log(res.getBody());')).toBe(true);
  });

  it.each([undefined, null, '', '  \n\t '])('is disabled when the script is %j', (script) => {
    expect(canRerunPostResponseScript(makeItem(), script)).toBe(false);
  });

  it('is disabled before any response was received', () => {
    expect(canRerunPostResponseScript(makeItem({ response: undefined, requestState: null }), 'x')).toBe(false);
  });

  it.each(['queued', 'sending'])('is disabled while the request is %s', (requestState) => {
    expect(canRerunPostResponseScript(makeItem({ requestState }), 'x')).toBe(false);
  });

  it('is disabled for failed requests', () => {
    expect(canRerunPostResponseScript(makeItem({ response: { status: 'Error', isError: true, error: 'ECONNREFUSED' } }), 'x')).toBe(false);
  });

  it('is disabled for streaming responses', () => {
    expect(canRerunPostResponseScript(makeItem({ response: { status: 200, stream: { running: true } } }), 'x')).toBe(false);
  });

  it('is disabled while a re-run is already in flight', () => {
    expect(canRerunPostResponseScript(makeItem({ postResponseScriptRunning: true }), 'x')).toBe(false);
  });

  it('is disabled for protocols whose responses are not reusable', () => {
    expect(canRerunPostResponseScript(makeItem({ type: 'grpc-request' }), 'x')).toBe(false);
  });
});
