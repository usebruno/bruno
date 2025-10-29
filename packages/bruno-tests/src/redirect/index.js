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

// Cross-domain redirect simulation (for security testing)
// NOTE: In real tests, this would redirect to a different domain
// For now, we simulate by redirecting to a different path to test the security logic
router.get('/redirect-cross-domain-with-auth', function (req, res) {
  console.log('Cross-domain redirect source - Headers:', req.headers);
  // In a real scenario, this would redirect to https://different-domain.com
  // For testing, we redirect to a local endpoint and verify headers were stripped
  res.status(307).location('https://httpbin.org/get').send('Redirecting to external domain');
});

// Same-domain redirect (for security testing)
router.get('/redirect-same-domain-with-auth', function (req, res) {
  console.log('Same-domain redirect source - Headers:', req.headers);
  // Redirect to same domain/port - headers should be preserved
  res.status(307).location('/api/redirect/same-domain-target').send('Redirecting to same domain');
});

router.get('/same-domain-target', function (req, res) {
  console.log('Same-domain redirect target - Headers:', req.headers);
  res.json({
    status: 'success',
    message: 'Reached same-domain target',
    hasAuthHeader: !!req.headers.authorization,
    authHeader: req.headers.authorization || null,
    headers: req.headers
  });
});

// 307 redirect that preserves method and body (cross-domain)
router.post('/redirect-307-cross-domain', function (req, res) {
  console.log('307 cross-domain redirect source - Method:', req.method, 'Headers:', req.headers);
  // Redirect to external domain - should strip Authorization but preserve POST method
  res.status(307).location('https://httpbin.org/post').send('Redirecting POST to external domain');
});

module.exports = router; 