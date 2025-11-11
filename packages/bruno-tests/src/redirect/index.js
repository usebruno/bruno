const express = require('express');
const formDataParser = require('../multipart/form-data-parser');
const router = express.Router();

const parseMultipartFormData = (req) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    try {
      const parts = formDataParser.parse(req);
      const parsedBody = {};
      const files = [];
      
      parts.forEach(part => {
        if (part.filename) {
          files.push({
            fieldname: part.name,
            originalname: part.filename,
            mimetype: part.contentType,
            size: part.value ? part.value.length : 0
          });
        } else {
          parsedBody[part.name] = part.value;
        }
      });
      
      return { body: parsedBody, files };
    } catch (error) {
      console.error('Error parsing multipart form data:', error);
      return { body: {}, files: [] };
    }
  }
  return { body: req.body, files: [] };
};

router.post('/multipart-redirect-source', function (req, res) {
  console.log('Multipart redirect source endpoint hit');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  const { body, files } = parseMultipartFormData(req);
  console.log('Parsed Body:', body);
  console.log('Files:', files);
  
  res.status(308).location('/api/redirect/multipart-redirect-target').send('Permanently moved');
});

router.post('/multipart-redirect-target', function (req, res) {
  console.log('Multipart redirect target endpoint hit');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  
  const { body, files } = parseMultipartFormData(req);
  console.log('Parsed Body:', body);
  console.log('Files:', files);
  
  res.json({
    status: 'success',
    method: req.method,
    body: body,
    files: files,
    headers: req.headers
  });
});

router.get('/anything', function (req, res) {
  const { body, files } = parseMultipartFormData(req);

  // Parse query parameters
  const args = req.query;

  // Parse form data if present
  const form = {};
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
    Object.assign(form, req.body);
  }

  // Get origin IP
  const origin = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

  // Parse JSON body if present
  let json = null;
  let data = '';
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    try {
      json = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      data = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    } catch (e) {
      data = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
  } else if (req.body) {
    data = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  res.json({
    method: req.method,
    args: args,
    headers: req.headers,
    origin: origin,
    url: req.url,
    form: form,
    data: data,
    json: json,
    files: files
  });
});

router.get('/:count', function (req, res) {
  const count = parseInt(req.params.count, 10);

  // Validate that count is a valid number to prevent infinite redirect loops
  if (isNaN(count)) {
    return res.status(404).json({ error: 'Invalid redirect count. Must be a number.' });
  }

  if (count > 1) {
    // Redirect to the next redirect in the chain
    const nextCount = count - 1;
    res.status(302).set('Location', `/api/redirect/${nextCount}`).send(`<!doctype html>
          <title>Redirecting...</title>
          <h1>Redirecting...</h1>
          <p>You should be redirected automatically to target URL: <a href="${nextCount}">${nextCount}</a>.  If not click the link.</p>
    `);
  } else {
    res.status(302)
      .set('Location', '/api/redirect/anything')
      .send(`<!doctype html>
          <title>Redirecting...</title>
          <h1>Redirecting...</h1>
          <p>You should be redirected automatically to target URL: <a href="../anything">../anything</a>.  If not click the link.</p>
    `);
  }
});

module.exports = router;
