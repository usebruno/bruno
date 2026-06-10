// Streaming-response support: content-type detection + a line splitter for
// NDJSON (newline-delimited JSON) responses.
//
// This module is intentionally dependency-free so it can be unit-tested
// without loading the rest of the IPC layer.

// Map of streaming-response content-types to their kind. NDJSON variants are
// limited to those actually emitted by real-world servers we know about
// (x-ndjson by Ollama and a number of LLM streaming endpoints; jsonl is the
// more common spelling in Python tooling).
const STREAM_TYPES_BY_MIME = new Map([
  ['text/event-stream', 'sse'],
  ['application/x-ndjson', 'ndjson'],
  ['application/jsonl', 'ndjson']
]);

/**
 * Inspect the response headers and return which streaming protocol (if any)
 * applies. Returns one of: `'sse'`, `'ndjson'`, or `null`.
 *
 * @param {{ get: (name: string) => string | null | undefined }} headers
 * @returns {'sse' | 'ndjson' | null}
 */
const getStreamType = (headers) => {
  // The first `;` always terminates the `type/subtype` token (per RFC 9110
  // §8.3.1, `type` and `subtype` are `token`s which cannot contain `;`), so
  // splitting on the first `;` always isolates the media type.
  const mime = (headers.get('content-type') ?? '').split(';', 1)[0].trim();
  return STREAM_TYPES_BY_MIME.get(mime) ?? null;
};

/**
 * Creates a stateful line splitter for NDJSON streams.
 *
 * Accepts arbitrary Buffer chunks (which may split a single record across
 * chunks) and invokes `onRecord(record)` once per complete line. The trailing
 * `\n` (or `\r\n`) is stripped. Empty and whitespace-only lines are silently
 * dropped, so blank-line separators are legal.
 *
 * Note: `record` is a `Buffer.subarray` view into the snapshot of `pending`
 * that produced it. The bytes stay valid as long as the caller retains the
 * view — `push()` allocates a fresh buffer via `Buffer.concat` rather than
 * mutating in place — but the view keeps that entire snapshot alive. Callers
 * that need to retain only the record bytes should copy with
 * `Buffer.from(record)` to allow the rest to be GC'd.
 *
 * Any trailing partial record is held in an internal buffer until the next
 * chunk arrives. `flush()` should be called when the underlying stream ends to
 * emit a final partial record, if any.
 *
 * @param {(record: Buffer) => void} onRecord
 * @returns {{ push: (chunk: Buffer | Uint8Array | null | undefined) => void, flush: () => void }}
 */
const createNdjsonSplitter = (onRecord) => {
  let pending = Buffer.alloc(0);

  // Drop empty / whitespace-only records: blank line separators are legal
  // between NDJSON entries and should not surface as records to the consumer.
  const emit = (record) => {
    if (record.toString('utf-8').trim().length === 0) return;
    onRecord(record);
  };

  return {
    push(chunk) {
      if (!chunk || chunk.length === 0) return;
      pending = pending.length === 0 ? Buffer.from(chunk) : Buffer.concat([pending, Buffer.from(chunk)]);

      // Split on \n. Records may also end with \r\n; trim a trailing \r.
      let newlineIdx;
      while ((newlineIdx = pending.indexOf(0x0a)) !== -1) {
        let line = pending.subarray(0, newlineIdx);
        if (line.length > 0 && line[line.length - 1] === 0x0d) {
          line = line.subarray(0, line.length - 1);
        }
        emit(line);
        pending = pending.subarray(newlineIdx + 1);
      }
    },

    flush() {
      if (pending.length === 0) return;
      let tail = pending;
      pending = Buffer.alloc(0);
      // Strip a possible trailing \r so an unterminated CRLF line still emits
      // the same bytes as a properly-terminated one. (Empty / whitespace-only
      // tails are dropped by `emit`.)
      if (tail[tail.length - 1] === 0x0d) {
        tail = tail.subarray(0, tail.length - 1);
      }
      emit(tail);
    }
  };
};

module.exports = {
  getStreamType,
  createNdjsonSplitter
};
