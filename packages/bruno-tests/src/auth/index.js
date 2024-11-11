const express = require('express');
const router = express.Router();

const authBearer = require('./bearer');
const authBasic = require('./basic');
const authWsse = require('./wsse');
const authCookie = require('./cookie');
const authOAuth2PasswordCredentials = require('./oauth2/passwordCredentials');
const authOAuth2AuthorizationCode = require('./oauth2/authorizationCode');
const authOAuth2ClientCredentials = require('./oauth2/clientCredentials');

router.use('/oauth2/password_credentials', authOAuth2PasswordCredentials);
router.use('/oauth2/authorization_code', authOAuth2AuthorizationCode);
router.use('/oauth2/client_credentials', authOAuth2ClientCredentials);
router.use('/bearer', authBearer);
router.use('/basic', authBasic);
router.use('/wsse', authWsse);
router.use('/cookie', authCookie);

module.exports = router;
