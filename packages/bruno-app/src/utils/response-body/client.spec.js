import { createResponseBodyClient } from './client';
import { mediaUrlFor } from './media-url';
import { mapNetworkResponseToRedux } from './index';

describe('response-body client ring', () => {
  test('mediaUrlFor builds bruno-response URL', () => {
    expect(mediaUrlFor('abc-123')).toBe('bruno-response://body/abc-123');
    expect(mediaUrlFor(null)).toBeNull();
  });

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

  test('client pin/release/save/read forward to IpcPort', async () => {
    const calls = [];
    const ipc = {
      invoke: async (channel, ...args) => {
        calls.push([channel, ...args]);
        if (channel.includes('pin')) return 'pin-1';
        if (channel.includes('read')) return { data: 'hello', size: 5 };
        return { success: true };
      }
    };
    const client = createResponseBodyClient(ipc);
    expect(await client.pin('b1')).toBe('pin-1');
    await client.release('pin-1');
    await client.save('b1', { url: 'https://x' });
    expect(await client.read('b1')).toEqual({ data: 'hello', size: 5 });
    expect(calls.map((c) => c[0])).toEqual([
      'renderer:response-body-pin',
      'renderer:response-body-release',
      'renderer:response-body-save',
      'renderer:response-body-read'
    ]);
  });
});
