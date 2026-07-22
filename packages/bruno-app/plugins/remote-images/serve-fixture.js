'use strict';

/**
 * Tiny static file server for remote-image build fixtures.
 * Serves files from ./fixtures on 127.0.0.1:9876 by default (streamed).
 *
 * Usage:
 *   node serve-fixture.js
 *   node serve-fixture.js --port 9876
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const DEFAULT_PORT = 9876;

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

function parsePort(argv) {
  const idx = argv.indexOf('--port');
  if (idx !== -1 && argv[idx + 1]) {
    return Number(argv[idx + 1]);
  }
  return Number(process.env.BRUNO_REMOTE_IMAGE_FIXTURE_PORT || DEFAULT_PORT);
}

function createServer() {
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(FIXTURES_DIR, safe);
    if (!filePath.startsWith(FIXTURES_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.once('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(err.code === 'ENOENT' ? 404 : 500);
      }
      res.end(err.code === 'ENOENT' ? 'Not found' : 'Error');
    });
    stream.once('open', () => {
      res.writeHead(200, {
        'Content-Type': contentType(filePath),
        'Cache-Control': 'no-store'
      });
    });
    pipeline(stream, res).catch(() => {
      // client aborted / stream error already handled
    });
  });
}

function start(port = parsePort(process.argv)) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const addr = `http://127.0.0.1:${port}`;
      console.log(`[remote-images fixture] serving ${FIXTURES_DIR} at ${addr}`);
      resolve({ server, port, baseUrl: addr });
    });
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { start, createServer, FIXTURES_DIR, DEFAULT_PORT };
