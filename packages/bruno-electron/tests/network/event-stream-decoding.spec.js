const { createEventStreamEmitter } = require('../../src/ipc/network/event-stream');

describe('event-stream decoding', () => {
  it('does not lose utf-8 bytes across chunk boundaries', async () => {
    // Force a multibyte boundary split: 😀 is 4 bytes in UTF-8.
    const payload = `data: {\"text\":\"你好😀世界\"}\n\n`;
    const buf = Buffer.from(payload, 'utf8');

    const parts = [buf.subarray(0, buf.length - 1), buf.subarray(buf.length - 1)];
    const received = [];
    const emitter = createEventStreamEmitter({ onMessage: (m) => received.push(m) });

    parts.forEach((p) => emitter.write(p));
    emitter.end();

    expect(received).toEqual(['{"text":"你好😀世界"}']);
  });

  it('reassembles a large SSE event split into many chunks', async () => {
    const largeJson = JSON.stringify({ a: 'x'.repeat(200_000), b: 'y'.repeat(50_000) });
    const payload = `data: ${largeJson}\n\n`;
    const buf = Buffer.from(payload, 'utf8');

    const received = [];
    const emitter = createEventStreamEmitter({ onMessage: (m) => received.push(m) });

    // split into small chunks to simulate arbitrary TCP chunking
    for (let i = 0; i < buf.length; i += 1024) {
      emitter.write(buf.subarray(i, i + 1024));
    }
    emitter.end();

    expect(received.length).toBe(1);
    expect(received[0]).toBe(largeJson);
  });

  it('falls back to raw streaming when no SSE separators appear', async () => {
    const received = [];
    const emitter = createEventStreamEmitter({ onMessage: (m) => received.push(m), maxBufferedChars: 10 });
    emitter.write(Buffer.from('abcdefghij', 'utf8'));
    emitter.write(Buffer.from('klmno', 'utf8'));
    emitter.end();

    expect(received.join('')).toBe('abcdefghijklmno');
  });
});
