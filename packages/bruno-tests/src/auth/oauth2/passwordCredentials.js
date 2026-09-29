const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const users = [
  {
    username: 'foo',
    password: 'bar'
  }
];

router.post('/token', (req, res) => {
  const { grant_type, username, password, scope } = req.body;

  console.log('password_credentials', username, password, scope);

  if (grant_type !== 'password') {
    return res.status(401).json({ error: 'Invalid Grant Type' });
  }

  const user = users.find((u) => u.username == username && u.password == password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid user credentials' });
  }
  var token = jwt.sign({ username, password }, 'bruno');
  return res.json({ message: 'Authorization successful', access_token: token });
});

router.post('/resource', (req, res) => {
  try {
    const tokenString = req.header('Authorization');
    const token = tokenString.split(' ')[1];
    var decodedJwt = jwt.verify(token, 'bruno');
    const { username, password } = decodedJwt;
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.json({ resource: { name: 'foo', email: 'foo@bar.com' } });
  } catch (err) {
    return res.status(401).json({ error: 'Corrupt token' });
  }
});

module.exports = router;
