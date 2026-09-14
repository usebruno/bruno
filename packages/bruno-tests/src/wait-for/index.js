const express = require('express');
const router = express.Router();

// Delays the response by `?time` milliseconds (default 1000, clamped to 0–60000).
// Useful for testing timeouts, loading states, and cancelling in-flight requests.
router.get('/', async (req, res) => {
  const waitTime = Math.min(Math.max(parseInt(req.query.time, 10) || 1000, 0), 60000);

  await new Promise((resolve) => setTimeout(resolve, waitTime));

  res.send(`Waited for ${waitTime} ms`);
});

module.exports = router;
