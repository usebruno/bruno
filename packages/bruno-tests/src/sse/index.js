const express = require('express');
const router = express.Router();

// Track active SSE connections
let activeConnections = new Set();
let connectionIdCounter = 0;

// GET /api/sse/stream - SSE endpoint that streams data
router.get('/stream', (req, res) => {
  const connectionId = ++connectionIdCounter;
  activeConnections.add(connectionId);

  console.log(`[SSE] Connection ${connectionId} opened. Active: ${activeConnections.size}`);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ message: 'Connected', connectionId, activeConnections: activeConnections.size })}\n\n`);

  // Send data every 500ms
  const interval = setInterval(() => {
    const data = {
      connectionId,
      timestamp: new Date().toISOString(),
      activeConnections: activeConnections.size,
      seq: Date.now()
    };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }, 500);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(interval);
    activeConnections.delete(connectionId);
    console.log(`[SSE] Connection ${connectionId} closed. Active: ${activeConnections.size}`);
  });
});

// GET /api/sse/connections - Returns count of active connections
router.get('/connections', (req, res) => {
  res.json({
    activeConnections: activeConnections.size,
    connectionIds: Array.from(activeConnections)
  });
});

// POST /api/sse/reset - Reset connection tracking (for test cleanup)
router.post('/reset', (req, res) => {
  activeConnections.clear();
  connectionIdCounter = 0;
  res.json({ message: 'Reset complete', activeConnections: 0 });
});

module.exports = router;
