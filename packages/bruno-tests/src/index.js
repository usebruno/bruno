const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const formDataParser = require('./multipart/form-data-parser');
const authRouter = require('./auth');
const echoRouter = require('./echo');
const xmlParser = require('./utils/xmlParser');
const multipartRouter = require('./multipart');
const redirectRouter = require('./redirect');
const mixRouter = require('./mix');
const wsRouter = require('./ws');

const app = new express();
const port = process.env.PORT || 8081;

app.use(cors());

const saveRawBody = (req, res, buf) => {
  req.rawBuffer = Buffer.from(buf);
  req.rawBody = buf.toString();
};

app.use(bodyParser.json({ verify: saveRawBody }));
app.use(bodyParser.urlencoded({ extended: true, verify: saveRawBody }));
app.use(bodyParser.text({ verify: saveRawBody }));
app.use(xmlParser());
// Only parse raw body for content types not already handled by other parsers
app.use(express.raw({
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    // Skip if already handled by json, urlencoded, text, or xml parsers
    if (contentType.includes('application/json')
      || contentType.includes('application/x-www-form-urlencoded')
      || contentType.includes('text/')
      || contentType.includes('application/xml')) {
      return false;
    }
    return true;
  },
  limit: '100mb',
  verify: saveRawBody
}));

formDataParser.init(app, express);

app.use('/api/auth', authRouter);
app.use('/api/echo', echoRouter);
app.use('/api/multipart', multipartRouter);
app.use('/api/redirect', redirectRouter);
app.use('/api/mix', mixRouter);

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

const server = require('http').createServer(app);

server.on('upgrade', wsRouter);

server.listen(port, function () {
  console.log(`Testbench started on port: ${port}`);
});
