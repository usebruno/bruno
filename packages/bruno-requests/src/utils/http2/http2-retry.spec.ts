import { Readable } from 'node:stream';
import { isRetryableHttp2Error, isReplayableBody, addHttp2RetryInterceptor } from './http2-retry';

describe('isRetryableHttp2Error', () => {
  it('is true only for REFUSED_STREAM (rstCode 7), read from the error or the stream', () => {
    expect(isRetryableHttp2Error({ rstCode: 7 })).toBe(true);
    expect(isRetryableHttp2Error({ request: { rstCode: 7 } })).toBe(true);
    expect(isRetryableHttp2Error({ response: { request: { rstCode: 7 } } })).toBe(true);
  });

  it('is false for non-retryable RST codes and for HTTP/1.1 errors (no rstCode)', () => {
    expect(isRetryableHttp2Error({ rstCode: 2 })).toBe(false); // INTERNAL_ERROR
    expect(isRetryableHttp2Error({ rstCode: 8 })).toBe(false); // CANCEL
    expect(isRetryableHttp2Error({ rstCode: 11 })).toBe(false); // ENHANCE_YOUR_CALM
    expect(isRetryableHttp2Error({ code: 'ECONNREFUSED' })).toBe(false);
    expect(isRetryableHttp2Error({ code: 'ETIMEDOUT' })).toBe(false);
    expect(isRetryableHttp2Error(null)).toBe(false);
    expect(isRetryableHttp2Error(undefined)).toBe(false);
  });
});

describe('isReplayableBody', () => {
  it('treats buffered bodies as replayable', () => {
    expect(isReplayableBody(undefined)).toBe(true);
    expect(isReplayableBody(null)).toBe(true);
    expect(isReplayableBody('{"a":1}')).toBe(true);
    expect(isReplayableBody(Buffer.from('x'))).toBe(true);
    expect(isReplayableBody(new Uint8Array([1, 2]))).toBe(true);
    expect(isReplayableBody({ a: 1 })).toBe(true);
  });

  it('treats a one-shot stream as not replayable', () => {
    expect(isReplayableBody(Readable.from(['chunk']))).toBe(false);
    expect(isReplayableBody({ pipe: () => {} })).toBe(false);
  });
});

describe('addHttp2RetryInterceptor', () => {
  // Minimal axios-like instance: callable, with a response error-interceptor registry.
  const makeInstance = (handler: (cfg: any) => Promise<any>) => {
    let rejected: ((e: any) => any) | undefined;
    const instance: any = (config: any) =>
      handler(config).catch((e: any) => (rejected ? rejected(e) : Promise.reject(e)));
    instance.interceptors = {
      response: { use: (_f: any, r: any) => { rejected = r; } }
    };
    return instance;
  };

  it('retries a REFUSED_STREAM once, then succeeds', async () => {
    let calls = 0;
    const instance = makeInstance(async (cfg) => {
      calls++;
      if (calls === 1) return Promise.reject(Object.assign(new Error('refused'), { rstCode: 7, config: cfg }));
      return { ok: true, config: cfg };
    });
    addHttp2RetryInterceptor(instance);

    const res = await instance({ url: 'https://x', data: 'body' });
    expect(res).toEqual({ ok: true, config: expect.objectContaining({ __http2RetryCount: 1 }) });
    expect(calls).toBe(2);
  });

  it('does not retry a non-retryable reset (propagates the original error)', async () => {
    let calls = 0;
    const instance = makeInstance(async (cfg) => {
      calls++;
      return Promise.reject(Object.assign(new Error('internal'), { rstCode: 2, config: cfg }));
    });
    addHttp2RetryInterceptor(instance);

    await expect(instance({ url: 'https://x' })).rejects.toThrow('internal');
    expect(calls).toBe(1);
  });

  it('does not retry when the body is a one-shot stream', async () => {
    let calls = 0;
    const instance = makeInstance(async (cfg) => {
      calls++;
      return Promise.reject(Object.assign(new Error('refused'), { rstCode: 7, config: cfg }));
    });
    addHttp2RetryInterceptor(instance);

    await expect(instance({ url: 'https://x', data: { pipe: () => {} } })).rejects.toThrow('refused');
    expect(calls).toBe(1);
  });

  it('retries at most once even if the retry is also refused', async () => {
    let calls = 0;
    const instance = makeInstance(async (cfg) => {
      calls++;
      return Promise.reject(Object.assign(new Error('refused'), { rstCode: 7, config: cfg }));
    });
    addHttp2RetryInterceptor(instance);

    await expect(instance({ url: 'https://x', data: 'body' })).rejects.toThrow('refused');
    expect(calls).toBe(2); // original + one retry, then stop
  });

  it('is inert for an HTTP/1.1 error (no rstCode): single call, original error', async () => {
    let calls = 0;
    const instance = makeInstance(async (cfg) => {
      calls++;
      return Promise.reject(Object.assign(new Error('socket hang up'), { code: 'ECONNRESET', config: cfg }));
    });
    addHttp2RetryInterceptor(instance);

    await expect(instance({ url: 'http://x', data: 'body' })).rejects.toThrow('socket hang up');
    expect(calls).toBe(1);
  });
});
