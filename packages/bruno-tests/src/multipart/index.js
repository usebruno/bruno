const express = require('express');
const router = express.Router();
const formDataParser = require('./form-data-parser');

router.post('/mixed-content-types', (req, res) => {
  const parts = formDataParser.parse(req);
  return res.json(parts);
});

module.exports = router;
