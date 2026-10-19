const { preferencesUtil } = require('../../store/preferences');
const { resolveHttpVersion } = require('@usebruno/requests');

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
  const versionDecision = await resolveHttpVersion({
    url: config.url,
    mode: requestedHttpVersion,
    tlsOptions: agentOptions,
    lookup: config.lookup
  });

  if (Array.isArray(timeline)) {
    if (versionDecision.offered && versionDecision.offered.length > 0) {
      timeline.push({
        timestamp: new Date(),
        type: 'tls',
        message: `ALPN: offered ${versionDecision.offered.join(', ')} · server accepted ${versionDecision.alpn || 'none'}`
      });
    }
    timeline.push({
      timestamp: new Date(),
      type: 'info',
      message:
        versionDecision.httpVersion === 2
          ? `HTTP/2 negotiated (${versionDecision.reason}); transport attaches in a later step — using HTTP/1.1 for now`
          : `HTTP/1.1 selected (${versionDecision.reason})`
    });
  }
};

module.exports = { resolveRequestedHttpVersion, canUseHttp2, applyHttp2Transport };
