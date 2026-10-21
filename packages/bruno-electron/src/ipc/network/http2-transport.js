const { preferencesUtil } = require('../../store/preferences');

const resolveRequestedHttpVersion = (request) => {
  const perRequest = request && request.settings && request.settings.httpVersion;
  if (perRequest && perRequest !== 'inherit') {
    return perRequest;
  }
  return preferencesUtil.getHttpVersion();
};

module.exports = { resolveRequestedHttpVersion };
