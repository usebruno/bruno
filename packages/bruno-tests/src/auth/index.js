const express = require('express');
const router = express.Router();

const authBearer = require('./bearer');
const authBasic = require('./basic');
const authCookie = require('./cookie');
const authOAuth2Ropc = require('./oauth2/ropc');
const authOAuth2AuthorizationCode = require('./oauth2/ac');
const authOAuth2Cc = require('./oauth2/cc');

router.use('/oauth2/ropc', authOAuth2Ropc);
router.use('/oauth2/ac', authOAuth2AuthorizationCode);
router.use('/oauth2/cc', authOAuth2Cc);
router.use('/bearer', authBearer);
router.use('/basic', authBasic);
router.use('/cookie', authCookie);

module.exports = router;
