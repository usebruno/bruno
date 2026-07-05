const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// Capture raw bytes regardless of content-type so we can verify the upload byte-exact.
// Mounted with its own raw parser (not the global JSON/text parsers) so a
// JSON content-type with a file body still arrives as a Buffer instead of being
// pre-parsed and silently size-truncated.
router.use(express.raw({ type: '*/*', limit: '200mb' }));

// The bug we're guarding against produces a tiny JSON envelope describing a
// Node fs.ReadStream (fields like fd, flags, _readableState). Detect that
// shape so any regression flips this flag to true.
const detectSerializedNodeStream = (firstBytesUtf8) => {
  try {
    const trimmed = firstBytesUtf8.trim();
    if (!trimmed.startsWith('{')) return false;
    const parsed = JSON.parse(trimmed);
    return Boolean(
      parsed && typeof parsed === 'object' && '_readableState' in parsed && 'flags' in parsed
    );
  } catch (e) {
    return false;
  }
};

const buildResponse = (req) => {
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const firstBytesUtf8 = buf.slice(0, 256).toString('utf8');
  return {
    method: req.method,
    contentType: req.headers['content-type'] || null,
    contentLengthHeader: req.headers['content-length'] || null,
    transferEncoding: req.headers['transfer-encoding'] || null,
    bytesReceived: buf.length,
    sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    firstBytesUtf8,
    firstBytesHex: buf.slice(0, 128).toString('hex'),
    looksLikeSerializedNodeStream: detectSerializedNodeStream(firstBytesUtf8)
  };
};

// JSON content-type endpoint — this is the original bug repro path.
// Pre-fix, large files sent here arrived as a ~342-byte serialization of the
// Node fs.ReadStream object instead of the file bytes.
router.post('/binary-upload-json', (req, res) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().includes('json')) {
    return res.status(415).json({
      error: 'Expected a content-type containing "json"',
      contentType
    });
  }
  return res.json(buildResponse(req));
});

// Octet-stream content-type endpoint — the non-JSON branch of the
// interpolation guard. Should always have worked, kept as a control test.
router.post('/binary-upload-octet-stream', (req, res) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (contentType !== 'application/octet-stream') {
    return res.status(415).json({
      error: 'Expected content-type: application/octet-stream',
      contentType
    });
  }
  return res.json(buildResponse(req));
});

module.exports = router;
