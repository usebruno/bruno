'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('base64');
}

function validateWSSE(req, res, next) {
  const wsseHeader = req.headers['x-wsse'];
  if (!wsseHeader) {
    return unauthorized(res, 'WSSE header is missing');
  }

  const regex = /UsernameToken Username="(.+?)", PasswordDigest="(.+?)", (?:Nonce|nonce)="(.+?)", Created="(.+?)"/;
  const matches = wsseHeader.match(regex);

  if (!matches) {
    return unauthorized(res, 'Invalid WSSE header format');
  }

  const [_, username, passwordDigest, nonce, created] = matches;
  const expectedPassword = 'bruno'; // Ideally store in a config or env variable
  const expectedDigest = sha256(nonce + created + expectedPassword);

  if (passwordDigest !== expectedDigest) {
    return unauthorized(res, 'Invalid credentials');
  }

  next();
}

// Helper to respond with an unauthorized SOAP fault
function unauthorized(res, message) {
  const faultResponse = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice/">
      <soapenv:Header/>
      <soapenv:Body>
        <soapenv:Fault>
          <faultcode>soapenv:Client</faultcode>
          <faultstring>${message}</faultstring>
        </soapenv:Fault>
      </soapenv:Body>
    </soapenv:Envelope>
  `;
  res.status(401).set('Content-Type', 'text/xml');
  res.send(faultResponse);
}

const responses = {
  success: `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:web="http://webservice/">
      <soapenv:Header/>
      <soapenv:Body>
        <web:response>
          <web:result>Success</web:result>
        </web:response>
      </soapenv:Body>
    </soapenv:Envelope>
  `
};

router.post('/protected', validateWSSE, (req, res) => {
  res.set('Content-Type', 'text/xml');
  res.send(responses.success);
});

module.exports = router;
