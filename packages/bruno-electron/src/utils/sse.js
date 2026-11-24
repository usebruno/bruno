// Incremental SSE event extraction: recognizes CR, LF and CRLF line endings
// (including CRLF split across chunks) and scans each buffered character once.
const createSseEventExtractor = () => {
  let buffer = '';
  let scanIndex = 0;
  let prevLineEndAt = -1;
  let swallowLeadingLf = false;

  const dropSwallowedLf = () => {
    if (swallowLeadingLf) {
      swallowLeadingLf = false;
      if (buffer.startsWith('\n')) {
        buffer = buffer.slice(1);
        scanIndex = Math.max(0, scanIndex - 1);
      }
    }
  };

  return {
    append(text) {
      buffer += text;
    },

    flush() {
      const remaining = buffer;
      buffer = '';
      scanIndex = 0;
      prevLineEndAt = -1;
      swallowLeadingLf = false;
      return remaining;
    },

    extractEvents() {
      dropSwallowedLf();
      const events = [];
      while (true) {
        let eventEnd = -1;
        let boundaryEnd = -1;
        while (scanIndex < buffer.length) {
          const ch = buffer[scanIndex];
          let termLen = 0;
          if (ch === '\n') {
            termLen = 1;
          } else if (ch === '\r') {
            if (scanIndex + 1 === buffer.length) {
              if (prevLineEndAt === -1) {
                break; // possible CRLF split across chunks; wait for more data
              }
              // A line ending already preceded this CR, so the blank-line boundary
              // exists whether the CR is a lone CR or half of a split CRLF.
              termLen = 1;
              swallowLeadingLf = true;
            } else {
              termLen = buffer[scanIndex + 1] === '\n' ? 2 : 1;
            }
          }
          if (!termLen) {
            prevLineEndAt = -1;
            scanIndex += 1;
            continue;
          }
          if (prevLineEndAt !== -1) {
            eventEnd = prevLineEndAt;
            boundaryEnd = scanIndex + termLen;
            break;
          }
          prevLineEndAt = scanIndex;
          scanIndex += termLen;
        }
        if (boundaryEnd === -1) return events;
        events.push(buffer.slice(0, eventEnd));
        buffer = buffer.slice(boundaryEnd);
        scanIndex = 0;
        prevLineEndAt = -1;
      }
    }
  };
};

module.exports = { createSseEventExtractor };
