const { protocol, net } = require('electron');
const { pathToFileURL } = require('node:url');
const { BodyNotFoundError } = require('../core/errors');
const { STORAGE_FILE } = require('../core/constants');
const { SCHEME, parseBodyRefFromUrl } = require('./protocol-url');

/**
 * Register bruno-response://body/<bodyRef> privileged scheme handler.
 * Must call registerBrunoResponseScheme() before app ready; handle after ready.
 */
const registerBrunoResponseScheme = () => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        bypassCSP: true
      }
    }
  ]);
};

const registerBrunoResponseProtocol = (store) => {
  protocol.handle(SCHEME, async (request) => {
    const bodyRef = parseBodyRefFromUrl(request.url);
    if (!bodyRef) {
      return new Response('Not Found', { status: 404 });
    }

    let stat;
    try {
      stat = store.getStat(bodyRef);
    } catch (err) {
      if (err instanceof BodyNotFoundError) {
        return new Response('Not Found', { status: 404 });
      }
      return new Response('Error', { status: 500 });
    }

    const contentType = stat.contentType || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(stat.size)
    };

    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
      if (match) {
        let start = match[1] ? parseInt(match[1], 10) : 0;
        let end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        if (Number.isNaN(start)) start = 0;
        if (Number.isNaN(end) || end >= stat.size) end = stat.size - 1;
        if (start > end || start >= stat.size) {
          return new Response('Range Not Satisfiable', {
            status: 416,
            headers: { 'Content-Range': `bytes */${stat.size}` }
          });
        }
        const length = end - start + 1;
        const buf = await store.readRange(bodyRef, start, length);
        return new Response(buf, {
          status: 206,
          headers: {
            ...headers,
            'Content-Length': String(length),
            'Content-Range': `bytes ${start}-${end}/${stat.size}`
          }
        });
      }
    }

    // Full body: stream from store
    if (stat.storage === STORAGE_FILE) {
      const entryPath = store.getFilePath(bodyRef);
      if (entryPath) {
        try {
          const fileResponse = await net.fetch(pathToFileURL(entryPath).href);
          return new Response(fileResponse.body, { status: 200, headers });
        } catch (_) {
          /* fall through to buffer */
        }
      }
    }

    const buf = await store.readRange(bodyRef, 0, stat.size);
    return new Response(buf, { status: 200, headers });
  });
};

module.exports = {
  SCHEME,
  registerBrunoResponseScheme,
  registerBrunoResponseProtocol,
  parseBodyRefFromUrl
};
