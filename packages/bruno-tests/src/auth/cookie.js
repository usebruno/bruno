const express = require('express');
const cookieParser = require('cookie-parser');
const router = express.Router();

// Initialize the cookie-parser middleware
router.use(cookieParser());

// Middleware to check if the user is authenticated
function requireAuth(req, res, next) {
  const isAuthenticated = req.cookies.isAuthenticated === 'true';

  if (isAuthenticated) {
    next(); // User is authenticated, continue to the next middleware or route handler
  } else {
    res.status(401).json({ message: 'Unauthorized' }); // User is not authenticated, send a 401 Unauthorized response
  }
}

// Route to set a cookie when a user logs in
router.post('/login', (req, res) => {
  // You should perform authentication here, and if successful, set the cookie.
  // For demonstration purposes, let's assume the user is authenticated.
  res.cookie('isAuthenticated', 'true');
  res.status(200).json({ message: 'Logged in successfully' });
});

// Route to log out and clear the cookie
router.post('/logout', (req, res) => {
  res.clearCookie('isAuthenticated');
  res.status(200).json({ message: 'Logged out successfully' });
});

// Protected route that requires authentication
router.get('/protected', requireAuth, (req, res) => {
  res.status(200).json({ message: 'Authentication successful' });
});

module.exports = router;
