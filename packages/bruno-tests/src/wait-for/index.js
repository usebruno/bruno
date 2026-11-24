const express = require('express');
const router = express.Router();

const DEFAULT_WAIT_MS = 1000;
const MAX_WAIT_MS = 60000;
const BODY_CHUNK_COUNT = 10;
const BODY_CHUNK_BYTES = 1024;
const BODY_CHUNK_PAYLOAD = 'x'.repeat(BODY_CHUNK_BYTES);

// `?time` in milliseconds. Only a missing or non-numeric value falls back to the default, so 0 means no wait.
const parseWaitTime = (req) => {
  const requestedTime = parseInt(req.query.time, 10);
  const waitTime = Number.isNaN(requestedTime) ? DEFAULT_WAIT_MS : requestedTime;
  return Math.min(Math.max(waitTime, 0), MAX_WAIT_MS);
};

// Delays the response by `?time` milliseconds.
// Useful for testing timeouts, loading states, and cancelling in-flight requests.
router.get('/', async (req, res) => {
  const waitTime = parseWaitTime(req);

  await new Promise((resolve) => setTimeout(resolve, waitTime));

  res.send(`Waited for ${waitTime} ms`);
});

// /headers and /body tell apart where a client stops its response-time clock. One that times the
// full body reports ~time on both; one that stops at the headers reports ~0ms for /body.

// Holds back the headers for `?time` ms, then sends the whole response at once.
router.get('/headers', (req, res) => {
  const timer = setTimeout(() => res.json({ done: true }), parseWaitTime(req));

  res.on('close', () => clearTimeout(timer));
});

// Sends the headers immediately, then streams the body over `?time` ms.
router.get('/body', (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.flushHeaders();
  res.write('{"data":"');

  let chunksSent = 0;
  const timer = setInterval(() => {
    res.write(BODY_CHUNK_PAYLOAD);
    chunksSent += 1;
    if (chunksSent < BODY_CHUNK_COUNT) return;

    clearInterval(timer);
    res.end('"}');
  }, parseWaitTime(req) / BODY_CHUNK_COUNT);

  res.on('close', () => clearInterval(timer));
});

module.exports = router;
