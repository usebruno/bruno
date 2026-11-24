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
      let boundaryEnd = -1;
      do {
        let eventEnd = -1;
        boundaryEnd = -1;
        let waitingForLf = false;

        while (boundaryEnd < 0 && !waitingForLf && scanIndex < buffer.length) {
          const ch = buffer[scanIndex];
          const isLastChar = scanIndex + 1 === buffer.length;
          let termLen = 0;

          if (ch === '\n') {
            termLen = 1;
          } else if (ch === '\r' && !isLastChar) {
            termLen = buffer[scanIndex + 1] === '\n' ? 2 : 1;
          } else if (ch === '\r' && prevLineEndAt >= 0) {
            // A line ending already preceded this trailing CR, so the blank-line
            // boundary exists whether it is a lone CR or half of a split CRLF.
            termLen = 1;
            swallowLeadingLf = true;
          }

          if (termLen === 0) {
            if (ch === '\r') {
              waitingForLf = true; // possible CRLF split across chunks; wait for more data
            } else {
              prevLineEndAt = -1;
              scanIndex += 1;
            }
          } else if (prevLineEndAt >= 0) {
            eventEnd = prevLineEndAt;
            boundaryEnd = scanIndex + termLen;
          } else {
            prevLineEndAt = scanIndex;
            scanIndex += termLen;
          }
        }

        if (boundaryEnd > 0) {
          events.push(buffer.slice(0, eventEnd));
          buffer = buffer.slice(boundaryEnd);
          scanIndex = 0;
          prevLineEndAt = -1;
        }
      } while (boundaryEnd > 0);

      return events;
    }
  };
};

module.exports = { createSseEventExtractor };
