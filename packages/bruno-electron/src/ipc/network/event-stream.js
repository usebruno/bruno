const { StringDecoder } = require('string_decoder');

const parseSseEventData = (eventText) => {
  // https://html.spec.whatwg.org/multipage/server-sent-events.html#parsing-an-event-stream
  // We only extract `data:` lines, because that's what users care about in Bruno.
  const lines = eventText.split(/\r?\n/);
  const dataLines = [];
  for (const line of lines) {
    // comment/heartbeat
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^\s/, ''));
      continue;
    }
    if (line === 'data') {
      dataLines.push('');
      continue;
    }
  }
  if (dataLines.length) {
    return dataLines.join('\n');
  }
  // Fallback: if server doesn't follow SSE fields, still surface raw chunk.
  return eventText;
};

const createEventStreamEmitter = ({ onMessage, maxBufferedChars = 256 * 1024 }) => {
  const decoder = new StringDecoder('utf8');
  let buffered = '';

  const drain = () => {
    while (true) {
      const idxCrlf = buffered.indexOf('\r\n\r\n');
      const idxLf = buffered.indexOf('\n\n');
      let idx = -1;
      let sepLen = 0;
      if (idxCrlf !== -1 && (idxLf === -1 || idxCrlf < idxLf)) {
        idx = idxCrlf;
        sepLen = 4;
      } else if (idxLf !== -1) {
        idx = idxLf;
        sepLen = 2;
      }

      if (idx === -1) {
        break;
      }

      const frame = buffered.slice(0, idx);
      buffered = buffered.slice(idx + sepLen);

      const data = parseSseEventData(frame);
      if (data && data.length) {
        onMessage(data);
      }
    }

    // Safety valve: if we never find a frame separator, still stream raw text.
    if (buffered.length >= maxBufferedChars) {
      onMessage(buffered);
      buffered = '';
    }
  };

  return {
    write: (chunk) => {
      buffered += decoder.write(chunk);
      drain();
    },
    end: () => {
      buffered += decoder.end();
      drain();
      if (buffered && buffered.length) {
        onMessage(buffered);
        buffered = '';
      }
    }
  };
};

module.exports = {
  createEventStreamEmitter
};

