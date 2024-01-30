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

module.exports = router;
