const http = require('http');
const { createSseEventBuffer } = require('./sse-event-buffer');
const { makeAxiosInstance } = require('./axios-instance');

describe('createSseEventBuffer', () => {
  test('emits nothing until a full event (blank-line terminated) is received', () => {
    const sseEventBuffer = createSseEventBuffer();

    expect(sseEventBuffer.push(Buffer.from('event: response.created\n'))).toEqual([]);
    expect(sseEventBuffer.push(Buffer.from('data: {"foo":"bar"}\n'))).toEqual([]);
    expect(sseEventBuffer.push(Buffer.from('\n'))).toEqual(['event: response.created\ndata: {"foo":"bar"}']);
  });

  test('reassembles a data payload split mid-string across network chunk boundaries', () => {
    // Mirrors the reported bug: a long `data:` JSON line arriving split across two
    // TCP/HTTP2 reads, with the split landing in the middle of a string value.
    const fullEvent = 'event: response.created\ndata: {"type":"response.created","response":{"id":"resp_02c1","max_tool_calls":null,"model":"gpt-5"}}\n\n';
    const splitIndex = fullEvent.indexOf('max_tool_') + 'max_tool_'.length;
    const firstChunk = fullEvent.slice(0, splitIndex);
    const secondChunk = fullEvent.slice(splitIndex);

    const sseEventBuffer = createSseEventBuffer();

    expect(sseEventBuffer.push(Buffer.from(firstChunk))).toEqual([]);
    const events = sseEventBuffer.push(Buffer.from(secondChunk));

    expect(events).toHaveLength(1);
    expect(events[0]).toBe(fullEvent.trim());
    expect(() => JSON.parse(events[0].split('data: ')[1])).not.toThrow();
  });

  test('emits multiple events that arrive in a single chunk', () => {
    const sseEventBuffer = createSseEventBuffer();

    const events = sseEventBuffer.push(Buffer.from('event: a\ndata: 1\n\nevent: b\ndata: 2\n\n'));

    expect(events).toEqual(['event: a\ndata: 1', 'event: b\ndata: 2']);
  });

  test('normalizes CRLF line endings within a single chunk before detecting event boundaries', () => {
    const sseEventBuffer = createSseEventBuffer();

    const events = sseEventBuffer.push(Buffer.from('event: a\r\ndata: 1\r\n\r\n'));

    expect(events).toEqual(['event: a\ndata: 1']);
  });

  test('normalizes lone CR line endings within a single chunk before detecting event boundaries', () => {
    const sseEventBuffer = createSseEventBuffer();

    const events = sseEventBuffer.push(Buffer.from('event: a\rdata: 1\r\r'));

    expect(events).toEqual(['event: a\ndata: 1']);
  });

  test('does not misread a CRLF terminator split across chunks as an extra blank line', () => {
    // If \r and \n were normalized independently per chunk before concatenating, a chunk
    // boundary landing between them would turn one line break into two, splitting a single
    // event into two (or worse, emitting a bogus event early).
    const sseEventBuffer = createSseEventBuffer();

    expect(sseEventBuffer.push(Buffer.from('event: a\r'))).toEqual([]);
    const events = sseEventBuffer.push(Buffer.from('\ndata: 1\r\n\r\n'));

    expect(events).toEqual(['event: a\ndata: 1']);
  });

  test('treats a lone CR followed by an unrelated CR as two separate line breaks', () => {
    const sseEventBuffer = createSseEventBuffer();

    expect(sseEventBuffer.push(Buffer.from('event: a\r'))).toEqual([]);
    const events = sseEventBuffer.push(Buffer.from('\rdata: 1\r\r'));

    expect(events).toEqual(['event: a', 'data: 1']);
  });

  test('does not split a multi-byte UTF-8 character across chunks', () => {
    const payload = 'event: msg\ndata: "€"\n\n';
    const payloadBytes = Buffer.from(payload, 'utf8');
    // Split inside the 3-byte UTF-8 encoding of '€'.
    const euroIndex = payloadBytes.indexOf(Buffer.from('€', 'utf8'));
    const firstChunk = payloadBytes.subarray(0, euroIndex + 1);
    const secondChunk = payloadBytes.subarray(euroIndex + 1);

    const sseEventBuffer = createSseEventBuffer();

    expect(sseEventBuffer.push(firstChunk)).toEqual([]);
    const events = sseEventBuffer.push(secondChunk);

    expect(events).toEqual(['event: msg\ndata: "€"']);
  });

  test('flush returns a trailing event that never received a closing blank line', () => {
    const sseEventBuffer = createSseEventBuffer();

    sseEventBuffer.push(Buffer.from('event: done\ndata: {"ok":true}'));

    expect(sseEventBuffer.flush()).toBe('event: done\ndata: {"ok":true}');
  });

  test('flush returns null when nothing is left buffered', () => {
    const sseEventBuffer = createSseEventBuffer();

    sseEventBuffer.push(Buffer.from('event: a\ndata: 1\n\n'));

    expect(sseEventBuffer.flush()).toBeNull();
  });
});

// Spins up a plain HTTP server on loopback for exercising real timeout behavior end to end.
const createServer = (handler) =>
  new Promise((resolve) => {
    const server = http.createServer(handler);
    const sockets = new Set();
    server.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        url: `http://127.0.0.1:${port}/`,
        close: () =>
          new Promise((closeResolve) => {
            sockets.forEach((socket) => socket.destroy());
            server.close(closeResolve);
          })
      });
    });
  });

describe('SSE requests respect the configured timeout for the initial response', () => {
  test('resolves once the SSE stream starts responding before the timeout elapses', async () => {
    const { url, close } = await createServer((_, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write('event: ping\ndata: {}\n\n');
    });

    try {
      const instance = makeAxiosInstance();
      const response = await instance.get(url, { responseType: 'stream', timeout: 500 });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('text/event-stream');
      response.data.on('error', () => {});
      response.data.destroy();
    } finally {
      await close();
    }
  }, 8000);

  test('aborts the SSE request if the server never responds within the configured timeout', async () => {
    const { url, close } = await createServer(() => {
      // Accept the connection but never write headers or end the response.
    });

    try {
      const instance = makeAxiosInstance();
      const start = Date.now();

      await expect(instance.get(url, { responseType: 'stream', timeout: 300 })).rejects.toMatchObject({
        code: expect.stringMatching(/ECONNABORTED|ETIMEDOUT/)
      });

      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(250);
      expect(elapsed).toBeLessThan(2000);
    } finally {
      await close();
    }
  }, 8000);
});
