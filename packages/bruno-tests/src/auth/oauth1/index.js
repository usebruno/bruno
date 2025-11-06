const express = require('express');
const router = express.Router();

const twoLegged = require('./twoLegged');
const threeLegged = require('./threeLegged');

// Mount OAuth 1.0 routes
router.use('/two_legged', twoLegged);
router.use('/three_legged', threeLegged);

module.exports = router;
