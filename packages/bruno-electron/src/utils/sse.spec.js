const { createSseEventExtractor } = require('./sse');

describe('createSseEventExtractor', () => {
  it('extracts events delimited by LF blank lines', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\n\ndata: B\n\n');
    expect(ex.extractEvents()).toEqual(['data: A', 'data: B']);
    expect(ex.flush()).toBe('');
  });

  it('extracts events delimited by CRLF blank lines', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\r\n\r\ndata: B\r\n\r\n');
    expect(ex.extractEvents()).toEqual(['data: A', 'data: B']);
  });

  it('extracts events delimited by CR-only line endings', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\r\rdata: B\r\r');
    expect(ex.extractEvents()).toEqual(['data: A', 'data: B']);
  });

  it('buffers incomplete events across chunks', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\nda');
    expect(ex.extractEvents()).toEqual([]);
    ex.append('ta: B\n\n');
    expect(ex.extractEvents()).toEqual(['data: A\ndata: B']);
  });

  it('handles CRLF split across chunks', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\r');
    expect(ex.extractEvents()).toEqual([]);
    ex.append('\n\r');
    expect(ex.extractEvents()).toEqual(['data: A']);
    ex.append('\ndata: B\r\n\r\n');
    expect(ex.extractEvents()).toEqual(['data: B']);
  });

  it('waits when a chunk ends with a lone CR before deciding the line ending', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\r\rdata: B\r');
    expect(ex.extractEvents()).toEqual(['data: A']);
    ex.append('\r');
    expect(ex.extractEvents()).toEqual(['data: B']);
  });

  it('handles a line ending at buffer position zero', () => {
    const ex = createSseEventExtractor();
    ex.append('\n\ndata: A\n\n');
    expect(ex.extractEvents()).toEqual(['', 'data: A']);
  });

  it('returns the remaining partial event on flush', () => {
    const ex = createSseEventExtractor();
    ex.append('data: A\n\ndata: tail');
    expect(ex.extractEvents()).toEqual(['data: A']);
    expect(ex.flush()).toBe('data: tail');
    expect(ex.extractEvents()).toEqual([]);
  });
});
