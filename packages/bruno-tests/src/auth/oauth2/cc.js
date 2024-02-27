const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const clients = [
  {
    client_id: 'client_id_1',
    client_secret: 'client_secret_1'
  }
];

const tokens = [];

function generateUniqueString() {
  return crypto.randomBytes(16).toString('hex');
}

router.post('/token', (req, res) => {
  let grant_type, client_id, client_secret;
  if (req?.body?.grant_type) {
    grant_type = req?.body?.grant_type;
    client_id = req?.body?.client_id;
    client_secret = req?.body?.client_secret;
  } else if (req?.headers?.grant_type) {
    grant_type = req?.headers?.grant_type;
    client_id = req?.headers?.client_id;
    client_secret = req?.headers?.client_secret;
  }

  if (grant_type !== 'client_credentials') {
    return res.status(401).json({ error: 'Invalid Grant Type, expected "client_credentials"' });
  }

  const client = clients.find((c) => c.client_id == client_id && c.client_secret == client_secret);

  if (!client) {
    return res.status(401).json({ error: 'Invalid client' });
  }

  const token = generateUniqueString();
  tokens.push({
    token,
    client_id,
    client_secret
  });

  return res.json({ message: 'Authenticated successfully', access_token: token });
});

router.get('/resource', (req, res) => {
  try {
    const { token } = req.query;
    const storedToken = tokens.find((t) => t.token === token);
    if (!storedToken) {
      return res.status(401).json({ error: 'Invalid Access Token' });
    }
    return res.json({ resource: { name: 'foo', email: 'foo@bar.com' } });
  } catch (err) {
    return res.status(401).json({ error: 'Corrupt Access Token' });
  }
});

module.exports = router;
