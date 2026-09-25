import { createResponseBodyClient } from './client';
import { mapNetworkResponseToRedux } from './index';

describe('response-body client ring', () => {
  test('mapNetworkResponseToRedux strips dataBuffer', () => {
    const mapped = mapNetworkResponseToRedux({
      status: 200,
      bodyRef: 'r1',
      data: { ok: true },
      dataBuffer: 'aaaa',
      size: 12
    });
    expect(mapped.dataBuffer).toBeUndefined();
    expect(mapped.bodyRef).toBe('r1');
    expect(mapped.data).toEqual({ ok: true });
  });

  test('client save/read forward to IpcPort', async () => {
    const calls = [];
    const ipc = {
      invoke: async (channel, ...args) => {
        calls.push([channel, ...args]);
        if (channel.includes('read')) return { data: 'hello', size: 5 };
        return { success: true };
      }
    };
    const client = createResponseBodyClient(ipc);
    await client.save('b1', { url: 'https://x' });
    expect(await client.read('b1')).toEqual({ data: 'hello', size: 5 });
    expect(await client.read('b1', { encoding: 'base64' })).toEqual({ data: 'hello', size: 5 });
    expect(calls.map((c) => c[0])).toEqual([
      'renderer:response-body-save',
      'renderer:response-body-read',
      'renderer:response-body-read'
    ]);
    expect(calls[1][1]).toBe('b1');
    expect(calls[2][1]).toBe('b1');
    expect(calls[2][2]).toEqual({ encoding: 'base64' });
  });
});
