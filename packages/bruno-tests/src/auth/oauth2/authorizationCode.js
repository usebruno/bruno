const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const clients = [
  {
    client_id: 'client_id_1',
    client_secret: 'client_secret_1',
    redirect_uri: 'http://localhost:3001/callback'
  }
];

const authCodes = [];

const tokens = [];

function generateUniqueString() {
  return crypto.randomBytes(16).toString('hex');
}

router.get('/authorize', (req, res) => {
  const { response_type, client_id, redirect_uri } = req.query;
  if (response_type !== 'code') {
    return res.status(401).json({ error: 'Invalid Response type, expected "code"' });
  }

  const client = clients.find((c) => c.client_id === client_id);

  if (!client) {
    return res.status(401).json({ error: 'Invalid client' });
  }

  if (!redirect_uri) {
    return res.status(401).json({ error: 'Invalid redirect URI' });
  }

  const authorization_code = generateUniqueString();
  authCodes.push({
    authCode: authorization_code,
    client_id,
    redirect_uri
  });

  const redirectUrl = `${redirect_uri}?code=${authorization_code}`;

  const _res = `
    <html>
      <script>
        document.addEventListener("DOMContentLoaded", (event) => {
          const buttonElement = document.getElementById('authorize');
          buttonElement.addEventListener('click', e => {
            e.preventDefault();
            buttonElement.innerText = 'redirecting...';
            try {
              const url = new URL("${redirectUrl}");
              window.location.href = url;
            }
            catch(err) {
              buttonElement.innerText = 'Invalid Redirect URL';
              console.log('Invalid Redirect URL')
            }
          });
        });
      </script>
      <body>
        <button id='authorize'>Authorize</button>
      </body>
    </html>
  `;

  res.send(_res);
});

// Handle the authorization callback
router.get('/callback', (req, res) => {
  const { code } = req.query;

  // Check if the authCode is valid.
  const storedAuthCode = authCodes.find((t) => t.authCode === code);

  if (!storedAuthCode) {
    return res.status(401).json({ error: 'Invalid Authorization Code' });
  }

  return res.json({ message: 'Authorization successful', storedAuthCode });
});

router.post('/token', (req, res) => {
  let grant_type, code, redirect_uri, client_id, client_secret;
  if (req?.body?.grant_type) {
    grant_type = req?.body?.grant_type;
    code = req?.body?.code;
    redirect_uri = req?.body?.redirect_uri;
    client_id = req?.body?.client_id;
    client_secret = req?.body?.client_secret;
  }
  if (req?.headers?.grant_type) {
    grant_type = req?.headers?.grant_type;
    code = req?.headers?.code;
    redirect_uri = req?.headers?.redirect_uri;
    client_id = req?.headers?.client_id;
    client_secret = req?.headers?.client_secret;
  }

  if (grant_type !== 'authorization_code') {
    return res.status(401).json({ error: 'Invalid Grant Type' });
  }

  // const client = clients.find((c) => c.client_id === client_id && c.client_secret === client_secret);
  // if (!client) {
  //   return res.status(401).json({ error: 'Invalid client credentials' });
  // }

  const storedAuthCode = authCodes.find((t) => t.authCode === code);

  if (!storedAuthCode) {
    return res.status(401).json({ error: 'Invalid Authorization Code' });
  }

  const accessToken = generateUniqueString();
  tokens.push({
    accessToken: accessToken,
    client_id
  });

  res.json({ access_token: accessToken });
});

router.post('/resource', (req, res) => {
  try {
    const { token } = req.query;
    const storedToken = tokens.find((t) => t.accessToken === token);
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid Access Token' });
    }
    return res.json({ resource: { name: 'foo', email: 'foo@bar.com' } });
  } catch (err) {
    return res.status(401).json({ error: 'Corrupt Access Token' });
  }
});

module.exports = router;
