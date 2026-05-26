const {
  getStreamType,
  createNdjsonSplitter
} = require('../../src/ipc/network/streaming');

// Test helper: mimic the axios `headers` object that exposes `.get(name)`.
const makeHeaders = (contentType) => ({
  get: (name) => (name.toLowerCase() === 'content-type' ? contentType : undefined)
});

describe('streaming: getStreamType', () => {
  it('detects text/event-stream as sse', () => {
    expect(getStreamType(makeHeaders('text/event-stream'))).toBe('sse');
  });

  it('detects text/event-stream with charset suffix as sse', () => {
    expect(getStreamType(makeHeaders('text/event-stream; charset=utf-8'))).toBe('sse');
  });

  it.each([
    'application/x-ndjson',
    'application/jsonl'
  ])('detects %s (with or without charset suffix) as ndjson', (mime) => {
    expect(getStreamType(makeHeaders(mime))).toBe('ndjson');
    expect(getStreamType(makeHeaders(`${mime}; charset=utf-8`))).toBe('ndjson');
  });

  it('returns null for non-streaming content types', () => {
    expect(getStreamType(makeHeaders('application/json'))).toBeNull();
    expect(getStreamType(makeHeaders('text/plain'))).toBeNull();
    expect(getStreamType(makeHeaders(''))).toBeNull();
  });

  it('returns null for a missing content-type header', () => {
    expect(getStreamType({ get: () => undefined })).toBeNull();
  });
});

describe('streaming: createNdjsonSplitter', () => {
  it('emits one record per complete line', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":1}\n{"a":2}\n{"a":3}\n', 'utf-8'));

    expect(records).toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
  });

  it('buffers across chunk boundaries', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":', 'utf-8'));
    expect(records).toEqual([]);
    splitter.push(Buffer.from('1}\n{"b":', 'utf-8'));
    expect(records).toEqual(['{"a":1}']);
    splitter.push(Buffer.from('2}\n', 'utf-8'));
    expect(records).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('strips trailing CR (handles CRLF line endings)', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":1}\r\n{"a":2}\r\n', 'utf-8'));

    expect(records).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('skips blank lines between records', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":1}\n\n{"a":2}\n\n\n{"a":3}\n', 'utf-8'));

    expect(records).toEqual(['{"a":1}', '{"a":2}', '{"a":3}']);
  });

  it('skips whitespace-only lines between records', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":1}\n   \n\t \n{"a":2}\n', 'utf-8'));

    expect(records).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('emits trailing partial record on flush()', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":1}\n{"a":2}', 'utf-8'));
    expect(records).toEqual(['{"a":1}']);
    splitter.flush();
    expect(records).toEqual(['{"a":1}', '{"a":2}']);
  });

  it('flush() drops a whitespace-only tail', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    // Trailing whitespace-only line after the last terminator: nothing to flush.
    splitter.push(Buffer.from('{"a":1}\n   ', 'utf-8'));
    splitter.flush();

    expect(records).toEqual(['{"a":1}']);
  });

  it('ignores empty chunks', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.alloc(0));
    splitter.push(null);
    splitter.push(undefined);
    splitter.push(Buffer.from('{"a":1}\n', 'utf-8'));

    expect(records).toEqual(['{"a":1}']);
  });

  it('handles CRLF split across chunk boundary', () => {
    const records = [];
    const splitter = createNdjsonSplitter((b) => records.push(b.toString('utf-8')));

    splitter.push(Buffer.from('{"a":1}\r', 'utf-8'));
    splitter.push(Buffer.from('\n{"a":2}\r\n', 'utf-8'));

    expect(records).toEqual(['{"a":1}', '{"a":2}']);
  });
});
