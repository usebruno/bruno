const express = require('express');
const router = express.Router();

const FILLER = 'bruno large payload ';
const DEFAULT_SIZE = 1024 * 1024;
const MAX_SIZE = 128 * 1024 * 1024;

const clampSize = (requested) => {
  const n = parseInt(requested, 10);
  return Math.min(Math.max(Number.isNaN(n) ? DEFAULT_SIZE : n, 0), MAX_SIZE);
};

const textPayload = (size) => FILLER.repeat(Math.ceil(size / FILLER.length)).slice(0, size);

// Responds with `?size` bytes of plain text (default 1 MB, clamped to 0-128 MB).
router.get('/', (req, res) => {
  const size = clampSize(req.query.size);
  res.setHeader('content-type', 'text/plain; charset=utf-8');
  res.send(textPayload(size));
});

// JSON body of approximately `?size` bytes.
router.get('/json', (req, res) => {
  const size = clampSize(req.query.size);
  const prefix = '{"ok":true,"payload":"';
  const suffix = '"}';
  const inner = Math.max(0, size - prefix.length - suffix.length);
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.send(prefix + 'x'.repeat(inner) + suffix);
});

// Deterministic binary (application/octet-stream) for protocol / download tests.
router.get('/bytes', (req, res) => {
  const size = clampSize(req.query.size);
  const buf = Buffer.alloc(size, 0xab);
  res.setHeader('content-type', 'application/octet-stream');
  res.setHeader('content-length', String(size));
  res.end(buf);
});

// Minimal valid-ish PDF header + padding for media protocol preview.
router.get('/pdf', (req, res) => {
  const size = clampSize(req.query.size || 1024);
  const header = Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const body = Buffer.alloc(Math.max(0, size - header.length), 0x20);
  const buf = Buffer.concat([header, body]);
  res.setHeader('content-type', 'application/pdf');
  res.setHeader('content-length', String(buf.length));
  res.end(buf);
});

// Tiny PNG (1x1) — optional size pads trailing bytes (invalid PNG but fine for protocol smoke).
router.get('/png', (req, res) => {
  // 1x1 red PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const size = clampSize(req.query.size || png.length);
  const buf = size <= png.length ? png : Buffer.concat([png, Buffer.alloc(size - png.length, 0)]);
  res.setHeader('content-type', 'image/png');
  res.setHeader('content-length', String(buf.length));
  res.end(buf);
});

module.exports = router;
