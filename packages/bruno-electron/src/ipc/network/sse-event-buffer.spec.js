const { createSseEventBuffer } = require('./sse-event-buffer');

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

    const events = sseEventBuffer.push(Buffer.from(
      'event: a\ndata: 1\n\nevent: b\ndata: 2\n\n'
    ));

    expect(events).toEqual(['event: a\ndata: 1', 'event: b\ndata: 2']);
  });

  test('normalizes CRLF and lone CR line endings before detecting event boundaries', () => {
    const sseEventBuffer = createSseEventBuffer();

    const events = sseEventBuffer.push(Buffer.from('event: a\r\ndata: 1\r\n\r\n'));

    expect(events).toEqual(['event: a\ndata: 1']);
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
