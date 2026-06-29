const qs = require('qs');
const { buildFormUrlEncodedPayload } = require('@usebruno/common').utils;

const isFormUrlEncodedContentType = (contentType) => {
  return (
    typeof contentType === 'string' &&
    contentType.toLowerCase().split(';')[0].trim() ===
      'application/x-www-form-urlencoded'
  );
};

const stringifyFormUrlEncodedBody = (contentType, data) => {
  if (!isFormUrlEncodedContentType(contentType)) {
    return data;
  }

  if (Array.isArray(data)) {
    return buildFormUrlEncodedPayload(data);
  }

  if (typeof data !== 'string') {
    return qs.stringify(data, { arrayFormat: 'repeat' });
  }

  return data;
};

module.exports = {
  isFormUrlEncodedContentType,
  stringifyFormUrlEncodedBody
};
