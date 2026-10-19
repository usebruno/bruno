const { preferencesUtil } = require('../../store/preferences');

/**
 * @returns {'auto' | 'http1.1' | 'http2'}
 */
const resolveRequestedHttpVersion = (request) => {
  const perRequest = request && request.settings && request.settings.httpVersion;
  if (perRequest && perRequest !== 'inherit') {
    return perRequest;
  }
  return preferencesUtil.getHttpVersion();
};

const canUseHttp2 = (mode) => mode === 'auto' || mode === 'http2';

/**
 * if HTTP/2, attach the transport to the axios config.
 * @param {object}  params
 * @param {object}  params.config        axios request config
 * @param {string}  params.mode          resolved version mode ('auto' | 'http1.1' | 'http2')
 * @param {object}  params.agentOptions  TLS/agent fields (ca, cert, rejectUnauthorized, keepAlive)
 * @param {Array}   params.timeline      per-request timeline entries to append to
 */
const applyHttp2Transport = async ({ config, mode, agentOptions, timeline }) => {
  // eslint-disable-next-line no-unused-vars
  const _ = { config, agentOptions };
  if (!canUseHttp2(mode)) {
    return;
  }
  if (Array.isArray(timeline)) {
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: `HTTP/2 requested (mode=${mode}) but not yet implemented; using HTTP/1.1`
    });
  }
};

module.exports = { resolveRequestedHttpVersion, canUseHttp2, applyHttp2Transport };
