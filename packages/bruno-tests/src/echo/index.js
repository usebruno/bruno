const express = require('express');
const router = express.Router();

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
  console.log("/bin -> rawBody", rawBody);

  if (!rawBody || rawBody.length === 0) {
    return res.status(400).send('No data received');
  }

  // Echo the raw body back as the response
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

module.exports = router;
