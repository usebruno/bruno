const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const formDataParser = require('./multipart/form-data-parser');
const authRouter = require('./auth');
const echoRouter = require('./echo');
const xmlParser = require('./utils/xmlParser');
const multipartRouter = require('./multipart');
const app = new express();
const httpPort = process.env.HTTP_PORT || 8081;

let requestCounter = 0;
app.use((req, res, next) => {
  const requestId = ++requestCounter;
  console.log(`Request  [${requestId}]: ${req.method} ${req.originalUrl}`);
  res.on('finish', () => {
    console.log(`Response [${requestId}]: ${res.statusCode}`);
  });
  next();
});

app.use(cors());

const saveRawBody = (req, res, buf) => {
  req.rawBuffer = Buffer.from(buf);
  req.rawBody = buf.toString();
};

app.use(bodyParser.json({ verify: saveRawBody }));
app.use(bodyParser.urlencoded({ extended: true, verify: saveRawBody }));
app.use(bodyParser.text({ verify: saveRawBody }));
app.use(express.raw({ type: '*/*', limit: '100mb', verify: saveRawBody }));
app.use(xmlParser());

formDataParser.init(app, express);

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

app.listen(httpPort, function () {
  console.log(`Testbench started on port: ${httpPort}(HTTP)`);
});

if (process.env.NODE_ENV === 'development') {
  const https = require('https');
  const fs = require('fs');
  const path = require('path');
  const httpsPort = process.env.HTTPS_PORT || 8082;
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, '../ssl/localhost.key')),
    cert: fs.readFileSync(path.join(__dirname, '../ssl/localhost.crt'))
  };
  https.createServer(sslOptions, app).listen(httpsPort, function () {
    console.log(`Testbench started on port: ${httpsPort}(HTTPS)`);
  });
}
