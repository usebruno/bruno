const sanitizeGrpcHeaderValue = (key, value) => {
  if (key.endsWith('-bin')) {
    return Buffer.from(value, 'base64');
  }
  return value;
};

module.exports = {
  sanitizeGrpcHeaderValue
};
