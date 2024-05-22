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

module.exports = router;
