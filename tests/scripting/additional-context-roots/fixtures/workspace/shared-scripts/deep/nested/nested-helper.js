const { computeChecksum } = require('signature-utils');

// Builds a request identifier of the shape "<METHOD>_<slug>_<checksum>".
function buildRequestId(endpoint, method = 'GET') {
  const slug = endpoint.replace(/[^a-z0-9]/gi, '_');
  return `${method}_${slug}_${computeChecksum(`${method} ${endpoint}`)}`;
}

module.exports = { buildRequestId };
