const express = require('express');
const router = express.Router();

const authBearer = require('./bearer');
const authBasic = require('./basic');
const authCookie = require('./cookie');

router.use('/bearer', authBearer);
router.use('/basic', authBasic);
router.use('/cookie', authCookie);

module.exports = router;
