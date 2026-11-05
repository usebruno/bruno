const { computeChecksum } = require('signature-utils');

// Builds a demo auth token of the shape "<apiKey>.<timestamp>.<checksum>".
function generateAuthToken({ apiKey, timestamp }) {
  return `${apiKey}.${timestamp}.${computeChecksum(`${apiKey}:${timestamp}`)}`;
}

// Renders an ISO date (YYYY-MM-DD) from a Date or ISO string.
function formatDate(input) {
  return new Date(input).toISOString().slice(0, 10);
}

module.exports = { generateAuthToken, formatDate };
