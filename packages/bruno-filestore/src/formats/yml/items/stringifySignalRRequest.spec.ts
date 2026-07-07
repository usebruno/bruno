import stringifySignalRRequest from './stringifySignalRRequest';
import parseItem from '../parseItem';

describe('stringifySignalRRequest / parseItem round-trip', () => {
  it('round-trips a single message', () => {
    const item = {
      uid: 'i1',
      type: 'signalr-request',
      name: 'broadcast',
      seq: 1,
      request: {
        url: 'http://localhost:5246/hub',
        headers: [],
        body: {
          mode: 'signalr',
          signalr: [
            { uid: 'm1', name: 'broadcast', type: 'json', content: '["hello"]', selected: true }
          ]
        },
        auth: { mode: 'none' },
        script: { req: null, res: null },
        vars: { req: [], res: [] },
        tests: null,
        docs: ''
      }
    } as any;

    const yml = stringifySignalRRequest(item);
    const reparsed = parseItem(yml);

    expect(reparsed.name).toBe('broadcast');
    expect(reparsed.request.url).toBe('http://localhost:5246/hub');
    expect(reparsed.request.body.mode).toBe('signalr');
    expect(reparsed.request.body.signalr).toHaveLength(1);
    expect(reparsed.request.body.signalr[0]).toMatchObject({
      name: 'broadcast',
      type: 'json',
      content: '["hello"]',
      selected: true
    });
  });

  it('round-trips multiple messages with headers and auth', () => {
    const item = {
      uid: 'i1',
      type: 'signalr-request',
      name: 'multi',
      seq: 2,
      request: {
        url: 'http://localhost:5246/hub',
        headers: [
          { name: 'Authorization', value: 'Bearer tok', enabled: true }
        ],
        body: {
          mode: 'signalr',
          signalr: [
            { uid: 'm1', name: 'join', type: 'json', content: '["room1"]', selected: true },
            { uid: 'm2', name: 'leave', type: 'text', content: '["room2"]', selected: false }
          ]
        },
        auth: { mode: 'bearer', bearer: { token: 'tok' } },
        script: { req: 'console.log("connected");', res: null },
        vars: { req: [{ uid: 'v1', name: 'env', value: 'prod', enabled: true, local: false }], res: [] },
        tests: null,
        docs: 'test documentation'
      }
    } as any;

    const yml = stringifySignalRRequest(item);
    const reparsed = parseItem(yml);

    expect(reparsed.request.url).toBe('http://localhost:5246/hub');
    expect(reparsed.request.body.signalr).toHaveLength(2);
    expect(reparsed.request.body.signalr[0]).toMatchObject({
      name: 'join',
      type: 'json',
      content: '["room1"]',
      selected: true
    });
    expect(reparsed.request.body.signalr[1]).toMatchObject({
      name: 'leave',
      type: 'text',
      content: '["room2"]',
      selected: false
    });
    expect(reparsed.request.headers).toHaveLength(1);
    expect(reparsed.request.auth).toMatchObject({ mode: 'bearer', bearer: { token: 'tok' } });
    expect(reparsed.request.script.req).toBe('console.log("connected");');
  });

  it('handles empty body gracefully', () => {
    const item = {
      uid: 'i1',
      type: 'signalr-request',
      name: 'empty',
      seq: 1,
      request: {
        url: '',
        headers: [],
        body: {
          mode: 'signalr',
          signalr: []
        },
        auth: { mode: 'none' },
        script: { req: null, res: null },
        vars: { req: [], res: [] },
        tests: null,
        docs: ''
      }
    } as any;

    const yml = stringifySignalRRequest(item);
    const reparsed = parseItem(yml);

    expect(reparsed.request.body.signalr).toEqual([]);
    expect(reparsed.request.url).toBe('');
  });
});
