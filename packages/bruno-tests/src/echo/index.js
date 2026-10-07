const express = require('express');
const router = express.Router();

router.get('/path/*', (req, res) => {
  return res.json({ url: req.url });
});

// Echo back request headers - useful for testing header manipulation
router.all('/headers', (req, res) => {
  return res.json({
    method: req.method,
    headers: req.headers,
    url: req.url
  });
});

// httpbin.org/anything-style echo — returns the full request shape so e2e
// tests can verify exactly what reached the server. Used by the # encoding
// scenarios in tests/request/generate-code/send-vs-snippet.spec.ts so the
// suite doesn't depend on the public httpbin.org service (which 503s under
// load). Mimics httpbin's URL-decode-for-display so assertions can still
// match against the human-readable `#authentication` form even when the
// wire URL had `%23authentication`.
router.all('/anything/*', (req, res) => {
  let bodyData = '';
  let formData = {};
  let jsonData = null;

  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      bodyData = req.body.toString();
    } else if (typeof req.body === 'string') {
      bodyData = req.body;
    } else if (typeof req.body === 'object') {
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        jsonData = req.body;
      } else if (ct.includes('x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
        formData = req.body;
      } else {
        try { bodyData = JSON.stringify(req.body); } catch { bodyData = ''; }
      }
    }
  }

  // URL-decode `req.originalUrl` for the `url` field so callers can assert
  // against the decoded form (e.g. `#authentication`) — same shape httpbin
  // returns. Falls back to the raw URL if decoding fails (malformed %XX).
  let displayUrl = req.originalUrl;
  try {
    displayUrl = decodeURIComponent(req.originalUrl);
  } catch {
    // keep raw
  }

  return res.json({
    args: req.query || {},
    data: bodyData,
    files: {},
    form: formData,
    headers: req.headers,
    json: jsonData,
    method: req.method,
    origin: req.ip || '127.0.0.1',
    url: `${req.protocol}://${req.get('host')}${displayUrl}`
  });
});

router.post('/json', (req, res) => {
  return res.json(req.body);
});

router.post('/text', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  return res.send(req.body);
});

router.post('/xml-parsed', (req, res) => {
  return res.send(req.body);
});

router.post('/xml-raw', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  return res.send(req.rawBody);
});

router.post('/bin', (req, res) => {
  const rawBody = req.body;

  if (!rawBody || rawBody.length === 0) {
    return res.status(400).send('No data received');
  }

  res.set('Content-Type', req.headers['content-type'] || 'application/octet-stream');
  res.send(rawBody);
});

router.get('/bom-json-test', (req, res) => {
  const jsonData = {
    message: 'Hello!',
    success: true
  };
  const jsonString = JSON.stringify(jsonData);
  const bom = '\uFEFF';
  const jsonWithBom = bom + jsonString;
  res.set('Content-Type', 'application/json; charset=utf-8');
  return res.send(jsonWithBom);
});

router.get('/iso-enc', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=ISO-8859-1');
  const responseText = 'éçà';
  return res.send(Buffer.from(responseText, 'latin1'));
});

router.post('/custom', (req, res) => {
  const { headers, content, contentBase64, contentJSON, type } = req.body || {};

  res._headers = {};

  if (type) {
    res.setHeader('Content-Type', type);
  }

  if (headers && typeof headers === 'object') {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  if (contentBase64) {
    res.write(Buffer.from(contentBase64, 'base64'));
  } else if (contentJSON !== undefined) {
    res.write(JSON.stringify(contentJSON));
  } else if (content !== undefined) {
    res.write(content);
  }

  return res.end();
});

module.exports = router;
