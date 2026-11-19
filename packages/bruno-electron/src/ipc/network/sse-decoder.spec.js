const { createSseDecoder } = require('./sse-decoder');

describe('SSE UTF-8 decoding', () => {
  it('preserves Chinese and emoji at every byte boundary and retains raw bytes', () => {
    const input = Buffer.from('data: {"text":"你好🌏"}\n\n');
    for (let split = 0; split <= input.length; split++) {
      const decoder = createSseDecoder();
      const first = decoder.decode(input.subarray(0, split));
      const second = decoder.decode(input.subarray(split));
      expect(first.data + second.data + decoder.end()).toBe(input.toString('utf8'));
      expect(Buffer.concat([first.dataBuffer, second.dataBuffer])).toEqual(input);
    }
  });

  it('flushes an incomplete UTF-8 sequence when the stream closes', () => {
    const decoder = createSseDecoder();
    expect(decoder.decode(Buffer.from([0xe4, 0xbd])).data).toBe('');
    expect(decoder.end()).toBe('\uFFFD');
  });
});
