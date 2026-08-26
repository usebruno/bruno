import { createResponseBodyClient } from './client';
import { mediaUrlFor } from './media-url';
import { createWindowedTextModel } from './windowed-text';
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
      bodyStorage: 'memory',
      data: { ok: true },
      dataBuffer: 'aaaa',
      size: 12
    });
    expect(mapped.dataBuffer).toBeUndefined();
    expect(mapped.bodyRef).toBe('r1');
    expect(mapped.data).toEqual({ ok: true });
  });

  test('client forwards invoke channels', async () => {
    const calls = [];
    const ipc = {
      invoke: async (channel, ...args) => {
        calls.push([channel, ...args]);
        if (channel === 'renderer:response-body-stat') return { size: 5, storage: 'memory' };
        if (channel === 'renderer:response-body-read') return Buffer.from('hello').toString('base64');
        return { success: true };
      }
    };
    const client = createResponseBodyClient(ipc);
    expect(await client.getStat('b1')).toEqual({ size: 5, storage: 'memory' });
    const buf = await client.readRange('b1', 0, 5);
    expect(Buffer.from(buf).toString()).toBe('hello');
    expect(calls[0][0]).toBe('renderer:response-body-stat');
    expect(calls[1][0]).toBe('renderer:response-body-read');
  });

  test('WindowedTextModel loads initial window', async () => {
    const client = {
      getStat: async () => ({ size: 10 }),
      readRangeAsText: async (_ref, offset, length) => `chunk-${offset}-${length}`
    };
    const model = createWindowedTextModel({ bodyRef: 'b', client, windowSize: 4, totalSize: 10 });
    const first = await model.loadInitial();
    expect(first.text).toBe('chunk-0-4');
    expect(first.size).toBe(10);
    expect(first.hasMoreForward).toBe(true);
    expect(first.hasMoreBackward).toBe(false);
  });

  test('WindowedTextModel shiftForward advances and eventually ends', async () => {
    const reads = [];
    const client = {
      getStat: async () => ({ size: 10 }),
      readRangeAsText: async (_ref, offset, length) => {
        reads.push([offset, length]);
        return `c${offset}`;
      }
    };
    const model = createWindowedTextModel({ bodyRef: 'b', client, windowSize: 4, totalSize: 10 });
    await model.loadInitial();
    const next = await model.shiftForward();
    expect(reads).toEqual([[0, 4], [4, 4]]);
    expect(next.startOffset).toBe(0);
    expect(next.text).toBe('c0c4');
    expect(next.hasMoreForward).toBe(true);

    const last = await model.shiftForward();
    expect(reads).toEqual([[0, 4], [4, 4], [8, 4]]);
    expect(last.text).toBe('c0c4c8');
    expect(last.hasMoreForward).toBe(false);
  });

  test('WindowedTextModel evicts oldest windows when over maxWindows', async () => {
    const client = {
      getStat: async () => ({ size: 20 }),
      readRangeAsText: async (_ref, offset) => `W${offset}`
    };
    const model = createWindowedTextModel({
      bodyRef: 'b',
      client,
      windowSize: 4,
      maxWindows: 2,
      totalSize: 20
    });
    await model.loadInitial();
    await model.shiftForward();
    expect(model.getWindows().map((w) => w.offset)).toEqual([0, 4]);

    const third = await model.shiftForward();
    expect(model.getWindows().map((w) => w.offset)).toEqual([4, 8]);
    expect(third.removedPrefixChars).toBe('W0'.length);
    expect(third.startOffset).toBe(4);
    expect(third.hasMoreBackward).toBe(true);

    const back = await model.shiftBackward();
    expect(model.getWindows().map((w) => w.offset)).toEqual([0, 4]);
    expect(back.prependedChars).toBe('W0'.length);
    expect(back.hasMoreBackward).toBe(false);
  });

  test('client pin/release/save forward to IpcPort', async () => {
    const calls = [];
    const ipc = {
      invoke: async (channel, ...args) => {
        calls.push([channel, ...args]);
        return channel.includes('pin') ? 'pin-1' : { success: true };
      }
    };
    const client = createResponseBodyClient(ipc);
    expect(await client.pin('b1')).toBe('pin-1');
    await client.release('pin-1');
    await client.save('b1', { url: 'https://x' });
    expect(calls.map((c) => c[0])).toEqual([
      'renderer:response-body-pin',
      'renderer:response-body-release',
      'renderer:response-body-save'
    ]);
  });
});
