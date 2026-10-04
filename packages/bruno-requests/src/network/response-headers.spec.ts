import { restoreContentEncodingHeader } from './response-headers';

const responseWith = (headers: Record<string, unknown>, rawHeaders?: string[]) => ({
  headers,
  request: { res: rawHeaders ? { rawHeaders } : undefined }
});

describe('restoreContentEncodingHeader', () => {
  it('restores the header axios deleted after decompressing', () => {
    const response = responseWith({ 'content-type': 'application/json' }, ['Content-Type', 'application/json', 'Content-Encoding', 'gzip']);
    restoreContentEncodingHeader(response);
    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('keeps a content-encoding value that is still present', () => {
    const response = responseWith({ 'content-encoding': 'identity' }, ['Content-Encoding', 'gzip']);
    restoreContentEncodingHeader(response);
    expect(response.headers['content-encoding']).toBe('identity');
  });

  it('does not add the header when the server did not send it', () => {
    const response = responseWith({}, ['Content-Type', 'text/plain']);
    restoreContentEncodingHeader(response);
    expect(response.headers).not.toHaveProperty('content-encoding');
  });

  it('does nothing when the raw response is not available', () => {
    const response = responseWith({});
    restoreContentEncodingHeader(response);
    expect(response.headers).not.toHaveProperty('content-encoding');
    expect(() => restoreContentEncodingHeader(undefined)).not.toThrow();
  });
});
