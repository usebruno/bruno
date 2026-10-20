const mockAcquire = jest.fn();
const mockRelease = jest.fn();

jest.mock('../session-pool', () => ({ acquireSession: (...args: unknown[]) => mockAcquire(...args) }));
jest.mock('../headers', () => ({
  buildHttp2RequestHeaders: jest.fn(() => ({ ':method': 'GET', ':path': '/' })),
  parseHttp2ResponseHeaders: jest.fn((h: Record<string, unknown>) => ({ status: Number(h[':status']), headers: {} }))
}));

import { EventEmitter } from 'node:events';
import { sendHttp2Request } from '../send-request';

type FakeStream = EventEmitter & { rstCode: number; end: jest.Mock; close: jest.Mock };

// Drain microtasks so the ready.then() gate runs and the stream is issued.
const flush = () => new Promise((resolve) => setImmediate(resolve));

let fakeStream: FakeStream;
let requestSpy: jest.Mock;

beforeEach(() => {
  mockRelease.mockReset();
  fakeStream = Object.assign(new EventEmitter(), { rstCode: 0, end: jest.fn(), close: jest.fn() }) as FakeStream;
  requestSpy = jest.fn(() => fakeStream);
  mockAcquire.mockReset().mockReturnValue({
    session: { request: requestSpy },
    releaseStream: mockRelease,
    serverSettingsReceived: Promise.resolve()
  });
});

describe('sendHttp2Request', () => {
  it('acquires a session, resolves the response, and releases once', async () => {
    const p = sendHttp2Request({ method: 'GET', url: 'https://x.test/' });
    await flush();
    fakeStream.emit('response', { ':status': 200 });
    fakeStream.emit('data', Buffer.from('hi'));
    fakeStream.emit('end');
    const res = await p;
    expect(mockAcquire).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://x.test/' }));
    expect(res.status).toBe(200);
    expect(res.data.toString()).toBe('hi');
    expect(res.httpVersion).toBe('2.0');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('does not issue the stream until the session is ready', async () => {
    let resolveReady: () => void = () => {};
    const serverSettingsReceived = new Promise<void>((r) => {
      resolveReady = r;
    });
    mockAcquire.mockReturnValue({ session: { request: requestSpy }, releaseStream: mockRelease, serverSettingsReceived });
    sendHttp2Request({ method: 'GET', url: 'https://x.test/' });
    await flush();
    expect(requestSpy).not.toHaveBeenCalled();
    resolveReady();
    await flush();
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it('does not write a body for a bodyless request (endStream true)', async () => {
    sendHttp2Request({ method: 'GET', url: 'https://x.test/' });
    await flush();
    expect(requestSpy.mock.calls[0][1]).toEqual({ endStream: true });
    expect(fakeStream.end).not.toHaveBeenCalled();
  });

  it('writes the body and sets endStream false for a request with a body', async () => {
    sendHttp2Request({ method: 'POST', url: 'https://x.test/', body: 'payload' });
    await flush();
    expect(requestSpy.mock.calls[0][1]).toEqual({ endStream: false });
    expect(fakeStream.end).toHaveBeenCalledWith('payload');
  });

  it('pipes a stream body instead of ending with it (endStream false)', async () => {
    const bodyStream = Object.assign(new EventEmitter(), { pipe: jest.fn(), destroy: jest.fn() });
    sendHttp2Request({ method: 'POST', url: 'https://x.test/', body: bodyStream as never });
    await flush();
    expect(requestSpy.mock.calls[0][1]).toEqual({ endStream: false });
    expect(bodyStream.pipe).toHaveBeenCalledWith(fakeStream);
    expect(fakeStream.end).not.toHaveBeenCalled();
  });

  it('rejects and releases on a stream error', async () => {
    const p = sendHttp2Request({ method: 'GET', url: 'https://x.test/' });
    await flush();
    fakeStream.emit('error', new Error('boom'));
    await expect(p).rejects.toThrow('boom');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('rejects on early close (before a response) and releases', async () => {
    const p = sendHttp2Request({ method: 'GET', url: 'https://x.test/' });
    await flush();
    fakeStream.rstCode = 8;
    fakeStream.emit('close');
    await expect(p).rejects.toThrow(/closed before the response completed \(CANCEL \(8\)\)/);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('rejects when acquireSession throws', async () => {
    mockAcquire.mockImplementation(() => {
      throw new Error('connect failed');
    });
    await expect(sendHttp2Request({ method: 'GET', url: 'https://x.test/' })).rejects.toThrow('connect failed');
    expect(mockRelease).not.toHaveBeenCalled();
  });
});
