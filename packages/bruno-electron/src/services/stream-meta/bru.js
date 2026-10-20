const fs = require('node:fs');
const readline = require('readline');

const COLUMN_ZERO_CLOSE = /^\}/;
const META_OPEN = /^meta[ \t]*\{/i;
const METHOD_OPEN = /^(get|post|put|patch|delete|head|options|trace|connect|http|grpc|ws)[ \t]*\{/i;
const SKIP_OPEN = /^(body(?::\w+)?|script(?::[\w-]+)?|docs|tests|vars(?::\w+)?|headers|metadata|auth(?::\w+)?|assert|settings|query|params(?::\w+)?|examples|varsandassert)/i;

const isColumnZeroClose = (line) => COLUMN_ZERO_CLOSE.test(line);

const isSkippableOpen = (line) => {
  const trimmed = line.trimStart();
  if (trimmed !== line) return false;
  return SKIP_OPEN.test(trimmed);
};

const isRecordOpen = (line) => {
  const trimmed = line.trimStart();
  if (trimmed !== line) return false;
  return META_OPEN.test(trimmed) || METHOD_OPEN.test(trimmed);
};

const parseMetaBlock = (block) => {
  const data = {};
  const inner = block.match(/meta\s*\{([\s\S]*)\}/i);
  if (!inner) return data;
  for (const line of inner[1].replace(/\r\n/g, '\n').split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    data[key] = Number.isNaN(Number(value)) ? value : Number(value);
  }
  if (data.type === 'http') data.type = 'http-request';
  else if (data.type === 'graphql') data.type = 'graphql-request';
  else if (data.type === 'grpc') data.type = 'grpc-request';
  else if (data.type === 'ws') data.type = 'ws-request';
  return data;
};

const parseMethodBlock = (block) => {
  const request = { method: null, url: null };
  const firstLine = block.split('\n')[0].trim();
  const verbMatch = METHOD_OPEN.exec(firstLine);
  if (!verbMatch) return request;

  const opener = verbMatch[1].toLowerCase();
  if (opener !== 'http' && opener !== 'grpc' && opener !== 'ws') {
    request.method = opener.toUpperCase();
  }

  for (const line of block.replace(/\r\n/g, '\n').split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key || !value) continue;
    if (key === 'url') request.url = value;
    if (key === 'method') request.method = String(value).toUpperCase();
  }

  return request;
};

const requestMetaComplete = (acc) =>
  Boolean(acc.name || acc.type) && Boolean(acc.request?.url) && Boolean(acc.request?.method);

const folderMetaComplete = (acc) => Boolean(acc.meta?.name);

const collectionMetaComplete = (acc) => Boolean(acc.name || acc.meta?.name);

const applyMetaToShape = (acc, type) => {
  if (type === 'folder') {
    return { meta: { name: acc.meta?.name ?? acc.name, seq: acc.seq } };
  }
  if (type === 'collection') {
    const name = acc.name || acc.meta?.name;
    if (acc.brunoConfig) return acc;
    return name ? { name, brunoConfig: { name } } : { meta: acc.meta };
  }
  return {
    name: acc.name,
    type: acc.type || 'http-request',
    seq: acc.seq,
    request: acc.request || {}
  };
};

const readBruMetaFromStream = (stream, type) =>
  new Promise((resolve, reject) => {
    const acc = { meta: {}, request: { method: null, url: null } };
    let blockLines = null;
    let skipping = false;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        stream.destroy();
      } catch (_) {}
      resolve(applyMetaToShape(acc, type));
    };

    const onBlock = (block) => {
      if (META_OPEN.test(block)) {
        const meta = parseMetaBlock(block);
        if (type === 'folder') {
          acc.meta = { name: meta.name, seq: meta.seq };
        } else {
          acc.name = meta.name ?? acc.name;
          acc.type = meta.type ?? acc.type;
          acc.seq = meta.seq ?? acc.seq;
          acc.meta = { ...acc.meta, ...meta };
        }
      } else if (METHOD_OPEN.test(block)) {
        const req = parseMethodBlock(block);
        acc.request = { ...acc.request, ...req };
        if (!acc.type) {
          if (/^grpc/i.test(block)) acc.type = 'grpc-request';
          else if (/^ws/i.test(block)) acc.type = 'ws-request';
          else acc.type = 'http-request';
        }
      }
    };

    const isComplete = () => {
      if (type === 'request') return requestMetaComplete(acc);
      if (type === 'folder') return folderMetaComplete(acc);
      if (type === 'collection') return collectionMetaComplete(acc);
      return false;
    };

    const processLine = (line) => {
      if (!blockLines && !skipping) {
        if (isSkippableOpen(line)) {
          skipping = true;
          return;
        }
        if (isRecordOpen(line)) {
          blockLines = [line];
          return;
        }
      }

      if (skipping) {
        if (isColumnZeroClose(line)) skipping = false;
        return;
      }

      if (blockLines) {
        blockLines.push(line);
        if (isColumnZeroClose(line)) {
          const block = blockLines.join('\n');
          blockLines = null;
          onBlock(block);
          if (isComplete()) finish();
        }
      }
    };

    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (settled) return;
      processLine(line);
    });
    rl.on('close', () => finish());
    rl.on('error', reject);
  });

const readBruMetaFromFile = (absolutePath, type) => {
  const stream = fs.createReadStream(absolutePath);
  return readBruMetaFromStream(stream, type);
};

module.exports = {
  readBruMetaFromFile,
  readBruMetaFromStream,
  parseMetaBlock,
  parseMethodBlock,
  isColumnZeroClose,
  isRecordOpen
};
