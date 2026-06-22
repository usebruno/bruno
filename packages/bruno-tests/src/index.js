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
const setupGraphQL = require('./graphql');
const sseRouter = require('./sse');
const fileBinaryRouter = require('./file-binary');

const app = new express();
const port = process.env.PORT || 8081;

app.use(cors());

// Mount before the global body parsers so file/binary uploads (including ones
// declared as application/json) arrive as raw bytes instead of being parsed —
// this is what lets us hash the body and verify the wire payload byte-exact.
app.use('/api/file-binary', fileBinaryRouter);

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
app.use('/api/sse', sseRouter);

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

// Echoes the request back in one flat shape
app.all('/api/echo/everything', (req, res) => {
  return res.json({
    method: req.method,
    url: req.originalUrl,
    query: req.query,
    headers: req.headers,
    body: req.rawBody
  });
});

// The global JSON parser rejects malformed bodies before the route above runs.
// Recover that case by echoing the raw bytes instead of surfacing a 400.
app.use((err, req, res, next) => {
  if (req.path === '/api/echo/everything') {
    return res.json({
      method: req.method,
      url: req.originalUrl,
      query: req.query,
      headers: req.headers,
      body: req.rawBody
    });
  }
  return next(err);
});

const server = require('http').createServer(app);

server.on('upgrade', wsRouter);

setupGraphQL(app).then(() => {
  server.listen(port, function () {
    console.log(`Testbench started on port: ${port}`);
  });
})
  .catch((error) => {
    console.error('Failed to initialize GraphQL', error);
    process.exit(1);
  });
