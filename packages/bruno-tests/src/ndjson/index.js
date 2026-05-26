const express = require('express');
const router = express.Router();

// Track active NDJSON connections
let activeConnections = new Set();
let connectionIdCounter = 0;

// Helper to start an NDJSON streaming response and emit records on an interval
// until the client disconnects.
const startStream = (req, res, contentType) => {
  const connectionId = ++connectionIdCounter;
  activeConnections.add(connectionId);

  console.log(`[NDJSON] Connection ${connectionId} opened. Active: ${activeConnections.size}`);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial connection message
  res.write(`${JSON.stringify({ message: 'Connected', connectionId, activeConnections: activeConnections.size })}\n`);

  // Send data every 500ms
  const interval = setInterval(() => {
    const data = {
      connectionId,
      timestamp: new Date().toISOString(),
      activeConnections: activeConnections.size,
      seq: Date.now()
    };
    res.write(`${JSON.stringify(data)}\n`);
  }, 500);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
    activeConnections.delete(connectionId);
    console.log(`[NDJSON] Connection ${connectionId} closed. Active: ${activeConnections.size}`);
  });
};

// GET /api/ndjson/stream - application/x-ndjson, one JSON object per line.
router.get('/stream', (req, res) => startStream(req, res, 'application/x-ndjson'));

// GET /api/ndjson/jsonl - application/jsonl alias.
router.get('/jsonl', (req, res) => startStream(req, res, 'application/jsonl'));

module.exports = router;
