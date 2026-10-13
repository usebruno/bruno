type YmlRequestMeta = {
  name: string;
  type: string;
  seq: number;
  request: {
    method: string;
    url: string;
  };
};

const REQUEST_TYPE_BY_INFO_TYPE: Record<string, string> = { http: 'http-request' };
const BLANK_OR_COMMENT = /^\s*(#.*)?$/;
const NOT_A_PLAIN_SCALAR_START = new Set(['[', '{', '|', '>', '&', '*', '!', '%', '@', '`', '#', '-', '?', ':', ',', ']', '}']);
const AMBIGUOUS_PLAIN_SCALAR = /^(true|false|yes|no|on|off|null|~|[-+]?(\d[\d_]*\.?\d*|\.\d+)([eE][-+]?\d+)?|0x[0-9a-fA-F]+|0o[0-7]+)$/i;
const INTEGER = /^[0-9]{1,9}$/;

const readScalar = (rawValue: string): string | undefined => {
  const value = rawValue.trim();
  if (!value) return undefined;

  const first = value[0];
  if (first === '"' || first === '\'') {
    const isWholeValue = value.length > 1 && value.indexOf(first, 1) === value.length - 1;
    if (!isWholeValue || (first === '"' && value.includes('\\'))) return undefined;
    return value.slice(1, -1);
  }

  if (NOT_A_PLAIN_SCALAR_START.has(first)) return undefined;
  if (value.includes(' #') || value.includes(': ') || value.endsWith(':') || AMBIGUOUS_PLAIN_SCALAR.test(value)) return undefined;
  return value;
};

const parseItemMeta = (ymlString: string): YmlRequestMeta | null => {
  if (ymlString.charCodeAt(0) === 0xfeff || ymlString.includes('\t') || ymlString.includes('\r')) return null;

  const found: Record<string, string | undefined> = {};
  let section = '';
  let infoClosed = false;
  let afterCapturedKey = false;
  let position = 0;

  const isComplete = () => infoClosed
    && found.name !== undefined
    && found.type !== undefined
    && found.method !== undefined
    && found.url !== undefined;

  while (position < ymlString.length) {
    let lineEnd = ymlString.indexOf('\n', position);
    if (lineEnd === -1) lineEnd = ymlString.length;
    const line = ymlString.slice(position, lineEnd);
    position = lineEnd + 1;

    if (BLANK_OR_COMMENT.test(line)) continue;
    if (line.startsWith('---') || line.startsWith('...')) return null;

    if (!line.startsWith(' ')) {
      if (section === 'info') infoClosed = true;
      if (isComplete()) break;
      if (!line.endsWith(':')) return null;
      section = line.slice(0, -1);
      afterCapturedKey = false;
      continue;
    }

    if (!line.startsWith('  ')) return null;
    if (line.charCodeAt(2) === 32) {
      if (afterCapturedKey) return null;
      continue;
    }

    if (isComplete()) break;
    afterCapturedKey = false;
    if (section !== 'info' && section !== 'http') continue;

    const colon = line.indexOf(':', 2);
    if (colon === -1) continue;
    const key = line.slice(2, colon);
    const rawValue = line.slice(colon + 1);

    if (section === 'info' && key === 'seq') {
      const seq = rawValue.trim();
      if (!INTEGER.test(seq)) return null;
      found.seq = seq;
      afterCapturedKey = true;
    } else if ((section === 'info' && (key === 'name' || key === 'type')) || (section === 'http' && (key === 'method' || key === 'url'))) {
      const value = readScalar(rawValue);
      if (value === undefined) return null;
      found[key] = value;
      afterCapturedKey = true;
    }
  }

  if (found.name === undefined || found.type === undefined || found.method === undefined || found.url === undefined) return null;
  const type = REQUEST_TYPE_BY_INFO_TYPE[found.type];
  if (!type) return null;

  return {
    name: found.name,
    type,
    seq: found.seq === undefined ? 1 : Number(found.seq) || 1,
    request: { method: found.method, url: found.url }
  };
};

export default parseItemMeta;
