const express = require('express');
const router = express.Router();

const FILLER = 'bruno large payload ';
const DEFAULT_SIZE = 1024 * 1024;
const MAX_SIZE = 64 * 1024 * 1024;

// Responds with `?size` bytes of plain text (default 1 MB, clamped to 0-64 MB).
// Useful for exercising large-response handling in the app and the sandboxes.
router.get('/', (req, res) => {
  const requested = parseInt(req.query.size, 10);
  const size = Math.min(Math.max(Number.isNaN(requested) ? DEFAULT_SIZE : requested, 0), MAX_SIZE);

  res.setHeader('content-type', 'text/plain');
  res.send(FILLER.repeat(Math.ceil(size / FILLER.length)).slice(0, size));
});

module.exports = router;
