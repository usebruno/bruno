import { createSseParser, createSseMerger, DEFAULT_SSE_OPTIONS, validateSseRules } from './sse';

const event = (data, name) => `${name ? `event: ${name}\n` : ''}data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;
const merge = (chunks, options) => {
  const merger = createSseMerger(options);
  chunks.forEach((chunk) => merger.push(chunk));
  return merger.result();
};
const values = (result) => Object.fromEntries(result.fields.map((field) => [field.name, field.text]));
const custom = (rules) => ({ ...DEFAULT_SSE_OPTIONS, mode: 'custom', rules });

describe('SSE event parsing', () => {
  it('handles BOM, comments, CRLF split across chunks, multiline data and empty data', () => {
    const received = [];
    const parser = createSseParser((value) => received.push(value));
    ['\uFEFF:heartbeat\r', '\nevent: token\r\ndata: first\r', '\ndata:  second\r\n\r', '\ndata:\n\n'].forEach((chunk) => parser.push(chunk));
    expect(received).toEqual([
      { event: 'token', data: 'first\n second' },
      { event: 'message', data: '' }
    ]);
  });

  it('waits for an event delimiter before publishing data', () => {
    const received = [];
    const parser = createSseParser((value) => received.push(value));
    parser.push('data: unfinished\n');
    expect(received).toEqual([]);
    parser.push('\n');
    expect(received).toEqual([{ event: 'message', data: 'unfinished' }]);
  });
});

describe('SSE merging', () => {
  it('merges OpenAI and DeepSeek content and reasoning for every possible chunk boundary', () => {
    const stream = event({ choices: [{ delta: { reasoning_content: '思考' } }] })
      + event({ choices: [{ delta: { content: '你好' } }] })
      + event({ choices: [{ delta: { content: '，世界🌏' } }] }) + event('[DONE]');
    for (let split = 0; split <= stream.length; split++) {
      const result = merge([stream.slice(0, split), stream.slice(split)]);
      expect(values(result)).toEqual({ reasoning: '思考', content: '你好，世界🌏' });
      expect(result.eventCount).toBe(4);
      expect(result.matchedEventCount).toBe(3);
    }
  });

  it('handles JSON objects split over data lines and many events in one chunk', () => {
    const result = merge(['data: {"choices":\ndata: [{"delta":{"content":"a"}}]}\n\n' + event({ choices: [{ delta: { content: 'b' } }] })]);
    expect(values(result)).toEqual({ content: 'ab' });
  });

  it('keeps alternative completions separate', () => {
    const result = merge([event({ choices: [{ index: 0, delta: { content: 'a' } }, { index: 1, delta: { content: 'b' } }] })]);
    expect(values(result)).toEqual({ 'content': 'a', 'content[1]': 'b' });
  });

  it.each([
    { choices: [null, false, 42, 'metadata'] },
    { candidates: [null, false, 42, 'metadata'] },
    { candidates: [{ content: { parts: 'metadata' } }] },
    { candidates: [{ content: { parts: { text: 'metadata' } } }] },
    { candidates: [{ content: { parts: [null, false, 42, 'metadata'] } }] }
  ])('ignores malformed provider payloads and keeps processing later events: %j', (payload) => {
    const result = merge([event(payload), event({ choices: [{ delta: { content: 'valid' } }] })]);
    expect(values(result)).toEqual({ content: 'valid' });
  });

  it('uses array order when provider indices are not valid nonnegative integers', () => {
    const result = merge([
      event({ choices: [{ index: { toString: null }, delta: { content: 'a' } }] }),
      event({ candidates: [{ index: { toString: null }, content: { parts: [{ text: 'b' }] } }] })
    ]);
    expect(values(result)).toEqual({ content: 'ab' });
  });

  it('merges Responses API deltas without appending completed snapshots', () => {
    expect(values(merge([
      event({ type: 'response.output_text.delta', delta: 'answer' }),
      event({ type: 'response.reasoning_summary_text.delta', delta: 'reason' }),
      event({ type: 'response.completed', response: { output: 'answer' } })
    ]))).toEqual({ content: 'answer', reasoning: 'reason' });
  });

  it('merges Claude text and thinking and ignores ping events', () => {
    expect(values(merge([
      event({ type: 'ping' }),
      event({ delta: { type: 'thinking_delta', thinking: 'think' } }, 'content_block_delta'),
      event({ type: 'content_block_start', content_block: { text: 'Hello' } }),
      event({ type: 'content_block_delta', delta: { text: ' Claude' } })
    ]))).toEqual({ reasoning: 'think', content: 'Hello Claude' });
  });

  it('merges Gemini thought parts and separates candidates', () => {
    expect(values(merge([event({ candidates: [
      { index: 0, content: { parts: [{ thought: true, text: 'thinking' }, { text: 'answer' }] } },
      { index: 1, content: { parts: [{ text: 'alternative' }] } }
    ] })]))).toEqual({ 'reasoning': 'thinking', 'content': 'answer', 'content[1]': 'alternative' });
  });

  it('merges Ollama message and generation payloads over SSE', () => {
    expect(values(merge([event({ message: { content: 'a', thinking: 'r' } }), event({ response: 'b' })]))).toEqual({ content: 'ab', reasoning: 'r' });
  });

  it('preserves whitespace in text events and ignores the done sentinel', () => {
    expect(values(merge(['data:  hello\ndata: world\n\n' + event('[DONE]')], { mode: 'text' }))).toEqual({ content: ' hello\nworld' });
  });

  it('does not expose JSON metadata or malformed JSON as answer text', () => {
    expect(values(merge([event({ usage: { total_tokens: 8 } }), event('{broken'), event('hello')]))).toEqual({ content: 'hello' });
  });

  it('extracts wildcards, false, zero and objects and supports latest values', () => {
    const result = merge([
      event({ parts: [{ text: 'a' }, { text: 'b' }], id: 0, ready: false, meta: { a: 1 } }),
      event({ parts: [{ text: 'c' }], id: 4 })
    ], custom([
      { name: 'text', path: '$.parts[*].text', merge: 'append' },
      { name: 'id', path: '$.id', merge: 'latest' },
      { name: 'ready', path: '$.ready', merge: 'append' },
      { name: 'meta', path: '$.meta', merge: 'latest' }
    ]));
    expect(values(result)).toEqual({ text: 'abc', id: '4', ready: 'false', meta: '{"a":1}' });
    expect(result.fields.find((field) => field.name === 'id').count).toBe(2);
  });

  it('skips null and missing matches without adding separators', () => {
    expect(values(merge([event({ a: null }), event({}), event({ a: 'yes' })], custom([{ name: 'a', path: '$.a' }])))).toEqual({ a: 'yes' });
  });

  it('replaces the latest value with an empty string when a field is cleared', () => {
    const result = merge([event({ status: 'working' }), event({ status: '' })], custom([{ name: 'status', path: '$.status', merge: 'latest' }]));
    expect(values(result)).toEqual({ status: '' });
    expect(result.fields[0].count).toBe(2);
  });

  it('reports invalid paths and duplicate names', () => {
    const errors = validateSseRules([
      { name: 'a', path: '$.a' }, { name: 'a', path: '$.a' },
      { name: 'b', path: '$[' }, { name: 'c', path: 'a.b' },
      { name: '', path: '$.a' }, { name: 'd', path: '$.' }
    ]);
    expect(errors[0]).toBeNull();
    expect(errors.slice(1).every(Boolean)).toBe(true);
  });

  it('prevents script expressions in custom JSONPath', () => {
    const result = merge([event({ a: [{ x: 1 }] })], custom([{ name: 'a', path: '$.a[?(@.x)]' }]));
    expect(result.fields).toEqual([]);
    expect(result.errors[0]).toBeTruthy();
  });
});
