const fs = require('node:fs');
const readline = require('readline');
const yaml = require('js-yaml');

const REQUEST_SECTIONS = new Set(['http', 'graphql', 'grpc', 'websocket']);
const TOP_LEVEL_KEY = /^([a-zA-Z][\w-]*)\s*:/;

const mapInfoType = (type) => {
  if (type === 'http') return 'http-request';
  if (type === 'graphql') return 'graphql-request';
  if (type === 'grpc') return 'grpc-request';
  if (type === 'websocket') return 'ws-request';
  return type;
};

const parseInfoSlice = (lines) => {
  if (!lines.length) return null;
  try {
    const doc = yaml.load(lines.join('\n'));
    const info = doc?.info;
    if (!info || typeof info !== 'object') return null;
    return {
      name: info.name,
      type: mapInfoType(info.type),
      seq: info.seq
    };
  } catch (_) {
    return null;
  }
};

const parseFolderSlice = (lines) => {
  if (!lines.length) return null;
  try {
    const doc = yaml.load(lines.join('\n'));
    const info = doc?.info;
    if (!info) return null;
    return { meta: { name: info.name, seq: info.seq } };
  } catch (_) {
    return null;
  }
};

const parseCollectionSlice = (lines) => {
  if (!lines.length) return null;
  try {
    const doc = yaml.load(lines.join('\n'));
    const name = doc?.info?.name;
    if (!name) return null;
    return { name, brunoConfig: { name } };
  } catch (_) {
    return null;
  }
};

const indentOf = (line) => {
  const m = /^(\s*)/.exec(line);
  return m ? m[1].length : 0;
};

const readYmlMetaFromStream = (stream, type) =>
  new Promise((resolve, reject) => {
    const acc = { name: null, type: null, seq: null, request: { method: null, url: null } };
    let infoLines = null;
    let section = null;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        stream.destroy();
      } catch (_) {}
      if (type === 'folder') {
        resolve(acc.meta ? { meta: acc.meta } : { meta: { name: acc.name } });
        return;
      }
      if (type === 'collection') {
        resolve(acc.brunoConfig ? { name: acc.name, brunoConfig: acc.brunoConfig } : { name: acc.name });
        return;
      }
      resolve({
        name: acc.name,
        type: acc.type || 'http-request',
        seq: acc.seq,
        request: acc.request
      });
    };

    const requestComplete = () =>
      Boolean(acc.name || acc.type)
      && Boolean(acc.request.method)
      && Boolean(acc.request.url);

    const applyInfo = (parsed) => {
      if (!parsed) return;
      if (parsed.meta) {
        acc.meta = parsed.meta;
        acc.name = parsed.meta.name;
        return;
      }
      if (parsed.brunoConfig) {
        acc.name = parsed.name;
        acc.brunoConfig = parsed.brunoConfig;
        return;
      }
      acc.name = parsed.name ?? acc.name;
      acc.type = parsed.type ?? acc.type;
      acc.seq = parsed.seq ?? acc.seq;
    };

    const processLine = (line) => {
      const col0 = indentOf(line) === 0;
      const top = col0 ? TOP_LEVEL_KEY.exec(line) : null;

      if (top && infoLines) {
        if (type === 'folder') applyInfo(parseFolderSlice(infoLines));
        else if (type === 'collection') applyInfo(parseCollectionSlice(infoLines));
        else applyInfo(parseInfoSlice(infoLines));
        infoLines = null;
      }

      if (top) {
        const key = top[1];
        if (key === 'info') {
          infoLines = [line];
          section = null;
          return;
        }
        if (REQUEST_SECTIONS.has(key)) {
          section = key;
          return;
        }
        section = null;
        return;
      }

      if (infoLines) {
        infoLines.push(line);
        return;
      }

      if (section && indentOf(line) === 2) {
        const kv = /^(\w+)\s*:\s*(.*)$/.exec(line.trim());
        if (!kv) return;
        const [, key, raw] = kv;
        const value = raw.trim();
        if (key === 'method') acc.request.method = value.toUpperCase();
        if (key === 'url') acc.request.url = value;
        if (type === 'request' && requestComplete()) finish();
      }
    };

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (settled) return;
      processLine(line);
    });
    rl.on('close', () => {
      if (infoLines) {
        if (type === 'folder') applyInfo(parseFolderSlice(infoLines));
        else if (type === 'collection') applyInfo(parseCollectionSlice(infoLines));
        else applyInfo(parseInfoSlice(infoLines));
      }
      finish();
    });
    rl.on('error', reject);
  });

const readYmlMetaFromFile = (absolutePath, type) => {
  const stream = fs.createReadStream(absolutePath);
  return readYmlMetaFromStream(stream, type);
};

module.exports = {
  readYmlMetaFromFile,
  readYmlMetaFromStream,
  parseInfoSlice
};
