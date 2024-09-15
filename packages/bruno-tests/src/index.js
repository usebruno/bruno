const express = require('express');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const cors = require('cors');
const multer = require('multer');

const app = new express();
const port = process.env.PORT || 8080;
const upload = multer();

app.use(cors());
app.use(xmlparser());
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const authRouter = require('./auth');
const echoRouter = require('./echo');

app.use('/api/auth', authRouter);
app.use('/api/echo', echoRouter);

app.get('/ping', function (req, res) {
  return res.send('pong');
});

app.get('/headers', function (req, res) {
  return res.json(req.headers);
});

app.get('/query', function (req, res) {
  return res.json(req.query);
});

app.post('/echo/multipartForm', upload.none(), function (req, res) {
  return res.json(req.body);
});

app.get('/redirect-to-ping', function (req, res) {
  return res.redirect('/ping');
});

app.listen(port, function () {
  console.log(`Testbench started on port: ${port}`);
});
