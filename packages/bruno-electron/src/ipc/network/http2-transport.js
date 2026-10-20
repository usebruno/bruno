const { preferencesUtil } = require('../../store/preferences');
const { resolveHttpVersionViaAlpn } = require('@usebruno/requests');
const { createHttp2Adapter } = require('./http2-adapter');

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
 * @param {object}  params.config
 * @param {string}  params.requestedHttpVersion
 * @param {object}  params.agentOptions
 * @param {Array}   params.timeline
 */
const applyHttp2Transport = async ({ config, requestedHttpVersion, agentOptions, timeline }) => {
  if (!canUseHttp2(requestedHttpVersion)) {
    return;
  }

  // get the HTTP version to use (1 or 2) and the reason for the decision.
  const httpVersionDecision = await resolveHttpVersionViaAlpn({
    url: config.url,
    mode: requestedHttpVersion,
    tlsOptions: agentOptions,
    lookup: config.lookup
  });

  if (Array.isArray(timeline) && httpVersionDecision.offered && httpVersionDecision.offered.length > 0) {
    timeline.push({
      timestamp: new Date(),
      type: 'tls',
      message: `ALPN: offered ${httpVersionDecision.offered.join(', ')} · server accepted ${httpVersionDecision.acceptedAlpnProtocol || 'none'}`
    });
  }

  if (httpVersionDecision.httpVersion === 2) {
    config.adapter = createHttp2Adapter({ tlsOptions: agentOptions });
    if (Array.isArray(timeline)) {
      timeline.push({
        timestamp: new Date(),
        type: 'info',
        message: `HTTP/2 negotiated (${httpVersionDecision.reason}); using HTTP/2 transport`
      });
    }
    return;
  }

  if (Array.isArray(timeline)) {
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message: `HTTP/1.1 selected (${httpVersionDecision.reason})`
    });
  }
};

module.exports = { resolveRequestedHttpVersion, canUseHttp2, applyHttp2Transport };
