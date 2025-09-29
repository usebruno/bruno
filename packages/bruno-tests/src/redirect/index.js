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

module.exports = router; 