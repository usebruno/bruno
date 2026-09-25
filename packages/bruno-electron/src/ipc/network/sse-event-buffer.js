const { StringDecoder } = require('string_decoder');

// A single SSE event (terminated by a blank line) can arrive split across multiple network
// chunks, so incoming bytes must be buffered and only handed off once a full event is available,
// rather than parsing each raw chunk in isolation.
const createSseEventBuffer = () => {
  let buffer = '';
  // True when the previous chunk ended in a lone \r whose \n pair (if any) may still be
  // in transit - a \r\n terminator split across chunks must not be read as two line breaks.
  let pendingCr = false;
  const decoder = new StringDecoder('utf8');

  const push = (chunk) => {
    let text = decoder.write(chunk);
    if (!text) return [];

    if (pendingCr) {
      pendingCr = false;
      if (text[0] === '\n') {
        text = text.slice(1);
      }
    }

    if (text.endsWith('\r')) {
      pendingCr = true;
    }

    buffer += text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const events = [];
    let eventEnd;
    while ((eventEnd = buffer.indexOf('\n\n')) !== -1) {
      events.push(buffer.slice(0, eventEnd));
      buffer = buffer.slice(eventEnd + 2);
    }
    return events;
  };

  // Flushes any buffered, non-terminated event left over once the stream closes.
  const flush = () => {
    const remaining = buffer + decoder.end();
    buffer = '';
    return remaining || null;
  };

  return { push, flush };
};

module.exports = { createSseEventBuffer };
