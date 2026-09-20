/**
 * Extracts just the fields a sidebar/search tree node needs from a .bru file, without running the
 * ohm grammar. The full grammar sustains ~1 MB/s, which makes mounting a large collection slow;
 * this reads the same files at ~4.5 GB/s.
 *
 * It is a deliberate subset, not a parser: the result is only ever used for tree nodes, and opening
 * a request replaces it with `bruToJsonV2` output. Field shapes therefore mirror `bruToJsonV2` so
 * the two are interchangeable for these fields.
 *
 * Correctness rests on the grammar's own block delimiter, `tagend = nl "}"` — a block ends at a
 * newline followed by `}`, not by brace counting. So this jumps from a block's header line to the
 * next `\n}` and never reads inside a block, which is why braces in bodies and scripts cannot
 * confuse it. Block contents are written indented, so a `}` belonging to the content never sits at
 * column 0; where one did, the grammar would end the block there too.
 */

// `get`/`post`/... name the method in the block header; `http`/`grpc`/`ws` carry it as a `method:`
// pair instead (grammar: `httpcustom = "http" dictionary`, `grpc = "grpc" dictionary`, `ws = ...`).
const METHOD_HEADER_BLOCKS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'connect', 'trace']);
const METHOD_PAIR_BLOCKS = new Set(['http', 'grpc', 'ws']);

const TYPE_MAP = {
  http: 'http-request',
  graphql: 'graphql-request',
  grpc: 'grpc-request',
  ws: 'ws-request'
};

const MULTILINE_DELIMITER = '\'\'\'';

// Keys may be quoted, and prefixed with `~` when disabled (grammar: `quoted_key`, `disable_char`).
const normalizeKey = (rawKey) => rawKey.trim().replace(/^~/, '').replace(/^"(.*)"$/, '$1');

// Finds where a block that starts on `headerLineEnd`'s line ends. Mirrors `tagend = nl "}"`.
const findBlockEnd = (content, headerLineEnd) => {
  const end = content.indexOf('\n}', headerLineEnd);
  return end === -1 ? content.length : end;
};

/**
 * Reads `key: value` pairs from one block body, keeping only the wanted keys. Handles the two value
 * forms that can span lines: `'''…'''` text blocks and `[ … ]` lists.
 */
const readPairs = (body, wantedKeys) => {
  const pairs = {};
  let cursor = 0;

  while (cursor < body.length) {
    let lineEnd = body.indexOf('\n', cursor);
    if (lineEnd === -1) lineEnd = body.length;

    const line = body.slice(cursor, lineEnd);
    const colon = line.indexOf(':');

    if (colon !== -1) {
      const key = normalizeKey(line.slice(0, colon));
      if (wantedKeys.has(key)) {
        const rest = line.slice(colon + 1);
        const trimmed = rest.trim();

        if (trimmed.startsWith(MULTILINE_DELIMITER)) {
          const valueStart = cursor + colon + 1 + rest.indexOf(MULTILINE_DELIMITER) + MULTILINE_DELIMITER.length;
          const close = body.indexOf(MULTILINE_DELIMITER, valueStart);
          if (close === -1) {
            pairs[key] = trimmed;
          } else {
            pairs[key] = body.slice(valueStart, close);
            lineEnd = body.indexOf('\n', close);
            if (lineEnd === -1) lineEnd = body.length;
          }
        } else if (trimmed === '[' || trimmed.startsWith('[')) {
          // grammar: `list = st* "[" nl+ listitems? st* nl+ st* "]"` — items sit on their own lines
          const close = body.indexOf(']', cursor + colon);
          if (close === -1) {
            pairs[key] = trimmed;
          } else {
            pairs[key] = body.slice(cursor + colon + 1, close).replace(/^\s*\[/, '');
            lineEnd = body.indexOf('\n', close);
            if (lineEnd === -1) lineEnd = body.length;
          }
        } else {
          pairs[key] = trimmed;
        }
      }
    }

    cursor = lineEnd + 1;
  }

  return pairs;
};

const META_KEYS = new Set(['name', 'type', 'seq', 'tags']);
const URL_KEYS = new Set(['url']);
const URL_AND_METHOD_KEYS = new Set(['url', 'method']);

/**
 * An example's body is opaque to the grammar (`examplecontent = (~tagend any)*`) and holds nested
 * `request: {` / `response: {` blocks whose contents can contain a literal `"name":` — inside a
 * JSON body, for instance. The example's own scalar pairs always precede those nested blocks, so
 * reading stops at the first one rather than scanning the whole body.
 */
const readExampleName = (body) => {
  let cursor = 0;

  while (cursor < body.length) {
    let lineEnd = body.indexOf('\n', cursor);
    if (lineEnd === -1) lineEnd = body.length;

    const line = body.slice(cursor, lineEnd).trim();
    if (line.endsWith('{')) return undefined;

    const colon = line.indexOf(':');
    if (colon !== -1 && normalizeKey(line.slice(0, colon)) === 'name') {
      return line.slice(colon + 1).trim();
    }

    cursor = lineEnd + 1;
  }

  return undefined;
};

const toList = (value) =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const bruToTreeFields = (content) => {
  if (typeof content !== 'string') return {};

  const treeFields = { request: {} };
  const examples = [];
  let cursor = 0;

  while (cursor < content.length) {
    let lineEnd = content.indexOf('\n', cursor);
    if (lineEnd === -1) lineEnd = content.length;

    const brace = content.slice(cursor, lineEnd).indexOf('{');
    if (brace === -1) {
      cursor = lineEnd + 1;
      continue;
    }

    const header = content.slice(cursor, cursor + brace).trim();
    const blockEnd = findBlockEnd(content, lineEnd);
    const body = content.slice(lineEnd + 1, blockEnd);

    if (header === 'meta') {
      const pairs = readPairs(body, META_KEYS);
      if (pairs.name !== undefined) treeFields.name = pairs.name;
      if (pairs.type !== undefined) treeFields.type = TYPE_MAP[pairs.type] || 'http-request';
      if (pairs.seq !== undefined) {
        const seq = Number(pairs.seq);
        treeFields.seq = Number.isNaN(seq) ? pairs.seq : seq;
      }
      if (pairs.tags !== undefined) treeFields.tags = toList(pairs.tags);
    } else if (METHOD_HEADER_BLOCKS.has(header)) {
      treeFields.request.method = header.toUpperCase();
      const pairs = readPairs(body, URL_KEYS);
      if (pairs.url !== undefined) treeFields.request.url = pairs.url;
    } else if (METHOD_PAIR_BLOCKS.has(header)) {
      const pairs = readPairs(body, URL_AND_METHOD_KEYS);
      // A grpc method is a case-sensitive path (`/pkg.Service/GetUser`), and `parseBruRequest`
      // passes it through untouched; only http methods are upper-cased.
      if (pairs.method !== undefined) {
        treeFields.request.method = header === 'grpc' ? pairs.method : pairs.method.toUpperCase();
      }
      if (pairs.url !== undefined) treeFields.request.url = pairs.url;
    } else if (header === 'example') {
      // The sidebar lists example names; their request/response bodies stay on disk.
      examples.push({ name: readExampleName(body) });
    }

    cursor = blockEnd + 2;
  }

  if (examples.length > 0) treeFields.examples = examples;
  return treeFields;
};

module.exports = bruToTreeFields;
