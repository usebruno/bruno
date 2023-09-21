const express = require('express');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const cors = require('cors');
const config = require('config');
const multer = require('multer');

const app = new express();
const port = config.port;
const upload = multer();

app.use(cors());
app.use(xmlparser());
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/ping', function (req, res) {
  return res.send('pong');
});

app.get('/headers', function (req, res) {
  return res.json(req.headers);
});

app.get('/query', function (req, res) {
  return res.json(req.query);
});

app.get('/echo/json', function (req, res) {
  return res.json({ ping: 'pong' });
});

app.post('/echo/json', function (req, res) {
  return res.json(req.body);
});

app.post('/echo/text', function (req, res) {
  return res.send(req.body);
});

app.post('/echo/xml', function (req, res) {
  return res.send(req.body);
});

app.post('/echo/multipartForm', upload.none(), function (req, res) {
  return res.json(req.body);
});

app.listen(port, function () {
  console.log(`Testbench started on port: ${port}`);
});
