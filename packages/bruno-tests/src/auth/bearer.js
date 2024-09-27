const express = require('express');
const router = express.Router();

const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token || token !== `Bearer your_secret_token`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  next();
};

router.get('/protected', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Authentication successful' });
});

module.exports = router;
