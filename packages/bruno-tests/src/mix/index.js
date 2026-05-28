const express = require('express');
const router = express.Router();

router.get('/', function (req, res) {
  // Parse query parameters similar to http bun's /mix endpoint
  // s=status code, c=cookie (name:value), r=redirect URL
  const statusCode = parseInt(req.query.s, 10) || 302;
  const cookie = req.query.c; // format: name:value
  const redirectUrl = req.query.r;

  // Set cookie if provided
  if (cookie) {
    const [cookieName, cookieValue] = cookie.split(':');
    if (cookieName && cookieValue) {
      res.setHeader('Set-Cookie', `${cookieName}=${cookieValue}; Path=/`);
    }
  }

  // Redirect to the specified URL, even if it's not on our domain
  if (redirectUrl) {
    res.status(statusCode)
      .set('Location', redirectUrl)
      .send(`<!doctype html>
      <title>Redirecting...</title>
      <h1>Redirecting...</h1>
      <p>You should be redirected automatically to target URL: <a href="${redirectUrl}">${redirectUrl}</a>. If not click the link.</p>
    `);
  } else {
    res.status(400).json({ error: 'Missing redirect URL parameter (r)' });
  }
});

module.exports = router;
