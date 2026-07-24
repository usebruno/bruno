const { StringDecoder } = require('string_decoder');

// A single SSE event (terminated by a blank line) can arrive split across multiple network
// chunks, so incoming bytes must be buffered and only handed off once a full event is available,
// rather than parsing each raw chunk in isolation.
const createSseEventBuffer = () => {
  let buffer = '';
  const decoder = new StringDecoder('utf8');

  const push = (chunk) => {
    buffer += decoder.write(chunk).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

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
    const remaining = (buffer + decoder.end()).trim();
    buffer = '';
    return remaining || null;
  };

  return { push, flush };
};

module.exports = { createSseEventBuffer };
