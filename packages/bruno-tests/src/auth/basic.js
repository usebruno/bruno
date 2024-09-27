const express = require('express');
const router = express.Router();
const basicAuth = require('express-basic-auth');

const users = {
  bruno: 'della'
};

const basicAuthMiddleware = basicAuth({
  users,
  challenge: true, // Sends a 401 Unauthorized response when authentication fails
  unauthorizedResponse: 'Unauthorized'
});

router.post('/protected', basicAuthMiddleware, (req, res) => {
  res.status(200).json({ message: 'Authentication successful' });
});

module.exports = router;
