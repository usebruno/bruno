const express = require('express');
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const cors = require('cors');
const formDataParser = require('./multipart/form-data-parser');

const app = new express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(xmlparser());
app.use(bodyParser.text());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
formDataParser.init(app, express);

const authRouter = require('./auth');
const echoRouter = require('./echo');
const multipartRouter = require('./multipart');

app.use('/api/auth', authRouter);
app.use('/api/echo', echoRouter);
app.use('/api/multipart', multipartRouter);

app.get('/ping', function (req, res) {
  return res.send('pong');
});

app.get('/headers', function (req, res) {
  return res.json(req.headers);
});

app.get('/query', function (req, res) {
  return res.json(req.query);
});

app.get('/redirect-to-ping', function (req, res) {
  return res.redirect('/ping');
});

app.listen(port, function () {
  console.log(`Testbench started on port: ${port}`);
});
