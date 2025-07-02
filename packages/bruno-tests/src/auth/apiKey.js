const express = require('express');
const router = express.Router();

const VALID_API_KEY = 'my-secret-api-key';
const VALID_KEY_NAME = 'api-key';

const apiKeyAuthMiddleware = (req, res, next) => {
  const apiKeyFromHeader = req.headers[VALID_KEY_NAME.toLowerCase()];
  const apiKeyFromQuery = req.query[VALID_KEY_NAME];

  const apiKey = apiKeyFromHeader || apiKeyFromQuery;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key missing' });
  }

  if (apiKey !== VALID_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

router.post('/protected', apiKeyAuthMiddleware, (req, res) => {
  res.status(200).json({ message: 'You have accessed a protected route!' });
});

module.exports = router;
